import { useState } from 'react';
import api, { errMsg } from '../../api.js';
import { useScope } from '../../context/ScopeContext.jsx';
import ProductImage from '../ProductImage.jsx';

// Envoi d'une image (fichier) ou saisie d'un lien ; renvoie l'URL via onChange
export default function ImageUploader({ value, onChange, label = 'Image', name = 'Aperçu' }) {
  const S = useScope();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const data = new FormData();
    data.append('image', file);
    setBusy(true);
    setError('');
    try {
      const r = await api.post(S.uploadPath, data);
      onChange(r.data.url);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="uploader">
      <span className="label-text">{label}</span>
      <div className="uploader-row">
        {value ? <ProductImage product={{ name }} src={value} className="thumb" /> : <div className="thumb empty-thumb">—</div>}
        <div className="uploader-fields">
          <input type="file" accept="image/*" onChange={upload} aria-label={`${label} (fichier)`} />
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="ou lien https://…" aria-label={`${label} (lien)`} />
          {busy && <span className="muted small">Envoi…</span>}
          {error && <span className="text-red small">{error}</span>}
        </div>
        {value && <button type="button" className="btn btn-small btn-danger" onClick={() => onChange('')}>Retirer</button>}
      </div>
    </div>
  );
}
