import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Drawer from '../../components/admin/Drawer.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useDebounce } from '../../hooks.js';
import { fcfa, formatDate } from '../../utils.js';

export default function AdminCustomers() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const search = useDebounce(q);

  const load = () => api.get('/users', { params: { q: search, blocked: blockedOnly ? 1 : '', page, limit: 12 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, blockedOnly, page]);

  const open = (u) => api.get(`/users/${u._id}`).then((r) => setDetail({ ...r.data, spent: u.spent })).catch((e) => setError(errMsg(e)));

  const block = async (u, blocked) => {
    if (blocked && !window.confirm(`Suspendre le compte de ${u.name} ? Il ne pourra plus se connecter.`)) return;
    try {
      await api.put(`/users/${u._id}`, { blocked });
      setDetail((d) => d && { ...d, blocked });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <div className="page-head"><div><h1>Clients</h1><p className="muted">{data.total} compte{data.total > 1 ? 's' : ''} client</p></div></div>
      <div className="filter-bar">
        <input placeholder="Nom, email, téléphone…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Rechercher" />
        <label className="check"><input type="checkbox" checked={blockedOnly} onChange={(e) => { setBlockedOnly(e.target.checked); setPage(1); }} /> Comptes suspendus</label>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Client</th><th>Contact</th><th>Commandes</th><th>Total dépensé</th><th>Dernière commande</th><th>Statut</th></tr></thead>
          <tbody>
            {data.items.length === 0 ? <tr><td colSpan="6" className="muted">Aucun client.</td></tr> : data.items.map((u) => (
              <tr key={u._id} className="clickable" onClick={() => open(u)}>
                <td><span className="avatar sm">{u.name[0]}</span> <strong>{u.name}</strong><div className="muted small">Inscrit le {formatDate(u.createdAt)}</div></td>
                <td>{u.email}<div className="muted small">{u.phone}{u.city && ` · ${u.city}`}</div></td>
                <td>{u.orders}</td>
                <td><strong>{fcfa(u.spent)}</strong></td>
                <td>{u.lastOrder ? formatDate(u.lastOrder) : '—'}</td>
                <td>{u.blocked ? <span className="tag tag-red">Suspendu</span> : <span className="tag tag-green">Actif</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />

      {detail && (
        <Drawer
          title={detail.name}
          subtitle={detail.email}
          onClose={() => setDetail(null)}
          footer={detail.blocked ? <button className="btn btn-primary" onClick={() => block(detail, false)}>Réactiver le compte</button> : <button className="btn btn-danger" onClick={() => block(detail, true)}>Suspendre le compte</button>}
        >
          <p>{detail.phone || 'Pas de téléphone'}<br />{[detail.address, detail.city].filter(Boolean).join(', ') || 'Pas d\'adresse'}</p>
          <p>{detail.blocked ? <span className="tag tag-red">Compte suspendu</span> : <span className="tag tag-green">Compte actif</span>} · Total dépensé : <strong>{fcfa(detail.spent)}</strong></p>
          <h3>Dernières commandes</h3>
          {detail.orders.length === 0 ? <p className="muted">Aucune commande.</p> : (
            <ul className="drawer-items">
              {detail.orders.map((o) => (
                <li key={o._id}><span className="grow"><strong>#{o.orderNumber}</strong><br /><span className="muted small">{formatDate(o.createdAt)}</span></span><StatusBadge status={o.status} /><strong>{fcfa(o.totalAmount)}</strong></li>
              ))}
            </ul>
          )}
        </Drawer>
      )}
    </>
  );
}
