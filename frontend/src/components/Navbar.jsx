import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useCompare } from '../context/CompareContext.jsx';
import SearchBox from './SearchBox.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { sortRayons } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// En-tête à deux étages (style Amazon / Alibaba) : recherche par catégorie, compte, panier, puis liens rapides
export default function Navbar() {
  const { t } = useI18n();
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const { settings } = useSettings();
  const { ids: compareIds } = useCompare();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {settings.announcement && <div className="announcement">{settings.announcement}</div>}
      <header className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="brand">{settings.shopName || 'Boutik'}</Link>

          <div className="deliver">
            <span className="muted-light small">{t('Livraison à')}</span>
            <strong>📍 {user?.city ? `${user.city}, ${t('Sénégal')}` : t('Sénégal')}</strong>
          </div>

          <SearchBox categories={categories} />

          <div className="nav-actions">
            <LanguageSwitcher />
            <div className="account">
              <Link to={user ? '/profil' : '/connexion'} className="account-link">
                <span className="small">{t('Bonjour,')}{' '}{user ? user.name.split(' ')[0] : t('identifiez-vous')}</span>
                <strong>{t('Compte et listes ▾')}</strong>
              </Link>
              <div className="dropdown">
                {user ? (
                  <>
                    {isAdmin ? <Link to="/admin">{t('Espace administrateur')}</Link> : (
                      <>
                        <Link to="/mes-commandes">{t('Mes commandes')}</Link>
                        <Link to="/mes-devis">{t('Mes demandes de devis')}</Link>
                        <Link to="/favoris">{t('Mes favoris')}</Link>
                      </>
                    )}
                    <Link to="/profil">{t('Mon profil')}</Link>
                    <button onClick={handleLogout}>{t('Déconnexion')}</button>
                  </>
                ) : (
                  <>
                    <Link to="/connexion" className="btn btn-primary">{t('Se connecter')}</Link>
                    <span className="small muted">{t('Nouveau client ?')}{' '}<Link to="/inscription">{t('Créer un compte')}</Link></span>
                  </>
                )}
              </div>
            </div>
            {user && !isAdmin && (
              <NavLink to="/mes-commandes" className="orders-link"><span className="small">{t('Retours')}</span><strong>{t('et commandes')}</strong></NavLink>
            )}
            {!isAdmin && (
              <NavLink to="/panier" className="cart-link" aria-label={t(count > 1 ? 'Panier ({n} articles)' : 'Panier ({n} article)', { n: count })}>
                <span className="cart-icon">🛒<span className="badge-count">{count}</span></span>
                <strong>{t('Panier')}</strong>
              </NavLink>
            )}
          </div>
        </div>

        <nav className="subbar">
          <div className="container subbar-inner">
            <button className="all-btn" onClick={() => setDrawer(true)}>{t('☰ Toutes')}</button>
            <NavLink to="/produits?flash=1">{t('Ventes Flash')}</NavLink>
            <NavLink to="/produits?sort=best">{t('Meilleures ventes')}</NavLink>
            <NavLink to="/produits?sort=new">{t('Nouveautés')}</NavLink>
            <NavLink to="/produits?freeShipping=1">{t('Livraison gratuite')}</NavLink>
            <NavLink to="/boutique-officielle">🏪 {t('Boutique officielle')}</NavLink>
            <NavLink to="/marches">🏬 {t('Les marchés')}</NavLink>
            <NavLink to={user?.shop ? '/vendeur' : '/vendre'}>{user?.shop ? t('Mon espace vendeur') : t('Vendre sur Boutik')}</NavLink>
            <NavLink to="/vendeurs">{t('Vendeurs')}</NavLink>
            <NavLink to="/demande-devis">{t('Demander un devis')}</NavLink>
            <NavLink to="/comparer">{t('Comparer')}{compareIds.length > 0 ? ` (${compareIds.length})` : ''}</NavLink>
            {user && !isAdmin && <NavLink to="/favoris">{t('Favoris')}</NavLink>}
            <span className="spacer" />
            <NavLink to="/aide">{t('Centre d\'aide')}</NavLink>
          </div>
        </nav>
      </header>

      {drawer && (
        <div className="drawer-overlay" onClick={() => setDrawer(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label={t('Catégories')}>
            <div className="drawer-head">
              <strong>{t('Bonjour,')}{' '}{user ? user.name.split(' ')[0] : t('identifiez-vous')}</strong>
              <button className="btn-ghost" onClick={() => setDrawer(false)} aria-label={t('Fermer')}>✕</button>
            </div>
            <h3>{t('Toutes les catégories')}</h3>
            <Link to="/produits" onClick={() => setDrawer(false)}>{t('🛍️ Tous les produits')}</Link>
            {[['fresh', '🥬 Périmètre frais'], ['grocery', '🛒 Allées centrales'], ['general', '🛍️ Marchandises générales'], ['', 'Autres rayons']].map(([zone, label]) => {
              const list = sortRayons(categories.filter((c) => (c.zone || '') === zone && c.count > 0));
              if (list.length === 0) return null;
              return (
                <div key={zone || 'other'} className="drawer-zone">
                  <h4>{t(label)}</h4>
                  {list.map((c) => (
                    <Link key={c._id} to={c.slug && zone ? `/rayon/${c.slug}` : `/produits?category=${c._id}`} onClick={() => setDrawer(false)}>
                      <span>{c.icon || '📦'} {t(c.name)}</span><span className="muted small">{zone ? `${{ fresh: 'F', grocery: 'E', general: 'G' }[zone]}${c.aisle}` : c.count}</span>
                    </Link>
                  ))}
                </div>
              );
            })}
            <h3>{t('Offres et services')}</h3>
            <Link to="/produits?flash=1" onClick={() => setDrawer(false)}>{t('⚡ Ventes Flash')}</Link>
            <Link to="/produits?sort=best" onClick={() => setDrawer(false)}>{t('🏆 Meilleures ventes')}</Link>
            <Link to="/boutique-officielle" onClick={() => setDrawer(false)}>🏪 {t('Boutique officielle')}</Link>
            <Link to="/marches" onClick={() => setDrawer(false)}>🏬 {t('Les marchés')}</Link>
            <Link to={user?.shop ? '/vendeur' : '/vendre'} onClick={() => setDrawer(false)}>🛒 {user?.shop ? t('Mon espace vendeur') : t('Vendre sur Boutik')}</Link>
            <Link to="/vendeurs" onClick={() => setDrawer(false)}>{t('🏪 Vendeurs')}</Link>
            <Link to="/comparer" onClick={() => setDrawer(false)}>{t('⚖️ Comparer des produits')}</Link>
            <Link to="/demande-devis" onClick={() => setDrawer(false)}>{t('📝 Demander un devis')}</Link>
            <Link to="/aide" onClick={() => setDrawer(false)}>{t('❓ Centre d\'aide')}</Link>
          </aside>
        </div>
      )}
    </>
  );
}
