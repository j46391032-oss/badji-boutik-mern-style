import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Drawer from '../../components/admin/Drawer.jsx';
import { fcfa, formatDate } from '../../utils.js';

const LABEL = { pending: 'En attente', approved: 'Validée', suspended: 'Suspendue' };
const TONE = { pending: 'mini-orange', approved: 'mini-blue', suspended: 'mini-red' };
const METHODS = ['Espèces', 'Wave', 'Orange Money', 'Virement', 'Autre'];

// Boutiques ouvertes par des vendeurs : validation, suspension, commission et reversements
export default function AdminShops() {
  const [shops, setShops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(null); // boutique dont on gère les reversements
  const [detail, setDetail] = useState({ ledger: null, settlements: [] });
  const [pay, setPay] = useState({ amount: '', method: 'Espèces', note: '' });

  const load = () => api.get('/shops', { params: { status: status || undefined } }).then((r) => setShops(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    api.get('/markets', { params: { all: 1 } }).then((r) => setMarkets(r.data)).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const act = async (fn, ok) => {
    setError('');
    try {
      await fn();
      if (ok) setMsg(ok);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };
  const setShopStatus = (s, next) => {
    if (next === 'suspended' && !window.confirm(`Suspendre « ${s.name} » ? Ses produits seront masqués.`)) return;
    act(() => api.put(`/shops/${s._id}/status`, { status: next }), next === 'approved' ? 'Boutique validée.' : next === 'suspended' ? 'Boutique suspendue.' : 'Statut mis à jour.');
  };
  const setRate = (s) => {
    const v = window.prompt(`Commission de « ${s.name} » en % (laisser vide : taux général, actuellement ${s.effectiveCommission} %)`, s.commissionRate ?? '');
    if (v === null) return;
    act(() => api.put(`/shops/${s._id}`, { commissionRate: v.trim() }), 'Commission mise à jour.');
  };

  const openLedger = async (s) => {
    setOpen(s);
    setPay({ amount: '', method: 'Espèces', note: '' });
    const { data } = await api.get(`/shops/${s._id}/ledger`);
    setDetail(data);
  };
  const addPay = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/shops/${open._id}/settlements`, pay);
      const fresh = await api.get(`/shops/${open._id}/ledger`);
      setDetail(fresh.data);
      setPay({ amount: '', method: 'Espèces', note: '' });
      setMsg('Reversement enregistré.');
      load();
      return data;
    } catch (err) {
      setError(errMsg(err));
    }
    return null;
  };
  const delPay = async (sid) => {
    if (!window.confirm('Supprimer ce reversement ?')) return;
    await api.delete(`/shops/${open._id}/settlements/${sid}`).catch((e) => setError(errMsg(e)));
    setDetail((await api.get(`/shops/${open._id}/ledger`)).data);
    load();
  };

  return (
    <>
      <div className="page-head"><div><h1>🏬 Boutiques des vendeurs</h1><p className="muted">Validez les nouvelles boutiques, réglez les commissions et suivez les reversements.</p></div></div>
      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-ok">{msg}</p>}
      <div className="filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
          <option value="">Toutes</option>
          {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Boutique</th><th>Marché</th><th>Propriétaire</th><th>Statut</th><th>Produits</th><th>Commission</th><th>Ventes livrées</th><th>Reste dû</th><th></th></tr></thead>
          <tbody>
            {shops.length === 0 ? <tr><td colSpan="9" className="muted">Aucune boutique.</td></tr> : shops.map((s) => (
              <tr key={s._id}>
                <td><strong>{s.name}</strong>{s.verified && ' ✔'}<br /><span className="muted small">{s.city} · créée le {formatDate(s.createdAt)}</span></td>
                <td><select value={s.market?._id || ''} onChange={(e) => act(() => api.put(`/shops/${s._id}`, { market: e.target.value }), 'Boutique déplacée.')} aria-label="Marché">{markets.map((m) => <option key={m._id} value={m._id}>{m.icon} {m.name}</option>)}</select></td>
                <td>{s.owner?.name}<br /><span className="muted small">{s.owner?.email}</span></td>
                <td><span className={`mini-tag ${TONE[s.status]}`}>{LABEL[s.status]}</span></td>
                <td>{s.products}</td>
                <td><button className="btn btn-small btn-ghost" onClick={() => setRate(s)}>{s.effectiveCommission} %{s.commissionRate !== null && s.commissionRate !== undefined ? ' ✎' : ''}</button></td>
                <td>{fcfa(s.ledger.sales)}</td>
                <td><strong>{fcfa(s.ledger.due)}</strong></td>
                <td className="row-actions">
                  {s.status !== 'approved' && <button className="btn btn-small btn-primary" onClick={() => setShopStatus(s, 'approved')}>Valider</button>}
                  {s.status === 'approved' && <button className="btn btn-small btn-danger" onClick={() => setShopStatus(s, 'suspended')}>Suspendre</button>}
                  <button className="btn btn-small" onClick={() => api.put(`/shops/${s._id}`, { verified: !s.verified }).then(load).catch((e) => setError(errMsg(e)))}>{s.verified ? 'Retirer ✔' : 'Vérifier ✔'}</button>
                  <button className="btn btn-small" onClick={() => openLedger(s)}>Reversements</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Drawer title={`Reversements — ${open.name}`} subtitle="Commissions reçues du vendeur" onClose={() => setOpen(null)}>
          {detail.ledger && (
            <ul className="ledger-list">
              <li><span>Ventes livrées</span><strong>{fcfa(detail.ledger.sales)}</strong></li>
              <li><span>Commission due</span><strong>{fcfa(detail.ledger.commission)}</strong></li>
              <li><span>Déjà reversé</span><strong>{fcfa(detail.ledger.settled)}</strong></li>
              <li className="total"><span>Reste à recevoir</span><strong>{fcfa(detail.ledger.due)}</strong></li>
            </ul>
          )}
          <form className="form" onSubmit={addPay}>
            <h3>Enregistrer un reversement</h3>
            <label>Montant (FCFA)<input type="number" min="1" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} required /></label>
            <label>Moyen<select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label>Note<input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} maxLength="300" /></label>
            <button className="btn btn-primary">Enregistrer</button>
          </form>
          <h3>Historique</h3>
          {detail.settlements.length === 0 ? <p className="muted">Aucun reversement.</p> : (
            <ul className="ledger-list">
              {detail.settlements.map((x) => (
                <li key={x._id}><span>{formatDate(x.createdAt)} · {x.method}{x.note ? ` · ${x.note}` : ''}</span><strong>{fcfa(x.amount)}</strong><button className="btn btn-small btn-ghost" onClick={() => delPay(x._id)} aria-label="Supprimer">✕</button></li>
              ))}
            </ul>
          )}
        </Drawer>
      )}
    </>
  );
}
