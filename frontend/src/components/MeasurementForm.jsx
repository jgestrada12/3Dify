import { TEMPLATE_FIELDS } from "../utils/modelBuilder.js";

export default function MeasurementForm({ template, measurements, onChange }) {
  const fields = TEMPLATE_FIELDS[template] || [];

  function handleFieldChange(key, value, isInt) {
    const parsed = isInt ? parseInt(value, 10) : parseFloat(value);
    onChange({ ...measurements, [key]: Number.isNaN(parsed) ? "" : parsed });
  }

  return (
    <div className="card">
      <h2>3. Enter measurements</h2>
      <p className="hint">All sizes are in millimeters.</p>
      {fields.map((f) => (
        <div className="field" key={f.key}>
          <label htmlFor={f.key}>{f.label}</label>
          <input
            id={f.key}
            type="number"
            inputMode="decimal"
            min="0"
            step={f.isInt ? 1 : 0.5}
            value={measurements[f.key] ?? f.default}
            onChange={(e) => handleFieldChange(f.key, e.target.value, f.isInt)}
          />
        </div>
      ))}
    </div>
  );
}
