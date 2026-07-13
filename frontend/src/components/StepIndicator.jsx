export default function StepIndicator({ step, totalSteps }) {
  return (
    <div className="step-indicator">
      {Array.from({ length: totalSteps }, (_, i) => {
        const n = i + 1;
        let cls = "step-dot";
        if (n === step) cls += " active";
        if (n < step) cls += " done";
        return <div key={n} className={cls} />;
      })}
    </div>
  );
}
