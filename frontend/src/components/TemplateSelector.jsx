const TEMPLATES = [
  { id: "bracket", label: "Bracket" },
  { id: "clip", label: "Clip" },
  { id: "keychain", label: "Keychain" },
  { id: "mount", label: "Mount" },
  { id: "spacer", label: "Spacer" },
  { id: "box", label: "Simple box" },
  { id: "custom", label: "Custom flat shape" },
];

export default function TemplateSelector({ template, onSelect }) {
  return (
    <div className="card">
      <h2>2. Choose a shape</h2>
      <p className="hint">Pick the template closest to what you need to print.</p>
      <div className="template-grid">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`template-option${template === t.id ? " selected" : ""}`}
            onClick={() => onSelect(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
