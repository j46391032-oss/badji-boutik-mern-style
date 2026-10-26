const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { passwordProblem } = require('../utils/password');
const guard = require('../utils/loginGuard');
const logSecurity = require('../utils/securityLog');
const totp = require('../utils/totp');
const { encrypt, decrypt, sha256 } = require('../utils/crypto');
const { isStaff } = require('../utils/permissions');

// Le personnel (administrateurs) a des sessions plus courtes que les clients
const sign = (user) =>
  jwt.sign({ id: user._id, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: isStaff(user) ? process.env.STAFF_JWT_EXPIRES_IN || '12h' : process.env.JWT_EXPIRES_IN || '7d',
  });
const challengeToken = (user) => jwt.sign({ id: user._id, scope: '2fa' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });

const payload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.role === 'client' ? [] : user.permissions, // droits d'un sous-administrateur (le superadmin a tout)
  shop: user.shop || null, // identifiant de la boutique si l'utilisateur est vendeur
  avatar: user.avatar || '',
  phone: user.phone,
  address: user.address,
  city: user.city,
  twoFactorEnabled: Boolean(user.twoFactor?.enabled),
  hasPassword: user.hasPassword !== false,
  token: sign(user),
});
exports.payload = payload;

// Empreinte factice : on compare toujours un mot de passe, même si l'email n'existe pas (évite de deviner les comptes par le temps de réponse)
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 10);
const normEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 120);
const tooMany = (res, seconds) => {
  res.setHeader('Retry-After', String(seconds));
  res.status(429);
  return new Error('Trop d’essais échoués : réessayez dans quelques minutes.');
};

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, phone, address, city } = req.body;
  const email = normEmail(req.body.email);
  const problem = passwordProblem(req.body.password);
  if (problem) {
    res.status(400);
    throw new Error(problem);
  }
  if (await User.findOne({ email })) {
    res.status(400);
    throw new Error('Un compte existe déjà avec cet email');
  }
  // Le rôle est toujours "client" à l'inscription (un admin se crée via le seed ou l'équipe)
  const user = await User.create({ name, email, password: req.body.password, phone, address, city, role: 'client' });
  res.status(201).json(payload(user));
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const email = normEmail(req.body.email);
  const password = String(req.body.password || '').slice(0, 200);
  const wait = guard.lockedFor(req, email);
  if (wait) throw tooMany(res, wait);

  const user = await User.findOne({ email }).select('+password');
  if (user && !user.password && user.providers?.length) {
    res.status(401);
    throw new Error(`Ce compte utilise la connexion ${user.providers.map((p) => ({ google: 'Google', facebook: 'Facebook', github: 'GitHub' }[p.provider])).join(' / ')}`);
  }
  const ok = user ? await user.matchPassword(password) : (await bcrypt.compare(password, DUMMY_HASH), false);
  if (!ok) {
    const locked = guard.recordFailure(req, email);
    await logSecurity(req, locked ? 'login_locked' : 'login_failed', { user, email, detail: locked ? 'Verrouillé 15 minutes après 5 échecs' : '' });
    res.status(401);
    throw new Error('Email ou mot de passe incorrect');
  }
  if (user.blocked) {
    res.status(403);
    throw new Error('Ce compte est suspendu. Contactez le support.');
  }
  guard.clear(req, email);

  // double authentification : le mot de passe ne suffit pas, il faut aussi le code de l'application
  if (user.twoFactor?.enabled) return res.json({ twoFactorRequired: true, challenge: challengeToken(user) });

  if (isStaff(user)) await logSecurity(req, 'login', { user });
  res.json(payload(user));
});

