import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Modal from '../../components/Modal.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { useDebounce } from '../../hooks.js';

const KINDS = { promo: '🔥 Promotion', brand: '🤝 Marque partenaire', seasonal: '🎉 Produits de saison' };
const ZONES = { fresh: 'Périmètre frais', grocery: 'Allées centrales', general: 'Marchandises générales' };
const EMPTY = { title: '', subtitle: '', kind: 'promo', brand: '', color: '#08855c', products: [], zones: [], rayons: [], showOnStore: false, startsAt: '', endsAt: '', active: true, order: 0 };
const day = (d) => (d ? String(d).slice(0, 10) : '');
const state = (e) => {
  const now = Date.now();
  if (!e.active) return ['Désactivée', 'mini-orange'];
  if (e.startsAt && new Date(e.startsAt) > now) return ['Programmée', 'mini-blue'];
  if (e.endsAt && new Date(e.endsAt) < now) return ['Terminée', 'mini-orange'];
  return ['En cours', 'mini-green'];
};

// Têtes de gondole : les emplacements promotionnels en bout d'allée, programmables dans le temps
export default function AdminEndcaps() {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | tête de gondole
  const [form, setForm] = useState(EMPTY);
  const [picked, setPicked] = useState([]); // produits choisis (objets complets pour l'affichage)
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState('');
  const term = useDebounce(q);

  const load = () => api.get('/endcaps/all').then((r) => setList(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
    api.get('/categories').then((r) => setCats(r.data.filter((c) => c.zone))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!term || term.length < 2) { setResults([]); return; }
    api.get('/products', { params: { search: term, scope: 'official', page: 1, limit: 8 } }).then((r) => setResults(r.data.items || r.data)).catch(() => {});
  }, [term]);

  const openNew = () => { setForm(EMPTY); setPicked([]); setQ(''); setFormError(''); setEditing('new'); };
  const openEdit = (e) => {
    setForm({ title: e.title, subtitle: e.subtitle || '', kind: e.kind, brand: e.brand || '', color: e.color, products: e.products.map((p) => p._id), zones: e.zones || [], rayons: (e.rayons || []).map((r) => r._id), showOnStore: e.showOnStore, startsAt: day(e.startsAt), endsAt: day(e.endsAt), active: e.active, order: e.order });
    setPicked(e.products);
    setQ('');
    setFormError('');
    setEditing(e);
  };
  const toggle = (key, v) => setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const pick = (p) => {
    if (picked.length >= 8 || picked.some((x) => x._id === p._id)) return;
    setPicked([...picked, p]);
    setForm((f) => ({ ...f, products: [...f.products, p._id] }));
    setQ('');
  };
  const unpick = (id) => {
    setPicked(picked.filter((p) => p._id !== id));
    setForm((f) => ({ ...f, products: f.products.filter((x) => x !== id) }));
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const body = { ...form, startsAt: form.startsAt || null, endsAt: form.endsAt || null };
      if (editing === 'new') await api.post('/endcaps', body);
      else await api.put(`/endcaps/${editing._id}`, body);
      setMsg('Tête de gondole enregistrée.');
      setEditing(null);
      load();
    } catch (err) {
      setFormError(errMsg(err));
    }
  };
  const remove = async (e) => {
    if (!window.confirm(`Supprimer « ${e.title} » ?`)) return;
    await api.delete(`/endcaps/${e._id}`).then(() => { setMsg('Supprimée.'); load(); }).catch((err) => setError(errMsg(err)));
  };
  const toggleActive = (e) => api.put(`/endcaps/${e._id}`, { active: !e.active }).then(load).catch((err) => setError(errMsg(err)));

  return (
    <>
      <div className="page-head"><div><h1>🏷️ Têtes de gondole</h1><p className="muted">Le bout d'allée : l'emplacement le plus visible. Réservez-le aux promotions, aux marques partenaires ou aux produits de saison, avec des dates de début et de fin.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouvelle tête de gondole</button></div>
      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-ok">{msg}</p>}
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Tête de gondole</th><th>Type</th><th>Où</th><th>Période</th><th>État</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan="6" className="muted">Aucune tête de gondole.</td></tr> : list.map((e) => {
              const [label, tone] = state(e);
              return (
                <tr key={e._id}>
                  <td><span style={{ background: e.color, color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{e.title}</span><br /><span className="muted small">{e.products.length} produit(s)</span></td>
                  <td>{KINDS[e.kind]}{e.brand ? ` · ${e.brand}` : ''}</td>
                  <td className="small">{[...e.zones.map((z) => ZONES[z]), ...e.rayons.map((r) => `${r.icon || ''} ${r.name}`), e.showOnStore ? 'Plan et accueil' : ''].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="small">{day(e.startsAt) || '…'} → {day(e.endsAt) || '…'}</td>
                  <td><span className={`mini-tag ${tone}`}>{label}</span></td>
                  <td className="row-actions"><button className="btn btn-small" onClick={() => openEdit(e)}>Modifier</button><button className="btn btn-small btn-ghost" onClick={() => toggleActive(e)}>{e.active ? 'Désactiver' : 'Activer'}</button><button className="btn btn-small btn-danger" onClick={() => remove(e)}>Supprimer</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Nouvelle tête de gondole' : 'Modifier la tête de gondole'} onClose={() => setEditing(null)}>
          <form className="form" onSubmit={save}>
            <label>Titre<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength="80" /></label>
            <label>Sous-titre<input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} maxLength="160" /></label>
            <div className="row">
              <label>Type<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              {form.kind === 'brand' && <label>Marque partenaire<input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label>}
              <label>Couleur<input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
              <label>Ordre<input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} style={{ maxWidth: 80 }} /></label>
            </div>
            <fieldset className="perm-list">
              <legend>Produits en vitrine (8 maximum)</legend>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un produit de la boutique officielle…" aria-label="Chercher un produit" />
              {results.length > 0 && <ul className="pick-results">{results.map((p) => <li key={p._id}><button type="button" onClick={() => pick(p)}><ProductImage product={p} className="plano-img" /> {p.name}</button></li>)}</ul>}
              <div className="chip-line">{picked.map((p) => <span key={p._id} className="mini-tag mini-blue">{p.name} <button type="button" onClick={() => unpick(p._id)} aria-label="Retirer">✕</button></span>)}</div>
            </fieldset>
            <fieldset className="perm-list">
              <legend>Où l'afficher ? (en bout de…)</legend>
              {Object.entries(ZONES).map(([z, label]) => <label key={z} className="check"><input type="checkbox" checked={form.zones.includes(z)} onChange={() => toggle('zones', z)} /> Zone : {label}</label>)}
              <label className="check"><input type="checkbox" checked={form.showOnStore} onChange={() => setForm({ ...form, showOnStore: !form.showOnStore })} /> Plan du magasin et page d'accueil</label>
              <details><summary>Allées précises ({form.rayons.length})</summary>
                <div className="rayon-pick">{cats.map((c) => <label key={c._id} className="check"><input type="checkbox" checked={form.rayons.includes(c._id)} onChange={() => toggle('rayons', c._id)} /> {c.icon} {c.name}</label>)}</div>
              </details>
            </fieldset>
            <div className="row">
              <label>Du<input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
              <label>Au<input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={form.active} onChange={() => setForm({ ...form, active: !form.active })} /> Active</label>
            {formError && <p className="alert alert-error">{formError}</p>}
            <button className="btn btn-primary">Enregistrer</button>
          </form>
        </Modal>
      )}
    </>
  );
}
