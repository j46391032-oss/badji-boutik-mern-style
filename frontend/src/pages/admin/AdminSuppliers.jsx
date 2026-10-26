import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Drawer from '../../components/admin/Drawer.jsx';

const EMPTY = { name: '', verified: false, city: '', country: 'Sénégal', yearsActive: 1, rating: 5, responseHours: 4, onTimeRate: 95, repurchaseRate: 20, markets: '' };

export default function AdminSuppliers() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null); // null = fermé
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => api.get('/suppliers').then((r) => setList(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  useEffect(() => {
    load();
  }, []);

  const openNew = () => { setEditId(null); setForm(EMPTY); };
  const openEdit = (s) => { setEditId(s._id); setForm({ ...EMPTY, ...s, markets: (s.markets || []).join(', ') }); };
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name, verified: form.verified, city: form.city, country: form.country,
      yearsActive: Number(form.yearsActive), rating: Number(form.rating), responseHours: Number(form.responseHours),
      onTimeRate: Number(form.onTimeRate), repurchaseRate: Number(form.repurchaseRate), markets: form.markets,
    };
    try {
      if (editId) await api.put(`/suppliers/${editId}`, body);
      else await api.post('/suppliers', body);
      setForm(null);
      setMsg({ type: 'ok', text: 'Vendeur enregistré.' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Supprimer « ${s.name} » ? Ses produits resteront en ligne sans vendeur.`)) return;
    try {
      await api.delete(`/suppliers/${s._id}`);
      load();
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Vendeurs</h1><p className="muted">Affichés sur les fiches produit (badge « Vérifié », réactivité, livraison).</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Ajouter un vendeur</button>
      </div>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Vendeur</th><th>Localisation</th><th>Note</th><th>Réponse</th><th>Livraison à l'heure</th><th>Réachat</th><th>Produits</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan="8" className="muted">Aucun vendeur.</td></tr> : list.map((s) => (
              <tr key={s._id}>
                <td><strong>{s.name}</strong> {s.verified && <span className="mini-tag mini-blue">✔ Vérifié</span>}<div className="muted small">{s.yearsActive} an(s)</div></td>
                <td>{[s.city, s.country].filter(Boolean).join(', ')}</td>
                <td>{s.rating}/5</td><td>≤ {s.responseHours} h</td><td>{s.onTimeRate} %</td><td>{s.repurchaseRate} %</td><td>{s.products}</td>
                <td className="actions"><button className="btn btn-small" onClick={() => openEdit(s)}>Modifier</button><button className="btn btn-small btn-danger" onClick={() => remove(s)}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Drawer title={editId ? 'Modifier le vendeur' : 'Nouveau vendeur'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <label>Nom<input name="name" value={form.name} onChange={change} required /></label>
            <label className="check"><input type="checkbox" name="verified" checked={form.verified} onChange={change} /> Vendeur vérifié</label>
            <div className="two-cols">
              <label>Ville<input name="city" value={form.city} onChange={change} /></label>
              <label>Pays<input name="country" value={form.country} onChange={change} /></label>
            </div>
            <div className="two-cols">
              <label>Ancienneté (années)<input type="number" min="0" name="yearsActive" value={form.yearsActive} onChange={change} /></label>
              <label>Note (0 à 5)<input type="number" min="0" max="5" step="0.1" name="rating" value={form.rating} onChange={change} /></label>
            </div>
            <div className="two-cols">
              <label>Temps de réponse (h)<input type="number" min="0" name="responseHours" value={form.responseHours} onChange={change} /></label>
              <label>Livraisons à l'heure (%)<input type="number" min="0" max="100" name="onTimeRate" value={form.onTimeRate} onChange={change} /></label>
            </div>
            <label>Taux de réachat (%)<input type="number" min="0" max="100" name="repurchaseRate" value={form.repurchaseRate} onChange={change} /></label>
            <label>Marchés principaux (séparés par des virgules)<input name="markets" value={form.markets} onChange={change} placeholder="Sénégal, Mali, Guinée" /></label>
            <button className="btn btn-primary">Enregistrer</button>
          </form>
        </Drawer>
      )}
    </>
  );
}
