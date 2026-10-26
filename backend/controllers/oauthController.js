const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const oauth = require('../utils/oauth');
const origins = require('../utils/origins');
const { isStaff } = require('../utils/permissions');

const COOKIE = 'oauth_nonce';
const apiBase = (req) => (process.env.API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
const callbackUrl = (req, provider) => `${apiBase(req)}/api/auth/oauth/${provider}/callback`;
const cookieOf = (req, name) => (req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];
const sign = (user) => jwt.sign({ id: user._id, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// L'adresse du site où revenir : doit figurer dans CLIENT_URL (sinon la première)
const safeOrigin = (wanted) => {
  const allowed = origins.list();
  const w = String(wanted || '').replace(/\/$/, '');
  return allowed.includes(w) ? w : allowed[0];
};

// Retour au site avec un message (la page de connexion l'affiche) : le jeton ne passe que dans le fragment (#), jamais dans les journaux
const back = (res, origin, params) => res.redirect(`${origin}/connexion?${new URLSearchParams(params)}`);

// GET /api/auth/providers — quels fournisseurs sont activés
exports.providers = (req, res) => res.json(oauth.status());

// GET /api/auth/oauth/:provider?redirect=<adresse du site> — envoie vers Google / Facebook / GitHub
exports.start = (req, res) => {
  const { provider } = req.params;
  const origin = safeOrigin(req.query.redirect);
  if (!oauth.isProvider(provider)) return back(res, origin, { oauth_error: 'unknown_provider' });
  if (!oauth.isConfigured(provider)) return back(res, origin, { oauth_error: 'not_configured', provider });
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = jwt.sign({ p: provider, n: nonce, o: origin, r: String(req.query.from || '').startsWith('/') ? String(req.query.from) : '' }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const secure = (process.env.API_URL || '').startsWith('https') || req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${nonce}; Path=/api/auth/oauth; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);
  res.redirect(oauth.authorizeUrl(provider, callbackUrl(req, provider), state));
};

// Retrouve (ou crée) le compte : jamais de rattachement automatique à un compte administrateur
async function findOrCreate(provider, profile) {
  const known = await User.findOne({ providers: { $elemMatch: { provider, providerId: profile.providerId } } });
  if (known) return isStaff(known) ? { error: 'use_password' } : { user: known }; // le personnel passe toujours par mot de passe (et double authentification)
  if (!profile.email) return { error: 'no_email' };
  const email = profile.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (isStaff(existing)) return { error: 'use_password' }; // un compte du personnel ne se rattache pas par simple email
    if (!profile.emailVerified) return { error: 'unverified_email' };
    existing.providers.push({ provider, providerId: profile.providerId });
    if (!existing.avatar) existing.avatar = profile.avatar;
    await existing.save();
    return { user: existing };
  }
  const user = await User.create({ name: profile.name || email.split('@')[0], email, avatar: profile.avatar, role: 'client', hasPassword: false, providers: [{ provider, providerId: profile.providerId }] });
  return { user };
}
exports.findOrCreate = findOrCreate;

// GET /api/auth/oauth/:provider/callback — retour du fournisseur
exports.callback = async (req, res) => {
  const { provider } = req.params;
  const fallback = origins.list()[0];
  let state;
  try {
    state = jwt.verify(String(req.query.state || ''), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return back(res, fallback, { oauth_error: 'invalid_state' });
  }
  const origin = safeOrigin(state.o);
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/api/auth/oauth; HttpOnly; SameSite=Lax; Max-Age=0`);
  if (state.p !== provider || !oauth.isConfigured(provider) || !state.n || cookieOf(req, COOKIE) !== state.n) return back(res, origin, { oauth_error: 'invalid_state' });
  if (req.query.error || !req.query.code) return back(res, origin, { oauth_error: 'access_denied', provider });
  try {
    const profile = await oauth.fetchProfile(provider, String(req.query.code), callbackUrl(req, provider));
    const { user, error } = await findOrCreate(provider, profile);
    if (error) return back(res, origin, { oauth_error: error, provider });
    if (user.blocked) return back(res, origin, { oauth_error: 'blocked' });
    require('../utils/securityLog')(req, 'oauth_login', { user, detail: provider });
    const hash = new URLSearchParams({ token: sign(user), ...(state.r ? { from: state.r } : {}) });
    return res.redirect(`${origin}/auth/callback#${hash}`);
  } catch (err) {
    console.error(`Connexion ${provider} :`, err.message);
    return back(res, origin, { oauth_error: 'failed', provider });
  }
};
