import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Protège une page : connexion obligatoire, puis au choix
//   role="admin"  → personnel (administrateur du projet ou sous-administrateur)
//   owner         → administrateur du projet uniquement
//   seller        → vendeur (propriétaire d'une boutique)
//   module="..."  → droit sur un module (l'administrateur du projet les a tous)
export default function ProtectedRoute({ role, owner, seller, module, children }) {
  const { user, isAdmin, isOwner, isSeller, can } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  if (role === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (seller && !isSeller) return <Navigate to="/vendre" replace />;
  if (owner && !isOwner) return <Navigate to={isAdmin ? '/admin' : '/'} replace />;
  if (module && !can(module)) return <Navigate to="/admin" replace state={{ denied: true }} />;
  return children;
}
