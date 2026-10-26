import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import { fcfa, num } from '../../utils.js';

const Kpi = ({ icon, label, value, hint, to }) => {
  const body = (
    <>
      <span className="kpi-icon" aria-hidden="true">{icon}</span>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </>
  );
  return to ? <Link to={to} className="panel kpi">{body}</Link> : <div className="panel kpi">{body}</div>;
};

export default function SellerDashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/seller/stats').then((r) => setS(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  if (error) return <p className="alert alert-error">{error}</p>;
  if (!s) return <p className="muted">Chargement…</p>;
  const max = Math.max(...s.daily.map((d) => d.total), 1);
  const l = s.ledger;
  return (
    <>
      <div className="page-head"><div><h1>Bonjour 👋</h1><p className="muted">Voici l'activité de <strong>{s.shop.name}</strong> (commission de la plateforme : {s.shop.effectiveCommission} %).</p></div>
        {s.shop.status === 'approved' && <Link to="/vendeur/produits/nouveau" className="btn btn-primary">+ Ajouter un produit</Link>}</div>
      <div className="kpi-grid">
        <Kpi icon="🧾" label="Commandes à traiter" value={num(s.pendingOrders)} to="/vendeur/commandes" />
        <Kpi icon="💬" label="Messages non lus" value={num(s.openInquiries)} to="/vendeur/messages" />
        <Kpi icon="💰" label="Ventes livrées" value={fcfa(l.sales)} hint={`${num(l.deliveredOrders)} commande(s)`} to="/vendeur/revenus" />
        <Kpi icon="📌" label="Commission à reverser" value={fcfa(l.due)} hint="aux conditions de la plateforme" to="/vendeur/revenus" />
        <Kpi icon="📦" label="Produits" value={num(s.products)} hint={`${s.lowStock} en stock bas · ${s.outOfStock} épuisé(s)`} to="/vendeur/produits" />
        <Kpi icon="⏳" label="Ventes en cours" value={fcfa(l.pendingSales)} hint={`${num(l.pendingOrders)} commande(s) non livrée(s)`} />
      </div>

      <section className="panel">
        <h2>Ventes des 14 derniers jours</h2>
        <div className="bars" role="img" aria-label="Ventes par jour">
          {s.daily.map((d) => (
            <div key={d.date} className="bar-col" title={`${d.date} : ${fcfa(d.total)} (${d.orders} commande(s))`}>
              <div className="bar" style={{ height: `${Math.max((d.total / max) * 100, d.total ? 4 : 1)}%` }} />
              <span className="small muted">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Produits les plus vendus</h2>
        {s.top.length === 0 ? <p className="muted">Pas encore de vente.</p> : (
          <ol className="top-list">{s.top.map((p) => <li key={p._id}><span className="grow">{p.name}</span><strong>{num(p.quantity)} vendus</strong><span className="muted">{fcfa(p.revenue)}</span></li>)}</ol>
        )}
      </section>
    </>
  );
}
