import { API_URL } from '../api.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const PROVIDERS = [
  ['google', 'Google', <svg key="g" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>],
  ['facebook', 'Facebook', <svg key="f" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" /></svg>],
  ['github', 'GitHub', <svg key="h" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.300.5-2.400 1.200-3.200-.1-.3-.5-1.500.1-3.200 0 0 1-.3 3.300 1.200a11.500 11.500 0 0 1 6 0c2.300-1.500 3.300-1.200 3.300-1.200.7 1.700.2 2.900.1 3.200.8.800 1.200 1.900 1.200 3.200 0 4.600-2.800 5.600-5.500 5.900.4.400.8 1.100.8 2.200v3.300c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" /></svg>],
];

// Boutons « Continuer avec Google / Facebook / GitHub » : le navigateur passe par le serveur, qui renvoie vers le fournisseur
export default function SocialLogin({ from }) {
  const { t } = useI18n();
  const href = (p) => `${API_URL}/api/auth/oauth/${p}?redirect=${encodeURIComponent(window.location.origin)}${from ? `&from=${encodeURIComponent(from)}` : ''}`;
  return (
    <div className="social">
      <div className="social-or"><span>{t('ou')}</span></div>
      {PROVIDERS.map(([id, label, icon]) => (
        <a key={id} href={href(id)} className={`btn social-btn social-${id}`}>{icon}<span>{t('Continuer avec {name}', { name: label })}</span></a>
      ))}
    </div>
  );
}

// Message à afficher quand la connexion sociale a échoué (le serveur renvoie ?oauth_error=…&provider=…)
export const oauthMessage = (t, code, provider) => {
  const name = { google: 'Google', facebook: 'Facebook', github: 'GitHub' }[provider] || '';
  return {
    not_configured: t('La connexion avec {name} n’est pas encore activée sur ce site.', { name }),
    access_denied: t('Connexion annulée.'),
    no_email: t('Votre compte {name} ne partage pas d’adresse email. Utilisez un autre moyen de connexion.', { name }),
    unverified_email: t('Votre adresse email {name} n’est pas vérifiée.', { name }),
    use_password: t('Ce compte est protégé : connectez-vous avec votre mot de passe.'),
    blocked: t('Ce compte est suspendu. Contactez le support.'),
    invalid_state: t('La connexion a expiré. Veuillez réessayer.'),
    failed: t('La connexion avec {name} a échoué. Réessayez.', { name }),
    unknown_provider: t('Mode de connexion inconnu.'),
  }[code] || t('La connexion a échoué. Réessayez.');
};
