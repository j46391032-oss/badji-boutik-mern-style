import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import { fcfa, formatDate } from '../../utils.js';

const empty = { code: '', type: 'percent', value: '', minOrder: '', maxUses: '', expiresAt: '' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => api.get('/coupons').then((r) => setCoupons(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/coupons', { ...form, value: Number(form.value), minOrder: Number(form.minOrder) || 0, maxUses: Number(form.maxUses) || 0, expiresAt: form.expiresAt || null });
      setForm(empty);
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const toggle = (c) => api.put(`/coupons/${c._id}`, { active: !c.active }).then(load).catch((e) => setError(errMsg(e)));
  const remove = (c) => window.confirm(`Supprimer le code ${c.code} ?`) && api.delete(`/coupons/${c._id}`).then(load).catch((e) => setError(errMsg(e)));

  return (
    <>
      <div className="page-head"><div><h1>Codes promo</h1><p className="muted">Créez des remises en pourcentage ou en montant fixe.</p></div></div>
      {error && <p className="alert alert-error">{error}</p>}
      <form className="panel form form-grid" onSubmit={create}>
        <h2>Nouveau code</h2>
        <label>Code<input name="code" value={form.code} onChange={change} placeholder="BIENVENUE10" required /></label>
        <label>Type
          <select name="type" value={form.type} onChange={change}>
            <option value="percent">Pourcentage (%)</option>
            <option value="fixed">Montant fixe (FCFA)</option>
          </select>
        </label>
        <label>Valeur<input name="value" type="number" min="1" max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={change} required /></label>
        <label>Commande minimum (FCFA)<input name="minOrder" type="number" min="0" value={form.minOrder} onChange={change} /></label>
        <label>Utilisations maximum (vide = illimité)<input name="maxUses" type="number" min="0" value={form.maxUses} onChange={change} /></label>
        <label>Expire le<input name="expiresAt" type="date" value={form.expiresAt} onChange={change} /></label>
        <div><button className="btn btn-primary">Créer le code</button></div>
      </form>

      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Remise</th><th>Minimum</th><th>Utilisations</th><th>Expiration</th><th>État</th><th></th></tr></thead>
          <tbody>
            {coupons.length === 0 ? <tr><td colSpan="7" className="muted">Aucun code promo.</td></tr> : coupons.map((c) => (
              <tr key={c._id}>
                <td><strong>{c.code}</strong></td>
                <td>{c.type === 'percent' ? `${c.value} %` : fcfa(c.value)}</td>
                <td>{c.minOrder ? fcfa(c.minOrder) : '—'}</td>
                <td>{c.usedCount} / {c.maxUses || '∞'}</td>
                <td>{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                <td><span className={`tag ${c.active ? 'tag-green' : ''}`}>{c.active ? 'Actif' : 'Désactivé'}</span></td>
                <td className="actions">
                  <button className="btn btn-small" onClick={() => toggle(c)}>{c.active ? 'Désactiver' : 'Activer'}</button>
                  <button className="btn btn-small btn-danger" onClick={() => remove(c)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
