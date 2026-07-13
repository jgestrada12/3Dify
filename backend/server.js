// server.js
//
// A tiny Express server with one real job: turn a template name +
// measurements into an STL file, using the exact same geometry code
// the frontend uses for the live preview (see src/modelBuilder.js).

import express from "express";
import cors from "cors";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { buildModel } from "./src/modelBuilder.js";
import { generateStlFromPhoto } from "./src/photoToModel.js";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // allow the Vite dev server (a different port) to call this API
app.use(express.json({ limit: "15mb" })); // photos as base64 are much bigger than the 100kb default

const VALID_TEMPLATES = ["bracket", "clip", "keychain", "mount", "spacer", "box", "custom"];

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate-stl", (req, res) => {
  try {
    const { template, measurements } = req.body || {};

    if (!VALID_TEMPLATES.includes(template)) {
      return res.status(400).json({ error: `Unknown template "${template}"` });
    }
    if (!measurements || typeof measurements !== "object") {
      return res.status(400).json({ error: "Missing measurements" });
    }

    const group = buildModel(template, measurements);

    const exporter = new STLExporter();
    // binary:true keeps the downloaded file small; STL viewers/slicers all support it.
    // STLExporter returns a DataView when binary:true.
    const result = exporter.parse(group, { binary: true });
    const buffer = Buffer.from(result.buffer, result.byteOffset, result.byteLength);

    res.setHeader("Content-Type", "model/stl");
    res.setHeader("Content-Disposition", `attachment; filename="3dify-${template}.stl"`);
    res.send(buffer);
  } catch (err) {
    console.error("Failed to generate STL:", err);
    res.status(500).json({ error: "Failed to generate STL file" });
  }
});

app.post("/api/photo-to-stl", async (req, res) => {
  try {
    const { imageDataUrl, targetSizeMm } = req.body || {};
    if (!imageDataUrl) {
      return res.status(400).json({ error: "Missing imageDataUrl" });
    }
    const stlBuffer = await generateStlFromPhoto({ imageDataUrl, targetSizeMm });
    res.setHeader("Content-Type", "model/stl");
    res.setHeader("Content-Disposition", `attachment; filename="3dify-ai-photo.stl"`);
    res.send(stlBuffer);
  } catch (err) {
    console.error("Photo-to-3D failed:", err);
    res.status(500).json({ error: err.message || "Failed to generate model from photo" });
  }
});

app.listen(PORT, () => {
  console.log(`3Dify backend running at http://localhost:${PORT}`);
});
