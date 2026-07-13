import { useState } from "react";
import StlViewer from "./StlViewer.jsx";
import { fetchStlFromPhoto } from "../utils/api.js";

export default function AiPhotoPreview({ photo, onBack }) {
  const [targetSize, setTargetSize] = useState(80);
  const [status, setStatus] = useState("idle"); // idle | generating | done | error
  const [error, setError] = useState(null);
  const [blob, setBlob] = useState(null);

  async function handleGenerate() {
    setStatus("generating");
    setError(null);
    try {
      const result = await fetchStlFromPhoto(photo, targetSize);
      setBlob(result);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function handleDownload() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "3dify-ai-photo.stl";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <h2>AI photo reconstruction (beta)</h2>
      <p className="hint">
        Uses the Tripo AI API to build a rough 3D mesh straight from your photo. Quality varies a
        lot by photo — plain background, even lighting, and the whole object visible work best.
        This is not a substitute for the measurement-based templates when you need a part that
        fits precisely.
      </p>

      <div className="field">
        <label htmlFor="targetSize">Approximate longest dimension (mm)</label>
        <input
          id="targetSize"
          type="number"
          min="5"
          value={targetSize}
          onChange={(e) => setTargetSize(parseFloat(e.target.value) || 80)}
        />
      </div>

      {status !== "done" && (
        <button className="btn btn-primary" onClick={handleGenerate} disabled={status === "generating"}>
          {status === "generating" ? "Generating… (can take ~1–2 min)" : "Generate 3D model from photo"}
        </button>
      )}

      {status === "error" && <div className="error-banner">{error}</div>}

      {status === "done" && blob && (
        <>
          <StlViewer blob={blob} />
          <button className="btn btn-primary" onClick={handleDownload}>
            Download STL
          </button>
          <p className="note">
            AI-reconstructed meshes often need cleanup before printing — check wall thickness and
            watertightness in your slicer, and expect to add supports.
          </p>
        </>
      )}

      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={onBack}>
        Back to templates
      </button>
    </div>
  );
}
