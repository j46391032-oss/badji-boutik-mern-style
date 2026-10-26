import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import { fcfa, formatDate } from '../../utils.js';

// Revenus, commission et reversements. Le client paie à la livraison : le vendeur encaisse, puis reverse la commission.
export default function SellerEarnings() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/seller/earnings').then((r) => setD(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  if (error) return <p className="alert alert-error">{error}</p>;
  if (!d) return <p className="muted">Chargement…</p>;
  const l = d.ledger;
  return (
    <>
      <div className="page-head"><div><h1>💰 Revenus et commission</h1><p className="muted">Commission de la plateforme : <strong>{d.commissionRate} %</strong> du montant des produits (après remise), sur les commandes livrées.</p></div></div>
      <div className="kpi-grid">
        <div className="panel kpi"><span className="kpi-label">Ventes livrées</span><strong className="kpi-value">{fcfa(l.sales)}</strong><span className="muted small">{l.deliveredOrders} commande(s), hors remboursées</span></div>
        <div className="panel kpi"><span className="kpi-label">Commission de la plateforme</span><strong className="kpi-value">{fcfa(l.commission)}</strong></div>
        <div className="panel kpi"><span className="kpi-label">Ce que vous gardez</span><strong className="kpi-value">{fcfa(l.net)}</strong><span className="muted small">+ frais de livraison encaissés : {fcfa(l.shipping)}</span></div>
        <div className="panel kpi"><span className="kpi-label">Déjà reversé</span><strong className="kpi-value">{fcfa(l.settled)}</strong></div>
        <div className="panel kpi kpi-main"><span className="kpi-label">Reste à reverser</span><strong className="kpi-value">{fcfa(l.due)}</strong>{l.credit > 0 && <span className="muted small">Trop-perçu : {fcfa(l.credit)}</span>}</div>
        <div className="panel kpi"><span className="kpi-label">Ventes en cours</span><strong className="kpi-value">{fcfa(l.pendingSales)}</strong><span className="muted small">commission prévue : {fcfa(l.pendingCommission)}</span></div>
      </div>
      <p className="alert alert-info">Comment ça marche : vos clients paient à la livraison (espèces, Wave, Orange Money) — c'est vous qui encaissez. Vous reversez ensuite la commission à la plateforme ; l'administrateur enregistre chaque reversement ci-dessous.</p>

      <section className="panel flush table-wrap">
        <h2 style={{ padding: '14px 16px 0' }}>Reversements enregistrés</h2>
        <table>
          <thead><tr><th>Date</th><th>Montant</th><th>Moyen</th><th>Note</th></tr></thead>
          <tbody>
            {d.settlements.length === 0 ? <tr><td colSpan="4" className="muted">Aucun reversement pour l'instant.</td></tr> : d.settlements.map((s) => (
              <tr key={s._id}><td>{formatDate(s.createdAt)}</td><td><strong>{fcfa(s.amount)}</strong></td><td>{s.method}</td><td className="muted">{s.note}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
