import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Pagination from '../../components/Pagination.jsx';

const MODULES = ['Produits', 'Catégories', 'Vendeurs', 'Bannières', 'Commandes', 'Devis et messages', 'Codes promo', 'Avis', 'Clients', 'Paramètres', 'Équipe'];
const fmt = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Journal d'activité : qui a fait quoi et quand (administrateur du projet uniquement)
function ActivityLog() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [team, setTeam] = useState([]);
  const [user, setUser] = useState('');
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/team').then((r) => setTeam(r.data.members)).catch(() => {});
  }, []);
  useEffect(() => {
    api.get('/team/log', { params: { user: user || undefined, module: module || undefined, page, limit: 20 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [user, module, page]);

  return (
    <>
      <div className="page-head"><div><h2>📜 Actions du personnel</h2><p className="muted">{data.total} action{data.total > 1 ? 's' : ''} enregistrée{data.total > 1 ? 's' : ''} · visible par vous seul</p></div></div>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="filter-bar">
        <select value={user} onChange={(e) => { setUser(e.target.value); setPage(1); }} aria-label="Membre">
          <option value="">Tous les membres</option>
          {team.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} aria-label="Rubrique">
          <option value="">Toutes les rubriques</option>
          {MODULES.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Membre</th><th>Action</th><th>Détail</th></tr></thead>
          <tbody>
            {data.items.length === 0 ? <tr><td colSpan="4" className="muted">Aucune action enregistrée.</td></tr> : data.items.map((l) => (
              <tr key={l._id}>
                <td className="nowrap">{fmt(l.createdAt)}</td>
                <td>{l.userName} {l.role === 'superadmin' && <span className="role-pill owner">Projet</span>}</td>
                <td><strong>{l.action}</strong></td>
                <td className="muted small">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />
    </>
  );
}

const EVENTS = {
  login: ['✅', 'Connexion', ''], login_failed: ['⚠️', 'Mot de passe incorrect', 'warn'], login_locked: ['⛔', 'Compte verrouillé 15 min', 'bad'],
  login_recovery_code: ['🆘', 'Connexion avec un code de secours', 'warn'], twofactor_failed: ['⚠️', 'Code 2FA incorrect', 'warn'], twofactor_locked: ['⛔', '2FA verrouillée', 'bad'],
  twofactor_enabled: ['🔐', 'Double authentification activée', ''], twofactor_disabled: ['🔓', 'Double authentification désactivée', 'warn'],
  password_changed: ['🔑', 'Mot de passe changé', ''], email_changed: ['✉️', 'Email changé', 'warn'], password_check_failed: ['⚠️', 'Mot de passe actuel incorrect', 'warn'],
  password_check_locked: ['⛔', 'Changement de profil verrouillé', 'bad'], password_reset_by_owner: ['🛠️', 'Mot de passe réinitialisé par l’administrateur', ''],
  logout_all: ['🚪', 'Déconnexion de tous les appareils', ''], oauth_login: ['🌐', 'Connexion Google / Facebook / GitHub', ''],
};

// Connexions, échecs, verrouillages, double authentification : de quoi repérer une attaque
function SecurityLog() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1, summary: { failed24h: 0, locked24h: 0, staffWithout2fa: [] } });
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/team/security', { params: { type: type || undefined, page, limit: 20 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [type, page]);
  const s = data.summary;
  return (
    <>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="kpi-grid">
        <div className="panel kpi"><span className="kpi-label">Échecs de connexion (24 h)</span><strong className="kpi-value">{s.failed24h}</strong></div>
        <div className="panel kpi"><span className="kpi-label">Verrouillages (24 h)</span><strong className="kpi-value">{s.locked24h}</strong></div>
        <div className="panel kpi"><span className="kpi-label">Personnel sans double authentification</span><strong className="kpi-value">{s.staffWithout2fa.length}</strong>{s.staffWithout2fa.length > 0 && <span className="muted small">{s.staffWithout2fa.map((u) => u.name).join(', ')}</span>}</div>
      </div>
      <div className="filter-bar">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Type">
          <option value="">Tous les évènements</option>
          {Object.entries(EVENTS).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}
        </select>
      </div>
      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Évènement</th><th>Compte</th><th>Adresse IP</th><th>Détail</th></tr></thead>
          <tbody>
            {data.items.length === 0 ? <tr><td colSpan="5" className="muted">Aucun évènement.</td></tr> : data.items.map((e) => {
              const [icon, label, tone] = EVENTS[e.type] || ['•', e.type, ''];
              return (
                <tr key={e._id}>
                  <td className="nowrap">{fmt(e.createdAt)}</td>
                  <td><span className={tone === 'bad' ? 'text-red' : ''}>{icon} <strong>{label}</strong></span></td>
                  <td>{e.user?.name || e.email || '—'}{e.user?.role === 'superadmin' && <span className="role-pill owner">Projet</span>}</td>
                  <td className="muted small">{e.ip}</td>
                  <td className="muted small">{e.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />
    </>
  );
}

// Deux onglets : actions du personnel et sécurité (visible par l'administrateur du projet uniquement)
export default function AdminLog() {
  const [tab, setTab] = useState('activity');
  return (
    <>
      <div className="page-head"><div><h1>📜 Journal et sécurité</h1></div></div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'on' : ''} onClick={() => setTab('activity')}>Actions du personnel</button>
        <button role="tab" aria-selected={tab === 'security'} className={tab === 'security' ? 'on' : ''} onClick={() => setTab('security')}>🛡️ Sécurité</button>
      </div>
      {tab === 'activity' ? <ActivityLog /> : <SecurityLog />}
    </>
  );
}
