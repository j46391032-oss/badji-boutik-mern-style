import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';

// Zones du plan du magasin (boutique officielle)
const ZONES = { '': 'Hors plan', fresh: 'Périmètre frais', grocery: 'Allées centrales', general: 'Marchandises générales' };

export default function AdminCategories() {
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: '', icon: '' });
  const [edit, setEdit] = useState(null); // { _id, name, icon }
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => api.get('/categories').then((r) => setCats(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  useEffect(() => {
    load();
  }, []);

  const run = async (fn, ok) => {
    try {
      await fn();
      setMsg({ type: 'ok', text: ok });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    }
  };

  const create = (e) => {
    e.preventDefault();
    run(() => api.post('/categories', form).then(() => setForm({ name: '', icon: '' })), 'Catégorie créée.');
  };
  const save = () => run(() => api.put(`/categories/${edit._id}`, { name: edit.name, icon: edit.icon, zone: edit.zone, aisle: edit.aisle, layout: edit.layout, bays: edit.bays.split(',').map((b) => b.trim()).filter(Boolean) }).then(() => setEdit(null)), 'Catégorie modifiée.');
  const remove = (c) => window.confirm(`Supprimer la catégorie « ${c.name} » ?`) && run(() => api.delete(`/categories/${c._id}`), 'Catégorie supprimée.');

  return (
    <>
      <div className="page-head"><div><h1>Rayons (catégories)</h1><p className="muted">Chaque rayon est placé dans une zone du magasin avec un numéro d'allée. Le plan de la boutique officielle et le menu s'en servent ; les travées servent au planogramme.</p></div></div>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}
      <form className="panel filter-bar" onSubmit={create}>
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Icône (emoji)" maxLength="4" aria-label="Icône" style={{ maxWidth: 140 }} />
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom de la catégorie" required aria-label="Nom" />
        <button className="btn btn-primary">Ajouter</button>
      </form>
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Icône</th><th>Nom</th><th>Zone</th><th>Allée</th><th>Affichage</th><th>Travées</th><th>Produits</th><th></th></tr></thead>
          <tbody>
            {cats.map((c) => (edit?._id === c._id ? (
              <tr key={c._id}>
                <td><input value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} maxLength="4" aria-label="Icône" style={{ maxWidth: 90 }} /></td>
                <td><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Nom" /></td>
                <td><select value={edit.zone} onChange={(e) => setEdit({ ...edit, zone: e.target.value })} aria-label="Zone">{Object.entries(ZONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                <td><input type="number" min="0" value={edit.aisle} onChange={(e) => setEdit({ ...edit, aisle: e.target.value })} aria-label="Allée" style={{ maxWidth: 70 }} /></td>
                <td><select value={edit.layout} onChange={(e) => setEdit({ ...edit, layout: e.target.value })} aria-label="Affichage"><option value="">Selon la zone</option><option value="grid">Grille</option><option value="free">Plan libre</option></select></td>
                <td><input value={edit.bays} onChange={(e) => setEdit({ ...edit, bays: e.target.value })} aria-label="Travées" placeholder="Travée 1, Travée 2…" /></td>
                <td>{c.count}</td>
                <td className="actions"><button className="btn btn-small btn-primary" onClick={save}>Enregistrer</button><button className="btn btn-small" onClick={() => setEdit(null)}>Annuler</button></td>
              </tr>
            ) : (
              <tr key={c._id}>
                <td style={{ fontSize: '1.4rem' }}>{c.icon || '📦'}</td>
                <td><strong>{c.name}</strong></td>
                <td>{ZONES[c.zone || '']}</td>
                <td>{c.aisle ? `${{ fresh: 'F', grocery: 'E', general: 'G' }[c.zone] || ''}${c.aisle}` : '—'}</td>
                <td>{c.zone ? (c.layout === 'free' ? 'Plan libre' : 'Grille') : '—'}</td>
                <td className="muted small">{(c.bays || []).join(' · ') || '—'}</td>
                <td>{c.count}</td>
                <td className="actions"><button className="btn btn-small" onClick={() => setEdit({ _id: c._id, name: c.name, icon: c.icon || '', zone: c.zone || '', aisle: c.aisle || 0, layout: c.layout === (c.zone === 'general' ? 'free' : 'grid') ? '' : c.layout, bays: (c.bays || []).join(', ') })}>Modifier</button><button className="btn btn-small btn-danger" onClick={() => remove(c)}>Supprimer</button></td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </>
  );
}
