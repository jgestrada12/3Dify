export default function PhotoUpload({ photo, onPhotoSelected, onTryAi }) {
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPhotoSelected(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="card">
      <h2>1. Upload a reference photo</h2>
      <p className="hint">
        Used as your visual reference for the guided template flow below, or — if you'd rather
        try an automatic (paid, beta) reconstruction — hand off to the AI pipeline.
      </p>
      <label className="photo-upload">
        {photo ? (
          <img src={photo} alt="Uploaded reference" />
        ) : (
          <span>Tap to take or choose a photo</span>
        )}
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
      </label>
      {photo && (
        <button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onTryAi}>
          Try AI 3D reconstruction instead (beta) →
        </button>
      )}
    </div>
  );
}
