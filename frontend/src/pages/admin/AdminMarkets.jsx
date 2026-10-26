import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Modal from '../../components/Modal.jsx';

const EMPTY = { name: '', description: '', icon: '🏬', color: '#08855c', order: 0, active: true, categories: [] };

// Les marchés du site : nom, couleur, catégories autorisées (comme les étals d'un vrai marché)
export default function AdminMarkets() {
  const [markets, setMarkets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | marché
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/markets', { params: { all: 1 } }).then((r) => setMarkets(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const openNew = () => { setForm({ ...EMPTY, order: markets.length + 1 }); setFormError(''); setEditing('new'); };
  const openEdit = (m) => { setForm({ name: m.name, description: m.description || '', icon: m.icon, color: m.color, order: m.order, active: m.active, categories: m.categories.map((c) => c._id) }); setFormError(''); setEditing(m); };
  const toggleCat = (id) => setForm((f) => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter((x) => x !== id) : [...f.categories, id] }));

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editing === 'new') await api.post('/markets', form);
      else await api.put(`/markets/${editing._id}`, form);
      setMsg('Marché enregistré.');
      setEditing(null);
      load();
    } catch (err) {
      setFormError(errMsg(err));
    }
  };
  const remove = async (m) => {
    if (!window.confirm(`Supprimer « ${m.name} » ?`)) return;
    await api.delete(`/markets/${m._id}`).then(() => { setMsg('Marché supprimé.'); load(); }).catch((e) => setError(errMsg(e)));
  };

  return (
    <>
      <div className="page-head"><div><h1>🏬 Marchés</h1><p className="muted">Les grands marchés où les vendeurs ouvrent leurs boutiques. Un vendeur ne peut vendre dans son marché que les catégories choisies ici.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouveau marché</button></div>
      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-ok">{msg}</p>}
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Marché</th><th>Catégories vendues</th><th>Boutiques</th><th>Produits</th><th>Visible</th><th></th></tr></thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m._id}>
                <td><span style={{ background: m.color, color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{m.icon} {m.name}</span><br /><span className="muted small">/marches/{m.slug}</span></td>
                <td><div className="chip-line">{m.categories.length ? m.categories.map((c) => <span key={c._id} className="mini-tag mini-blue">{c.name}</span>) : <span className="muted small">Toutes</span>}</div></td>
                <td>{m.shops}</td>
                <td>{m.products}</td>
                <td>{m.active ? 'Oui' : 'Non'}</td>
                <td className="row-actions"><button className="btn btn-small" onClick={() => openEdit(m)}>Modifier</button><button className="btn btn-small btn-danger" onClick={() => remove(m)}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing === 'new' ? 'Nouveau marché' : `Modifier ${editing.name}`} onClose={() => setEditing(null)}>
          <form className="form" onSubmit={save}>
            <label>Nom<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="row">
              <label>Icône (emoji)<input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength="4" /></label>
              <label>Couleur<input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
              <label>Ordre<input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Marché visible sur le site</label>
            <fieldset className="perm-list">
              <legend>Catégories vendues dans ce marché</legend>
              {categories.map((c) => <label key={c._id} className="check"><input type="checkbox" checked={form.categories.includes(c._id)} onChange={() => toggleCat(c._id)} /> {c.icon} {c.name}</label>)}
              <span className="muted small">Aucune case cochée : toutes les catégories sont acceptées.</span>
            </fieldset>
            {formError && <p className="alert alert-error">{formError}</p>}
            <button className="btn btn-primary">Enregistrer</button>
          </form>
        </Modal>
      )}
    </>
  );
}
