import { useState } from "react";
import StepIndicator from "./components/StepIndicator.jsx";
import PhotoUpload from "./components/PhotoUpload.jsx";
import TemplateSelector from "./components/TemplateSelector.jsx";
import MeasurementForm from "./components/MeasurementForm.jsx";
import ModelPreview from "./components/ModelPreview.jsx";
import PrintSettings from "./components/PrintSettings.jsx";
import AiPhotoPreview from "./components/AiPhotoPreview.jsx";
import { TEMPLATE_FIELDS } from "./utils/modelBuilder.js";
import { fetchStlBlob } from "./utils/api.js";

const TOTAL_STEPS = 4;

function defaultMeasurementsFor(template) {
  const fields = TEMPLATE_FIELDS[template] || [];
  const m = {};
  fields.forEach((f) => (m[f.key] = f.default));
  return m;
}

export default function App() {
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState(null);
  const [aiMode, setAiMode] = useState(false);
  const [template, setTemplate] = useState("bracket");
  const [measurements, setMeasurements] = useState(defaultMeasurementsFor("bracket"));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  function handleSelectTemplate(id) {
    setTemplate(id);
    setMeasurements(defaultMeasurementsFor(id));
  }

  function goNext() {
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const blob = await fetchStlBlob(template, measurements);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `3dify-${template}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.message.includes("fetch") || err.message.includes("Failed")
          ? "Could not reach the 3Dify backend. Make sure it's running (see README) and try again."
          : err.message
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>3Dify</h1>
        <p>Turn a photo, sketch, or measurement into a 3D-printable model</p>
      </header>

      {aiMode ? (
        <main>
          <AiPhotoPreview photo={photo} onBack={() => setAiMode(false)} />
        </main>
      ) : (
        <>
          <StepIndicator step={step} totalSteps={TOTAL_STEPS} />

          <main>
            {error && <div className="error-banner">{error}</div>}

            {step === 1 && (
              <PhotoUpload photo={photo} onPhotoSelected={setPhoto} onTryAi={() => setAiMode(true)} />
            )}

            {step === 2 && <TemplateSelector template={template} onSelect={handleSelectTemplate} />}

            {step === 3 && (
              <MeasurementForm template={template} measurements={measurements} onChange={setMeasurements} />
            )}

            {step === 4 && (
              <>
                <div className="card">
                  <h2>4. Preview &amp; download</h2>
                  <p className="hint">Drag to rotate. This is exactly what will be exported to STL.</p>
                  <ModelPreview template={template} measurements={measurements} />
                  <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
                    {downloading ? "Generating STL…" : "Download STL"}
                  </button>
                </div>
                <PrintSettings template={template} />
              </>
            )}

            <div className="btn-row" style={{ marginTop: 4 }}>
              {step > 1 && (
                <button className="btn btn-secondary" onClick={goBack}>
                  Back
                </button>
              )}
              {step < TOTAL_STEPS && (
                <button className="btn btn-primary" onClick={goNext}>
                  Next
                </button>
              )}
            </div>
          </main>
        </>
      )}
    </>
  );
}
