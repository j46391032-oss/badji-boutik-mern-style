import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ScopeContext, SELLER_SCOPE } from '../../context/ScopeContext.jsx';

// [lien, icône, libellé, pastille, exact]
const LINKS = [
  ['/vendeur', '📊', 'Tableau de bord', null, true],
  ['/vendeur/produits', '📦', 'Mes produits', 'lowStock'],
  ['/vendeur/commandes', '🧾', 'Mes commandes', 'pendingOrders'],
  ['/vendeur/messages', '💬', 'Messages et devis', 'openInquiries'],
  ['/vendeur/revenus', '💰', 'Revenus et commission'],
  ['/vendeur/boutique', '🏪', 'Ma boutique'],
];

// Espace vendeur : mêmes écrans que l'administration, limités à la boutique du vendeur
export default function SellerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setOpen(false);
    api.get('/seller/stats').then((r) => setStats(r.data)).catch(() => {});
  }, [pathname]);

  const shop = stats?.shop;
  return (
    <ScopeContext.Provider value={SELLER_SCOPE}>
      <div dir="ltr" className={`adm ${open ? 'menu-open' : ''}`}>
        <aside className="adm-side" aria-label="Navigation de l'espace vendeur">
          <Link to="/vendeur" className="adm-brand">{shop?.name || 'Ma boutique'} <span>Vendeur</span></Link>
          <nav>
            <div className="adm-group">
              <span className="adm-group-title">Ma boutique</span>
              {LINKS.map(([to, icon, label, badge, end]) => (
                <NavLink key={to} to={to} end={Boolean(end)}>
                  <span aria-hidden="true">{icon}</span>
                  <span className="grow">{label}</span>
                  {badge && stats?.[badge] > 0 && <span className={`adm-badge ${badge === 'lowStock' ? 'warn' : ''}`}>{stats[badge]}</span>}
                </NavLink>
              ))}
            </div>
            {shop?.status === 'approved' && (
              <div className="adm-group">
                <span className="adm-group-title">Visibilité</span>
                <Link to={`/vendeurs/${shop._id}`}><span aria-hidden="true">🔗</span><span className="grow">Ma boutique en ligne</span></Link>
              </div>
            )}
          </nav>
        </aside>
        {open && <div className="adm-backdrop" onClick={() => setOpen(false)} />}
        <div className="adm-main">
          <header className="adm-top">
            <button className="btn adm-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰</button>
            <span className="grow" />
            <Link to="/" className="btn btn-small">Retour au site ↗</Link>
            <span className="adm-user"><span className="avatar">{user.name[0]}</span>{user.name}<span className="role-pill">Vendeur</span></span>
            <button className="btn btn-small btn-ghost" onClick={() => { logout(); navigate('/'); }}>Déconnexion</button>
          </header>
          <main className="adm-content">
            {shop?.status === 'pending' && <p className="alert alert-warn">⏳ Votre boutique est <strong>en attente de validation</strong> par l'administrateur. Vous pourrez publier vos produits dès qu'elle sera validée — vous pouvez déjà compléter votre profil.</p>}
            {shop?.status === 'suspended' && <p className="alert alert-error">⛔ Votre boutique est <strong>suspendue</strong> : vos produits sont masqués. Contactez le support pour la réactiver.</p>}
            <Outlet />
          </main>
        </div>
      </div>
    </ScopeContext.Provider>
  );
}