// POST /api/auth/2fa/verify { challenge, code } — deuxième étape de la connexion
exports.verifyTwoFactor = asyncHandler(async (req, res) => {
  let decoded;
  try {
    decoded = jwt.verify(String(req.body.challenge || ''), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    res.status(401);
    throw new Error('La vérification a expiré, reconnectez-vous');
  }
  if (decoded.scope !== '2fa') {
    res.status(401);
    throw new Error('Vérification invalide');
  }
  const key = `2fa:${decoded.id}`;
  const wait = guard.lockedFor(req, key);
  if (wait) throw tooMany(res, wait);

  const user = await User.findById(decoded.id).select('+twoFactor.secret +twoFactor.recovery');
  if (!user || !user.twoFactor?.enabled || user.blocked) {
    res.status(401);
    throw new Error('Vérification invalide');
  }
  const code = String(req.body.code || '').trim();
  let good = totp.verify(decrypt(user.twoFactor.secret), code);
  let usedRecovery = false;
  if (!good && /^[a-f0-9]{4}-?[a-f0-9]{4}$/i.test(code)) {
    const hash = sha256(code.replace('-', '').toLowerCase());
    if (user.twoFactor.recovery.includes(hash)) {
      user.twoFactor.recovery = user.twoFactor.recovery.filter((h) => h !== hash); // un code de secours ne sert qu'une fois
      await user.save();
      good = usedRecovery = true;
    }
  }
  if (!good) {
    const locked = guard.recordFailure(req, key);
    await logSecurity(req, locked ? 'twofactor_locked' : 'twofactor_failed', { user });
    res.status(401);
    throw new Error('Code incorrect');
  }
  guard.clear(req, key);
  await logSecurity(req, usedRecovery ? 'login_recovery_code' : 'login', { user, detail: usedRecovery ? `Code de secours utilisé (${user.twoFactor.recovery.length} restant(s))` : '' });
  res.json(payload(user));
});

// GET /api/auth/profile
exports.getProfile = asyncHandler(async (req, res) => {
  res.json(payload(req.user));
});

// PUT /api/auth/profile — changer l'email ou le mot de passe demande le mot de passe actuel
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { name, phone, address, city, password, currentPassword } = req.body;
  const email = req.body.email !== undefined ? normEmail(req.body.email) : undefined;
  const changesEmail = email !== undefined && email !== user.email;

  if ((changesEmail || password) && user.password) {
    const key = `pw:${user._id}`;
    const wait = guard.lockedFor(req, key);
    if (wait) throw tooMany(res, wait);
    if (!(await user.matchPassword(String(currentPassword || '')))) {
      const locked = guard.recordFailure(req, key);
      await logSecurity(req, locked ? 'password_check_locked' : 'password_check_failed', { user, detail: 'Changement de profil' });
      res.status(400);
      throw new Error('Mot de passe actuel incorrect');
    }
    guard.clear(req, key);
  }
  if (password) {
    const problem = passwordProblem(password);
    if (problem) {
      res.status(400);
      throw new Error(problem);
    }
    user.password = password;
  }
  if (changesEmail) {
    if (await User.findOne({ email, _id: { $ne: user._id } })) {
      res.status(400);
      throw new Error('Un compte existe déjà avec cet email');
    }
    user.email = email;
  }
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;
  if (city !== undefined) user.city = city;
  await user.save();
  if (password) await logSecurity(req, 'password_changed', { user });
  if (changesEmail) await logSecurity(req, 'email_changed', { user });
  res.json(payload(user)); // nouveau jeton : les autres appareils sont déconnectés si le mot de passe a changé
});

// POST /api/auth/logout-all — déconnecte tous les appareils (anciens jetons refusés)
exports.logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await logSecurity(req, 'logout_all', { user });
  res.json(payload(user));
});

// GET /api/auth/security — état de la sécurité du compte
exports.getSecurity = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactor.recovery');
  res.json({
    twoFactorEnabled: Boolean(user.twoFactor?.enabled),
    recoveryCodesLeft: user.twoFactor?.recovery?.length || 0,
    hasPassword: user.hasPassword !== false,
    providers: (user.providers || []).map((p) => p.provider),
    staff: isStaff(user),
  });
});

// POST /api/auth/2fa/setup — génère un secret à saisir dans l'application d'authentification
exports.setupTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactor.pendingSecret');
  if (user.twoFactor?.enabled) {
    res.status(400);
    throw new Error('La double authentification est déjà activée');
  }
  const secret = totp.generateSecret();
  user.twoFactor.pendingSecret = encrypt(secret);
  await user.save();
  res.json({ secret, otpauthUrl: totp.otpauthUrl(secret, user.email) });
});

// POST /api/auth/2fa/enable { code } — confirme avec un premier code ; renvoie les codes de secours (une seule fois)
exports.enableTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactor.pendingSecret +twoFactor.recovery');
  if (!user.twoFactor?.pendingSecret) {
    res.status(400);
    throw new Error('Commencez par générer un secret');
  }
  if (!totp.verify(decrypt(user.twoFactor.pendingSecret), req.body.code)) {
    res.status(400);
    throw new Error('Code incorrect : vérifiez l’heure de votre téléphone et réessayez');
  }
  const codes = Array.from({ length: 8 }, () => {
    const c = crypto.randomBytes(4).toString('hex');
    return `${c.slice(0, 4)}-${c.slice(4)}`;
  });
  user.twoFactor.secret = user.twoFactor.pendingSecret;
  user.twoFactor.pendingSecret = undefined;
  user.twoFactor.enabled = true;
  user.twoFactor.enabledAt = new Date();
  user.twoFactor.recovery = codes.map((c) => sha256(c.replace('-', '')));
  await user.save();
  await logSecurity(req, 'twofactor_enabled', { user });
  res.json({ recoveryCodes: codes });
});

// POST /api/auth/2fa/disable { password, code }
exports.disableTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +twoFactor.secret +twoFactor.recovery');
  if (!user.twoFactor?.enabled) {
    res.status(400);
    throw new Error('La double authentification n’est pas activée');
  }
  const wait = guard.lockedFor(req, `2fa-off:${user._id}`);
  if (wait) throw tooMany(res, wait);
  const okPassword = !user.password || (await user.matchPassword(String(req.body.password || '')));
  const code = String(req.body.code || '').trim();
  const okCode = totp.verify(decrypt(user.twoFactor.secret), code) || user.twoFactor.recovery.includes(sha256(code.replace('-', '').toLowerCase()));
  if (!okPassword || !okCode) {
    guard.recordFailure(req, `2fa-off:${user._id}`);
    res.status(400);
    throw new Error('Mot de passe ou code incorrect');
  }
  user.twoFactor = { enabled: false, recovery: [], enabledAt: null };
  await user.save();
  await logSecurity(req, 'twofactor_disabled', { user });
  res.json({ twoFactorEnabled: false });
});
