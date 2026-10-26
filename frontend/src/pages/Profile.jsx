import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import SecurityPanel from '../components/SecurityPanel.jsx';

export default function Profile() {
  const { t } = useI18n();
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    city: user.city || '',
    password: '',
    currentPassword: '',
  });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      const { password, currentPassword, ...rest } = form;
      // changer l'email ou le mot de passe demande le mot de passe actuel
      const sensitive = password || rest.email.trim().toLowerCase() !== user.email;
      await updateProfile({ ...rest, ...(password ? { password } : {}), ...(sensitive && currentPassword ? { currentPassword } : {}) });
      setForm((f) => ({ ...f, password: '', currentPassword: '' }));
      setMsg({ type: 'ok', text: t('Profil mis à jour.') });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    }
  };

  return (
    <>
    <div className="auth card">
      <h1>{t('Mon profil')}</h1>
      <form className="form" onSubmit={submit}>
        <label>{t('Nom complet')}<input name="name" value={form.name} onChange={change} required /></label>
        <label>{t('Email')}<input type="email" name="email" value={form.email} onChange={change} required /></label>
        <label>{t('Téléphone')}<input name="phone" value={form.phone} onChange={change} /></label>
        <label>{t('Adresse')}<input name="address" value={form.address} onChange={change} /></label>
        <label>{t('Ville')}<input name="city" value={form.city} onChange={change} placeholder={t('Dakar')} /></label>
        <label>{t('Nouveau mot de passe (laisser vide pour ne pas changer)')}<input type="password" name="password" value={form.password} onChange={change} minLength={8} autoComplete="new-password" /></label>
        {user.hasPassword !== false && <label>{t('Mot de passe actuel (obligatoire pour changer l’email ou le mot de passe)')}<input type="password" name="currentPassword" value={form.currentPassword} onChange={change} autoComplete="current-password" /></label>}
        {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}
        <button className="btn btn-primary block">{t('Enregistrer')}</button>
      </form>
    </div>
    <SecurityPanel />
    </>
  );
}
