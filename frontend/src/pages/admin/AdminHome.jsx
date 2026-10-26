import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Dashboard from './Dashboard.jsx';

const SHORTCUTS = [
  ['produits', '/admin/produits', '📦', 'Produits'],
  ['commandes', '/admin/commandes', '🧾', 'Commandes'],
  ['devis', '/admin/devis', '💬', 'Devis et messages'],
  ['clients', '/admin/clients', '👥', 'Clients'],
  ['promos', '/admin/promos', '🏷️', 'Codes promo'],
  ['avis', '/admin/avis', '⭐', 'Avis clients'],
  ['parametres', '/admin/parametres', '⚙️', 'Paramètres'],
];

// Page d'accueil de l'administration : statistiques pour qui y a droit, sinon raccourcis vers ses modules
export default function AdminHome() {
  const { user, can, isOwner } = useAuth();
  const { state } = useLocation();
  const denied = state?.denied && <p className="alert alert-warn">Vous n'avez pas accès à cette rubrique. Demandez ce droit à l'administrateur du projet.</p>;

  if (can('stats'))
    return (
      <>
        {denied}
        <Dashboard />
      </>
    );

  const mine = SHORTCUTS.filter(([mod]) => can(mod));
  return (
    <>
      {denied}
      <div className="page-head"><div><h1>Bonjour {user.name.split(' ')[0]} 👋</h1><p className="muted">{isOwner ? 'Administrateur du projet' : 'Sous-administrateur'} · voici vos rubriques.</p></div></div>
      {mine.length === 0 ? (
        <p className="empty">Aucune rubrique ne vous a encore été attribuée. Contactez l'administrateur du projet.</p>
      ) : (
        <div className="shortcut-grid">
          {mine.map(([, to, icon, label]) => (
            <Link key={to} to={to} className="panel shortcut"><span aria-hidden="true">{icon}</span><strong>{label}</strong></Link>
          ))}
        </div>
      )}
    </>
  );
}
