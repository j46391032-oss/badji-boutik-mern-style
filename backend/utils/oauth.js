// Connexion avec Google, Facebook et GitHub (OAuth 2.0, « code d'autorisation »), sans bibliothèque externe.
// Chaque fournisseur est activé en renseignant ses identifiants dans .env (voir README).
const PROVIDERS = {
  google: {
    label: 'Google',
    idEnv: 'GOOGLE_CLIENT_ID',
    secretEnv: 'GOOGLE_CLIENT_SECRET',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    extra: { prompt: 'select_account' },
  },
  facebook: {
    label: 'Facebook',
    idEnv: 'FACEBOOK_APP_ID',
    secretEnv: 'FACEBOOK_APP_SECRET',
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scope: 'email,public_profile',
    extra: {},
  },
  github: {
    label: 'GitHub',
    idEnv: 'GITHUB_CLIENT_ID',
    secretEnv: 'GITHUB_CLIENT_SECRET',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    extra: {},
  },
};

const isProvider = (name) => Object.prototype.hasOwnProperty.call(PROVIDERS, name);
const credentials = (name) => ({ id: process.env[PROVIDERS[name].idEnv], secret: process.env[PROVIDERS[name].secretEnv] });
const isConfigured = (name) => isProvider(name) && Boolean(credentials(name).id && credentials(name).secret);
const status = () => Object.fromEntries(Object.keys(PROVIDERS).map((p) => [p, isConfigured(p)]));

function authorizeUrl(name, redirectUri, state) {
  const p = PROVIDERS[name];
  const params = new URLSearchParams({ client_id: credentials(name).id, redirect_uri: redirectUri, response_type: 'code', scope: p.scope, state, ...p.extra });
  return `${p.authUrl}?${params}`;
}

const json = async (res, what) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`${what} : ${body.error_description || body.error?.message || body.error || res.status}`);
  return body;
};

// Échange le code contre un jeton, puis lit le profil : { providerId, email, emailVerified, name, avatar }
async function fetchProfile(name, code, redirectUri) {
  const p = PROVIDERS[name];
  const { id, secret } = credentials(name);
  const tokenRes = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const { access_token: token } = await json(tokenRes, 'Jeton refusé');
  if (!token) throw new Error('Jeton absent');
  const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'boutik' };

  if (name === 'google') {
    const u = await json(await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: auth }), 'Profil Google');
    return { providerId: String(u.sub), email: u.email || '', emailVerified: u.email_verified === true || u.email_verified === 'true', name: u.name || u.email, avatar: u.picture || '' };
  }
  if (name === 'facebook') {
    const u = await json(await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(token)}`), 'Profil Facebook');
    // Facebook ne renvoie que l'adresse confirmée par l'utilisateur
    return { providerId: String(u.id), email: u.email || '', emailVerified: Boolean(u.email), name: u.name || u.email, avatar: u.picture?.data?.url || '' };
  }
  // GitHub : l'email du profil peut être privé ; on prend l'adresse principale et vérifiée
  const u = await json(await fetch('https://api.github.com/user', { headers: auth }), 'Profil GitHub');
  let email = '';
  const emailsRes = await fetch('https://api.github.com/user/emails', { headers: auth });
  if (emailsRes.ok) {
    const emails = await emailsRes.json();
    email = (emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified))?.email || '';
  }
  return { providerId: String(u.id), email, emailVerified: Boolean(email), name: u.name || u.login, avatar: u.avatar_url || '' };
}

module.exports = { PROVIDERS, isProvider, isConfigured, status, authorizeUrl, fetchProfile };
