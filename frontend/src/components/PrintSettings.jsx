// Simple, rule-of-thumb print recommendations per template. These are
// deliberately conservative starting points, not a slicer profile.
const RECOMMENDATIONS = {
  bracket: {
    material: "PETG (or ABS for outdoor/heat use)",
    infill: "30–40%",
    supports: "Usually not needed if printed with the bend flat on the bed",
    orientation: "Lay one plate flat on the bed; the other plate stands upright",
  },
  clip: {
    material: "PETG or Nylon (needs some flexibility + durability)",
    infill: "25–35%",
    supports: "Not needed",
    orientation: "Print with the channel opening facing up",
  },
  keychain: {
    material: "PLA",
    infill: "15–20%",
    supports: "Not needed",
    orientation: "Lay flat on the bed",
  },
  mount: {
    material: "PETG",
    infill: "30–40%",
    supports: "Only if it has large overhangs",
    orientation: "Lay flat on the bed, holes facing up",
  },
  spacer: {
    material: "PLA or PETG",
    infill: "40–100% (small parts print solid quickly)",
    supports: "Not needed",
    orientation: "Stand on end, hole facing up",
  },
  box: {
    material: "PLA",
    infill: "15–25%",
    supports: "Not needed",
    orientation: "Lay flat on the bed",
  },
  custom: {
    material: "PLA",
    infill: "20–30%",
    supports: "Depends on your final shape",
    orientation: "Lay flat on the bed",
  },
};

export default function PrintSettings({ template }) {
  const rec = RECOMMENDATIONS[template] || RECOMMENDATIONS.custom;
  return (
    <div className="card print-settings">
      <h2>Recommended print settings</h2>
      <dl>
        <dt>Material</dt>
        <dd>{rec.material}</dd>
        <dt>Infill</dt>
        <dd>{rec.infill}</dd>
        <dt>Supports</dt>
        <dd>{rec.supports}</dd>
        <dt>Orientation</dt>
        <dd>{rec.orientation}</dd>
      </dl>
    </div>
  );
}
