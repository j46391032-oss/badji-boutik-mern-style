import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import { formatDate } from '../../utils.js';

const ZONE = { fresh: '🥬 Périmètre frais', grocery: '🛒 Allées centrales', general: '🛍️ Marchandises générales', '': 'Hors plan' };

// Bon de préparation : les articles dans l'ordre du magasin, pour préparer la commande d'une seule traite
export default function PickList() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get(`/orders/${id}/picklist`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);
  if (error) return <p className="alert alert-error">{error}</p>;
  if (!data) return <p className="muted">Chargement…</p>;
  const { order, lines } = data;
  let lastZone = null;
  return (
    <div className="picklist">
      <div className="page-head no-print"><div><h1>📋 Bon de préparation n° {order.orderNumber}</h1><p className="muted">Parcours : périmètre frais → allées centrales → marchandises générales.</p></div>
        <div className="row"><Link className="btn" to="/admin/commandes">← Commandes</Link><button className="btn btn-primary" onClick={() => window.print()}>Imprimer</button></div></div>
      <p><strong>{order.customer}</strong> · {order.shippingAddress?.address}, {order.shippingAddress?.city} · {order.shippingAddress?.phone} · {formatDate(order.createdAt)}</p>
      <table className="plano-table">
        <thead><tr><th>☐</th><th>Emplacement</th><th>Rayon · travée</th><th>Produit</th><th>Qté</th></tr></thead>
        <tbody>
          {lines.map((l, i) => {
            const head = l.zone !== lastZone ? <tr key={`z${i}`} className="zone-row"><td colSpan="5">{ZONE[l.zone]}</td></tr> : null;
            lastZone = l.zone;
            return [
              head,
              <tr key={i}><td>☐</td><td><strong>{l.code}</strong></td><td>{l.icon} {l.rayon}{l.bay ? ` · ${l.bay}` : ''}</td><td>{l.name}{l.variant && <span className="muted small"> — {l.variant}</span>}</td><td><strong>× {l.quantity}</strong></td></tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
