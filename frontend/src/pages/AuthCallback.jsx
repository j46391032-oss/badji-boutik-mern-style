import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Page d'arrivée après Google / Facebook / GitHub : le jeton est dans le fragment de l'adresse (#token=…)
export default function AuthCallback() {
  const { t } = useI18n();
  const { signInWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get('token');
    const from = hash.get('from');
    window.history.replaceState(null, '', window.location.pathname); // retire le jeton de la barre d'adresse
    if (!token) {
      setError(t('La connexion a échoué. Réessayez.'));
      return;
    }
    signInWithToken(token)
      .then((user) => navigate(from && from.startsWith('/') ? from : ['admin', 'superadmin'].includes(user.role) ? '/admin' : '/', { replace: true }))
      .catch((e) => setError(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth card">
      {error ? (
        <>
          <p className="alert alert-error">{error}</p>
          <Link to="/connexion" className="btn btn-primary">{t('Se connecter')}</Link>
        </>
      ) : (
        <p>{t('Connexion en cours…')}</p>
      )}
    </div>
  );
}
