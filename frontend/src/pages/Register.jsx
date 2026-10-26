import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import SocialLogin from '../components/SocialLogin.jsx';

export default function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError(t('Les mots de passe ne correspondent pas'));
    setLoading(true);
    try {
      const { confirm, ...data } = form;
      await register(data);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth card">
      <h1>{t('Créer un compte')}</h1>
      <form className="form" onSubmit={submit}>
        <label>{t('Nom complet')}<input name="name" value={form.name} onChange={change} required autoFocus /></label>
        <label>{t('Email')}<input type="email" name="email" value={form.email} onChange={change} required /></label>
        <label>{t('Téléphone')}<input name="phone" value={form.phone} onChange={change} /></label>
        <label>{t('Mot de passe (8 caractères minimum, avec une lettre et un chiffre)')}<input type="password" name="password" value={form.password} onChange={change} required minLength={8} /></label>
        <label>{t('Confirmer le mot de passe')}<input type="password" name="confirm" value={form.confirm} onChange={change} required /></label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary block" disabled={loading}>{loading ? t('Création…') : t('Créer mon compte')}</button>
      </form>
      <SocialLogin from={location.state?.from} />
      <p className="muted">{t('Vous avez déjà un compte ?')}{' '}<Link to="/connexion">{t('Se connecter')}</Link></p>
    </div>
  );
}
