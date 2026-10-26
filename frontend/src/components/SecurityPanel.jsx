import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// Sécurité du compte : double authentification (application d'authentification) et déconnexion de tous les appareils
export default function SecurityPanel() {
  const { t } = useI18n();
  const { saveSession } = useAuth();
  const [info, setInfo] = useState(null);
  const [setup, setSetup] = useState(null); // { secret, otpauthUrl }
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null); // codes de secours, montrés une seule fois
  const [off, setOff] = useState({ open: false, password: '', code: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => api.get('/auth/security').then((r) => setInfo(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  useEffect(() => {
    load();
  }, []);

  const run = async (fn, okText) => {
    setMsg({ type: '', text: '' });
    try {
      await fn();
      if (okText) setMsg({ type: 'ok', text: okText });
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    }
  };

  const start = () => run(async () => setSetup((await api.post('/auth/2fa/setup')).data));
  const enable = (e) => {
    e.preventDefault();
    return run(async () => {
      const { data } = await api.post('/auth/2fa/enable', { code });
      setCodes(data.recoveryCodes);
      setSetup(null);
      setCode('');
      load();
    });
  };
  const disable = (e) => {
    e.preventDefault();
    return run(async () => {
      await api.post('/auth/2fa/disable', { password: off.password, code: off.code });
      setOff({ open: false, password: '', code: '' });
      load();
    }, t('Double authentification désactivée.'));
  };
  const logoutAll = () => {
    if (!window.confirm(t('Déconnecter tous vos appareils (celui-ci reste connecté) ?'))) return undefined;
    return run(async () => saveSession((await api.post('/auth/logout-all')).data), t('Tous vos autres appareils ont été déconnectés.'));
  };
  const download = () => {
    const blob = new Blob([`Boutik — codes de secours\n\n${codes.join('\n')}\n\nChaque code ne sert qu'une fois.\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'boutik-codes-de-secours.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!info) return null;
  const groups = (s) => s.match(/.{1,4}/g).join(' ');
  return (
    <section className="auth card security-panel" id="securite">
      <h2>🔐 {t('Sécurité du compte')}</h2>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}

      <h3>{t('Double authentification')}</h3>
      {codes ? (
        <div className="alert alert-warn">
          <strong>{t('Activée ! Notez ces codes de secours maintenant : ils ne seront plus affichés.')}</strong>
          <ul className="recovery-codes">{codes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
          <p className="small">{t('Chaque code ne sert qu’une fois, si vous perdez votre téléphone.')}</p>
          <div className="row"><button className="btn btn-small" onClick={download}>{t('Télécharger')}</button><button className="btn btn-small btn-primary" onClick={() => setCodes(null)}>{t('J’ai noté mes codes')}</button></div>
        </div>
      ) : info.twoFactorEnabled ? (
        <>
          <p className="text-green">✔ {t('Activée')} — {t('{n} code(s) de secours restant(s)', { n: info.recoveryCodesLeft })}</p>
          {!off.open ? (
            <button className="btn btn-small btn-ghost" onClick={() => setOff({ ...off, open: true })}>{t('Désactiver')}</button>
          ) : (
            <form className="form" onSubmit={disable}>
              {info.hasPassword && <label>{t('Mot de passe')}<input type="password" value={off.password} onChange={(e) => setOff({ ...off, password: e.target.value })} required autoComplete="current-password" /></label>}
              <label>{t('Code de vérification')}<input value={off.code} onChange={(e) => setOff({ ...off, code: e.target.value })} inputMode="numeric" maxLength="9" required /></label>
              <button className="btn btn-danger">{t('Désactiver')}</button>
            </form>
          )}
        </>
      ) : setup ? (
        <form className="form" onSubmit={enable}>
          <p>{t('1. Ouvrez une application d’authentification (Google Authenticator, Microsoft Authenticator, Authy…) et ajoutez un compte avec cette clé :')}</p>
          <p className="secret-key"><code>{groups(setup.secret)}</code></p>
          <p className="small"><a href={setup.otpauthUrl}>{t('Ouvrir dans mon application')}</a></p>
          <label>{t('2. Entrez le code à 6 chiffres affiché')}<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength="6" required /></label>
          <button className="btn btn-primary">{t('Activer')}</button>
        </form>
      ) : (
        <>
          <p className="muted">{t('Un code temporaire de votre téléphone s’ajoute au mot de passe : même si votre mot de passe est volé, personne ne peut entrer.')}{info.staff && <strong> {t('Fortement recommandé pour les administrateurs.')}</strong>}</p>
          <button className="btn btn-primary" onClick={start}>{t('Activer la double authentification')}</button>
        </>
      )}

      <h3>{t('Appareils connectés')}</h3>
      <p className="muted">{t('Vous avez un doute (téléphone perdu, ordinateur partagé) ? Déconnectez tous les appareils.')}</p>
      <button className="btn btn-small" onClick={logoutAll}>{t('Me déconnecter partout')}</button>
      {info.providers.length > 0 && <p className="muted small">{t('Comptes liés :')} {info.providers.join(', ')}</p>}
    </section>
  );
}
