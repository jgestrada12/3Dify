// photoToModel.js
//
// Turns a photo into a printable STL using the Tripo AI API
// (https://platform.tripo3d.ai). This calls a real, paid third-party
// service — you need your own Tripo API key (see README: "AI photo
// reconstruction setup").
//
// Flow (Tripo's API is asynchronous):
//   1. Upload the photo               -> POST /v2/openapi/upload      -> file_token
//   2. Start a generation task        -> POST /v2/openapi/task        -> task_id
//   3. Poll until it finishes         -> GET  /v2/openapi/task/:id    -> model URL (.glb)
//   4. Download the .glb and convert it to .stl using the same
//      three.js tools (GLTFLoader + STLExporter) the rest of the
//      backend already uses.
//
// Tripo returns geometry in whatever scale it inferred from the photo,
// which is not reliable for a single image — so after loading the mesh
// we uniformly rescale it to a "longest dimension" you specify in mm.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

const TRIPO_API_BASE = "https://api.tripo3d.ai/v2/openapi";

function requireApiKey() {
  const key = process.env.TRIPO_API_KEY;
  if (!key) {
    throw new Error(
      "Missing TRIPO_API_KEY. Create backend/.env with TRIPO_API_KEY=your_key (see README)."
    );
  }
  return key;
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Photo must be a PNG or JPEG data URL");
  }
  const mime = match[1];
  const ext = mime === "image/png" ? "png" : "jpg";
  const buffer = Buffer.from(match[3], "base64");
  return { buffer, ext, mime };
}

async function uploadImage(buffer, ext, mime, apiKey) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime }), `photo.${ext}`);

  const res = await fetch(`${TRIPO_API_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code !== 0) {
    throw new Error(`Tripo upload failed: ${json.message || res.statusText}`);
  }
  // Tripo's docs/SDKs are inconsistent about the exact field name here —
  // check both.
  const token = json.data?.image_token || json.data?.file_token;
  if (!token) throw new Error("Tripo upload did not return a file token");
  return token;
}

async function createTask(fileToken, ext, apiKey) {
  const res = await fetch(`${TRIPO_API_BASE}/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      type: "image_to_model",
      file: { type: ext, file_token: fileToken },
      // We only need geometry for a print, so skip texture/PBR generation —
      // it's cheaper and returns an untextured "base_model".
      texture: false,
      pbr: false,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code !== 0) {
    throw new Error(`Tripo task creation failed: ${json.message || res.statusText}`);
  }
  return json.data.task_id;
}

async function pollTask(taskId, apiKey, { timeoutMs = 120000, intervalMs = 2500 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.code !== 0) {
      throw new Error(`Tripo task status check failed: ${json.message || res.statusText}`);
    }
    const { status, output } = json.data;
    if (status === "success") {
      const modelUrl = output?.base_model || output?.model || output?.pbr_model;
      if (!modelUrl) throw new Error("Tripo task succeeded but returned no model URL");
      return modelUrl;
    }
    if (status === "failed" || status === "cancelled" || status === "banned") {
      throw new Error(`Tripo generation ${status}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for Tripo to generate the model (limit: 2 minutes)");
}

async function loadGlbAsGroup(glbUrl) {
  const res = await fetch(glbUrl);
  if (!res.ok) throw new Error("Failed to download the generated model from Tripo");
  const arrayBuffer = await res.arrayBuffer();

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, "", resolve, reject);
  });
  return gltf.scene;
}

// Uniformly scales + repositions the group so its longest bounding-box
// dimension equals targetSizeMm, and it sits on the print bed (z = 0).
function scaleToTarget(group, targetSizeMm) {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = targetSizeMm / maxDim;
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  group.position.x -= center.x;
  group.position.y -= center.y;
  group.position.z -= box2.min.z;
  group.updateMatrixWorld(true);
}

/**
 * Turns a photo (as a data URL) into a printable STL buffer via Tripo AI.
 * @param {{ imageDataUrl: string, targetSizeMm?: number }} params
 * @returns {Promise<Buffer>}
 */
export async function generateStlFromPhoto({ imageDataUrl, targetSizeMm = 80 }) {
  const apiKey = requireApiKey();
  const { buffer, ext, mime } = parseDataUrl(imageDataUrl);

  const fileToken = await uploadImage(buffer, ext, mime, apiKey);
  const taskId = await createTask(fileToken, ext, apiKey);
  const modelUrl = await pollTask(taskId, apiKey);
  const group = await loadGlbAsGroup(modelUrl);

  scaleToTarget(group, Math.max(Number(targetSizeMm) || 80, 5));

  const exporter = new STLExporter();
  const result = exporter.parse(group, { binary: true });
  return Buffer.from(result.buffer, result.byteOffset, result.byteLength);
}
