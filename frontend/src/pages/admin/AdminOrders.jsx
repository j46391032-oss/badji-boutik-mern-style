import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import Drawer from '../../components/admin/Drawer.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import OrderTimeline from '../../components/OrderTimeline.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { useDebounce } from '../../hooks.js';
import { fcfa, formatDate, STATUSES, RETURN_STATUSES } from '../../utils.js';
import { useScope } from '../../context/ScopeContext.jsx';

const ACTIONS = [
  { label: 'Confirmer', status: 'Confirmée', from: ['En attente'] },
  { label: 'Expédier', status: 'Expédiée', from: ['Confirmée'] },
  { label: 'Marquer livrée', status: 'Livrée', from: ['Expédiée'] },
  { label: 'Annuler', status: 'Annulée', from: ['En attente', 'Confirmée', 'Expédiée'], danger: true },
];

export default function AdminOrders() {
  const S = useScope();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1, counts: {} });
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [returnsOnly, setReturnsOnly] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const search = useDebounce(q);

  const params = { status, q: search, from: range.from, to: range.to, returns: returnsOnly ? 1 : undefined };
  const load = () =>
    api
      .get(S.ordersList, { params: { ...params, page, limit: 10 } })
      .then((r) => { setData(r.data); setError(''); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, range.from, range.to, page, returnsOnly]);

  const reset = (fn) => (v) => { fn(v); setPage(1); };
  const totalAll = Object.values(data.counts).reduce((a, b) => a + b, 0);

  const openOrder = (o) => { setOpen(o); setNote(o.adminNote || ''); setReply(o.returnRequest?.adminReply || ''); };

  const answerReturn = async (next) => {
    try {
      const { data: updated } = await api.put(`/orders/${open._id}/return`, { status: next, adminReply: reply });
      setOpen({ ...open, returnRequest: updated.returnRequest });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const changeStatus = async (order, next) => {
    if (next === 'Annulée' && !window.confirm(`Annuler la commande #${order.orderNumber} ? Le stock sera remis en vente.`)) return;
    try {
      const { data: updated } = await api.put(`/orders/${order._id}`, { status: next });
      setOpen({ ...order, ...updated, user: order.user });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const saveNote = async () => {
    try {
      const { data: updated } = await api.put(`/orders/${open._id}`, { adminNote: note });
      setOpen({ ...open, adminNote: updated.adminNote });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const exportCsv = async () => {
    try {
      const r = await api.get(S.ordersExport, { params, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'commandes.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Commandes</h1><p className="muted">{data.total} commande{data.total > 1 ? 's' : ''}</p></div>
        <button className="btn" onClick={exportCsv}>⬇ Exporter en CSV</button>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" className={!status ? 'on' : ''} onClick={() => reset(setStatus)('')}>Toutes <span>{totalAll}</span></button>
        {STATUSES.map((s) => <button key={s} role="tab" className={status === s ? 'on' : ''} onClick={() => reset(setStatus)(s)}>{s} <span>{data.counts[s] || 0}</span></button>)}
      </div>

      <div className="filter-bar">
        <input placeholder="N° de commande, client, téléphone…" value={q} onChange={(e) => reset(setQ)(e.target.value)} aria-label="Rechercher" />
        <label className="check"><input type="checkbox" checked={returnsOnly} onChange={(e) => { setReturnsOnly(e.target.checked); setPage(1); }} /> Demandes de retour</label>
        <label className="inline">Du<input type="date" value={range.from} onChange={(e) => { setRange({ ...range, from: e.target.value }); setPage(1); }} /></label>
        <label className="inline">au<input type="date" value={range.to} onChange={(e) => { setRange({ ...range, to: e.target.value }); setPage(1); }} /></label>
      </div>
      {error && <p className="alert alert-error">{error}</p>}

      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Total</th><th>Paiement</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className="muted">Chargement…</td></tr> : data.items.length === 0 ? <tr><td colSpan="7" className="muted">Aucune commande.</td></tr> : data.items.map((o) => (
              <tr key={o._id} className="clickable" onClick={() => openOrder(o)}>
                <td><strong>#{o.orderNumber}</strong></td>
                <td>{formatDate(o.createdAt)}</td>
                <td>{o.shippingAddress.fullName}<div className="muted small">{o.shippingAddress.city} · {o.items.reduce((s, i) => s + i.quantity, 0)} article(s){o.returnRequest?.status && <span className="mini-tag mini-orange">Retour : {o.returnRequest.status}</span>}</div></td>
                <td><strong>{fcfa(o.totalAmount)}</strong></td>
                <td className="small">{o.paymentMethod || '—'}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="actions"><button className="btn btn-small" onClick={(e) => { e.stopPropagation(); openOrder(o); }}>Détail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />

      {open && (
        <Drawer
          title={`Commande #${open.orderNumber}`}
          subtitle={formatDate(open.createdAt)}
          onClose={() => setOpen(null)}
          footer={
            <div className="row no-margin">
              {ACTIONS.filter((a) => a.from.includes(open.status)).map((a) => (
                <button key={a.status} className={`btn ${a.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => changeStatus(open, a.status)}>{a.label}</button>
              ))}
              <Link className="btn" to={`/facture/${open._id}`}>Facture</Link>
              {!S.seller && <Link className="btn" to={`/admin/commandes/${open._id}/preparation`}>Bon de préparation</Link>}
            </div>
          }
        >
          <OrderTimeline order={open} />
          <h3>Client</h3>
          <p>
            <strong>{open.shippingAddress.fullName}</strong><br />
            <a href={`tel:${open.shippingAddress.phone}`}>{open.shippingAddress.phone}</a>{open.user?.email && <> · {open.user.email}</>}<br />
            {open.shippingAddress.address}, {open.shippingAddress.city}
          </p>
          <h3>Articles</h3>
          <ul className="drawer-items">
            {open.items.map((i) => (
              <li key={i.product + (i.variant || '')}>
                <ProductImage product={i} className="thumb" />
                <span className="grow">{i.name}{i.variant && <><br /><span className="small variant-line">{i.variant}</span></>}<br /><span className="muted small">{fcfa(i.price)} × {i.quantity}</span></span>
                <strong>{fcfa(i.price * i.quantity)}</strong>
              </li>
            ))}
          </ul>
          <div className="sum-row"><span>Sous-total</span><span>{fcfa(open.subtotal)}</span></div>
          {open.discount > 0 && <div className="sum-row text-green"><span>Remise ({open.couponCode})</span><span>− {fcfa(open.discount)}</span></div>}
          <div className="sum-row"><span>Livraison</span><span>{open.shippingFee > 0 ? fcfa(open.shippingFee) : 'Gratuite'}</span></div>
          <div className="total-row"><span>Total</span><strong>{fcfa(open.totalAmount)}</strong></div>
          <p className="small muted">Paiement : {open.paymentMethod || '—'}</p>
          {open.returnRequest?.status && (
            <>
              <h3>Demande de retour — {open.returnRequest.status}</h3>
              <p><strong>{open.returnRequest.reason}</strong>{open.returnRequest.details && <><br />{open.returnRequest.details}</>}<br /><span className="muted small">Demandée le {formatDate(open.returnRequest.requestedAt)}</span></p>
              <textarea rows="2" maxLength="1000" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Réponse au client (facultatif)" aria-label="Réponse au client" />
              <div className="row">
                {RETURN_STATUSES.filter((s) => s !== open.returnRequest.status && s !== 'Demandée').map((s) => (
                  <button key={s} className={`btn btn-small ${s === 'Refusée' ? 'btn-danger' : 'btn-primary'}`} onClick={() => answerReturn(s)}>{s === 'Acceptée' ? 'Accepter' : s === 'Refusée' ? 'Refuser' : 'Marquer remboursée'}</button>
                ))}
              </div>
            </>
          )}
          <h3>Note interne</h3>
          <textarea rows="3" maxLength="1000" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible uniquement par l'administration" aria-label="Note interne" />
          <button className="btn btn-small" onClick={saveNote} disabled={note === (open.adminNote || '')}>Enregistrer la note</button>
        </Drawer>
      )}
    </>
  );
}
