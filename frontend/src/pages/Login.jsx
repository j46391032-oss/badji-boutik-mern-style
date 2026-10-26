import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import SocialLogin, { oauthMessage } from '../components/SocialLogin.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Login() {
  const { t } = useI18n();
  const { login, verifyTwoFactor } = useAuth();
  const [challenge, setChallenge] = useState(''); // renseigné quand le code de l'application est demandé
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [params] = useSearchParams();
  const oauthError = params.get('oauth_error');
  const [error, setError] = useState(oauthError ? oauthMessage(t, oauthError, params.get('provider')) : '');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await (challenge ? verifyTwoFactor(challenge, code) : login(form.email, form.password));
      if (res.twoFactorRequired) {
        setChallenge(res.challenge);
        return;
      }
      const user = res;
      navigate(location.state?.from || (['admin', 'superadmin'].includes(user.role) ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth card">
      <h1>{t('Connexion')}</h1>
      {challenge ? (
        <form className="form" onSubmit={submit}>
          <p className="alert alert-info">🔐 {t('Entrez le code à 6 chiffres de votre application d’authentification (ou un code de secours).')}</p>
          <label>{t('Code de vérification')}<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength="9" required autoFocus /></label>
          {error && <p className="alert alert-error">{error}</p>}
          <button className="btn btn-primary block" disabled={loading}>{loading ? t('Connexion…') : t('Vérifier')}</button>
          <button type="button" className="btn btn-ghost block" onClick={() => { setChallenge(''); setCode(''); setError(''); }}>{t('Retour')}</button>
        </form>
      ) : (
      <>
      <form className="form" onSubmit={submit}>
        <label>{t('Email')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus /></label>
        <label>{t('Mot de passe')}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary block" disabled={loading}>{loading ? t('Connexion…') : t('Se connecter')}</button>
      </form>
      <SocialLogin from={location.state?.from} />
      <p className="muted">{t('Pas encore de compte ?')}{' '}<Link to="/inscription">{t('Créer un compte')}</Link></p>
      </>
      )}
    </div>
  );
}
