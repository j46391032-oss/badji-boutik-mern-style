import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';

// [lien, icône, libellé, pastille, exact, module requis]
const GROUPS = [
  ['Pilotage', [['/admin', '📊', 'Accueil', null, true]]],
  [
    'Catalogue',
    [
      ['/admin/produits', '📦', 'Produits', 'lowStock', false, 'produits'],
      ['/admin/planogramme', '🗂️', 'Planogramme', null, false, 'produits'],
      ['/admin/gondoles', '🏷️', 'Têtes de gondole', null, false, 'produits'],
      ['/admin/categories', '📚', 'Rayons', null, false, 'produits'],
      ['/admin/vendeurs', '🏪', 'Vendeurs', null, false, 'produits'],
      ['/admin/marches', '🏬', 'Marchés', null, false, 'boutiques'],
      ['/admin/boutiques', '🏪', 'Boutiques des vendeurs', 'pendingShops', false, 'boutiques'],
      ['/admin/bannieres', '🖼️', 'Bannières', null, false, 'produits'],
    ],
  ],
  [
    'Ventes',
    [
      ['/admin/commandes', '🧾', 'Commandes', 'pendingOrders', false, 'commandes'],
      ['/admin/devis', '💬', 'Devis et messages', 'openInquiries', false, 'devis'],
      ['/admin/promos', '🏷️', 'Codes promo', null, false, 'promos'],
      ['/admin/avis', '⭐', 'Avis clients', null, false, 'avis'],
    ],
  ],
  ['Clients', [['/admin/clients', '👥', 'Clients', null, false, 'clients']]],
  ['Configuration', [['/admin/parametres', '⚙️', 'Paramètres', null, false, 'parametres']]],
  // Sous-espace visible uniquement par l'administrateur du projet
  ['Administration du projet', [['/admin/equipe', '🛡️', 'Équipe et droits', null, false, 'owner'], ['/admin/journal', '📜', "Journal et sécurité", null, false, 'owner']]],
];

// Structure de l'espace administrateur : barre latérale, barre du haut, contenu
export default function AdminLayout() {
  const { user, logout, isOwner, can, refresh } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState({});

  // les droits ont pu changer depuis la dernière connexion
  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOpen(false);
    api.get('/stats/summary').then((r) => setSummary(r.data)).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const t = setInterval(() => api.get('/stats/summary').then((r) => setSummary(r.data)).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div dir="ltr" className={`adm ${open ? 'menu-open' : ''}`}>
      <aside className="adm-side" aria-label="Navigation de l'administration">
        <Link to="/admin" className="adm-brand">{settings.shopName || 'Boutik'} <span>Admin</span></Link>
        <nav>
          {GROUPS.map(([group, allLinks]) => {
            // chacun ne voit que les rubriques auxquelles il a droit
            const links = allLinks.filter(([, , , , , need]) => !need || (need === 'owner' ? isOwner : can(need)));
            if (links.length === 0) return null;
            return (
            <div key={group} className="adm-group">
              <span className="adm-group-title">{group}</span>
              {links.map(([to, icon, label, badge, end]) => (
                <NavLink key={to} to={to} end={Boolean(end)}>
                  <span aria-hidden="true">{icon}</span>
                  <span className="grow">{label}</span>
                  {badge && summary[badge] > 0 && <span className={`adm-badge ${badge === 'lowStock' ? 'warn' : ''}`} title={badge === 'lowStock' ? 'Produits en stock bas' : ''}>{summary[badge]}</span>}
                </NavLink>
              ))}
            </div>
            );
          })}
        </nav>
      </aside>
      {open && <div className="adm-backdrop" onClick={() => setOpen(false)} />}

      <div className="adm-main">
        <header className="adm-top">
          <button className="btn adm-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰</button>
          <span className="grow" />
          <Link to="/" className="btn btn-small">Voir la boutique ↗</Link>
          <span className="adm-user"><span className="avatar">{user.name[0]}</span>{user.name}<span className={`role-pill ${isOwner ? 'owner' : ''}`}>{isOwner ? 'Administrateur du projet' : 'Sous-administrateur'}</span></span>
          <button className="btn btn-small btn-ghost" onClick={() => { logout(); navigate('/'); }}>Déconnexion</button>
        </header>
        <main className="adm-content">
          {!user.twoFactorEnabled && <p className="alert alert-warn">🔐 Protégez votre compte : <Link to="/profil#securite">activez la double authentification</Link> (un code de votre téléphone en plus du mot de passe).</p>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
