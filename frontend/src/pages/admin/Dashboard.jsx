import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import KpiCard from '../../components/admin/KpiCard.jsx';
import SalesChart from '../../components/admin/SalesChart.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { fcfa, formatDate, num, STATUSES } from '../../utils.js';

const RANGES = [[7, '7 jours'], [30, '30 jours'], [90, '90 jours']];
const STATUS_COLOR = { 'En attente': '#f0ad4e', Confirmée: '#2a5db0', Expédiée: '#6b4fb3', Livrée: '#2e9e5b', Annulée: '#c0392b' };

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stats', { params: { days } }).then((r) => { setStats(r.data); setError(''); }).catch((e) => setError(errMsg(e)));
  }, [days]);

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!stats) return <p className="empty">Chargement…</p>;

  const p = stats.period;
  const statusTotal = STATUSES.reduce((s, k) => s + (stats.ordersByStatus[k] || 0), 0) || 1;
  const catMax = Math.max(...stats.salesByCategory.map((c) => c.revenue), 1);

  return (
    <>
      <div className="page-head">
        <div><h1>Tableau de bord</h1><p className="muted">Vue d'ensemble de votre boutique</p></div>
        <div className="seg" role="tablist" aria-label="Période">
          {RANGES.map(([d, l]) => <button key={d} role="tab" aria-selected={days === d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{l}</button>)}
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Chiffre d'affaires" icon="💰" value={p.revenue} prev={p.prev.revenue} format={fcfa} tone="kpi-main" />
        <KpiCard label="Commandes" icon="🧾" value={p.orders} prev={p.prev.orders} format={num} />
        <KpiCard label="Panier moyen" icon="🛒" value={p.avgBasket} prev={p.prev.avgBasket} format={fcfa} />
        <KpiCard label="Nouveaux clients" icon="🧑" value={p.newClients} prev={p.prev.newClients} format={num} />
      </div>

      <div className="quick-grid">
        <Link to="/admin/commandes" className="quick"><strong>{stats.ordersByStatus['En attente'] || 0}</strong><span>commandes à confirmer</span></Link>
        <Link to="/admin/devis" className="quick"><strong>{stats.openInquiries}</strong><span>demandes sans réponse</span></Link>
        <Link to="/admin/produits" className="quick warn"><strong>{stats.lowStockCount}</strong><span>produits en stock bas ({stats.outOfStock} épuisés)</span></Link>
        <Link to="/admin/clients" className="quick"><strong>{num(stats.clients)}</strong><span>clients · {num(stats.products)} produits · {num(stats.orders)} commandes</span></Link>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Ventes</h2><span className="muted small">{days} derniers jours</span></div>
        <SalesChart data={stats.salesByDay} />
      </section>

      <div className="cols-3">
        <section className="panel">
          <div className="panel-head"><h2>Meilleurs produits</h2></div>
          {stats.topProducts.length === 0 ? <p className="muted">Pas encore de ventes sur la période.</p> : (
            <ol className="top-products">
              {stats.topProducts.map((t) => (
                <li key={t._id}>
                  <ProductImage product={{ name: t.name }} src={t.image} className="thumb" />
                  <div className="grow">
                    <div className="top-label"><span>{t.name}</span><strong>{fcfa(t.revenue)}</strong></div>
                    <div className="bar"><span style={{ width: `${(t.revenue / stats.topProducts[0].revenue) * 100}%` }} /></div>
                    <span className="muted small">{t.quantity} vendu{t.quantity > 1 ? 's' : ''}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Ventes par catégorie</h2></div>
          {stats.salesByCategory.length === 0 ? <p className="muted">Aucune donnée.</p> : (
            <div className="hbars">
              {stats.salesByCategory.map((c) => (
                <div key={c.name}>
                  <div className="top-label"><span>{c.name}</span><strong>{fcfa(c.revenue)}</strong></div>
                  <div className="bar"><span style={{ width: `${(c.revenue / catMax) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Commandes par statut</h2></div>
          <div className="stack-bar" role="img" aria-label="Répartition des commandes par statut">
            {STATUSES.map((s) => (stats.ordersByStatus[s] ? <span key={s} style={{ width: `${(stats.ordersByStatus[s] / statusTotal) * 100}%`, background: STATUS_COLOR[s] }} title={`${s} : ${stats.ordersByStatus[s]}`} /> : null))}
          </div>
          <ul className="legend">
            {STATUSES.map((s) => (
              <li key={s}><span className="swatch" style={{ background: STATUS_COLOR[s] }} /><span className="grow">{s}</span><strong>{stats.ordersByStatus[s] || 0}</strong></li>
            ))}
          </ul>
        </section>
      </div>

      <div className="cols-2">
        <section className="panel">
          <div className="panel-head"><h2>Alertes de stock</h2><Link to="/admin/produits">Gérer</Link></div>
          {stats.lowStock.length === 0 ? <p className="muted">✔ Tous les produits sont bien approvisionnés.</p> : (
            <ul className="alerts">
              {stats.lowStock.map((l) => (
                <li key={l._id}>
                  <ProductImage product={l} className="thumb" />
                  <Link to={`/admin/produits/${l._id}`} className="grow">{l.name}</Link>
                  <span className={`tag ${l.stock === 0 ? 'tag-red' : 'tag-amber'}`}>{l.stock === 0 ? 'Épuisé' : `${l.stock} restant${l.stock > 1 ? 's' : ''}`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Dernières commandes</h2><Link to="/admin/commandes">Tout voir</Link></div>
          {stats.recentOrders.length === 0 ? <p className="muted">Aucune commande pour le moment.</p> : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td><strong>#{o.orderNumber}</strong></td>
                      <td>{o.user?.name || '—'}<div className="muted small">{formatDate(o.createdAt)}</div></td>
                      <td>{fcfa(o.totalAmount)}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
