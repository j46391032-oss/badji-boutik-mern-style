const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SecurityEvent = require('../models/SecurityEvent');
const { passwordProblem } = require('../utils/password');
const logSecurity = require('../utils/securityLog');
const { MODULES, ALL_MODULES } = require('../utils/permissions');
const asyncHandler = require('../utils/asyncHandler');

const cleanPerms = (p) => [...new Set([].concat(p || []).filter((m) => ALL_MODULES.includes(m)))];
const view = (u) => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, permissions: u.permissions, blocked: u.blocked, createdAt: u.createdAt });

// GET /api/team (administrateur du projet) — l'équipe et la liste des modules
exports.getTeam = asyncHandler(async (req, res) => {
  const staff = await User.find({ role: { $in: ['admin', 'superadmin'] } }).sort('role createdAt');
  res.json({ members: staff.map(view), modules: MODULES });
});

// POST /api/team — crée un sous-administrateur
exports.createMember = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const problem = passwordProblem(password);
  if (problem) {
    res.status(400);
    throw new Error(problem);
  }
  if (await User.findOne({ email: String(email || '').toLowerCase() })) {
    res.status(400);
    throw new Error('Un compte existe déjà avec cet email');
  }
  const member = await User.create({ name, email, password, phone, role: 'admin', permissions: cleanPerms(req.body.permissions), createdBy: req.user._id });
  res.status(201).json(view(member));
});

const load = async (req, res) => {
  const member = await User.findById(req.params.id);
  if (!member || !['admin', 'superadmin'].includes(member.role)) {
    res.status(404);
    throw new Error('Membre introuvable');
  }
  if (member.role === 'superadmin') {
    res.status(400);
    throw new Error("Le compte de l'administrateur du projet ne peut pas être modifié ici");
  }
  return member;
};

// PUT /api/team/:id — droits, suspension, réinitialisation du mot de passe
exports.updateMember = asyncHandler(async (req, res) => {
  const member = await load(req, res);
  const { name, phone, blocked, password } = req.body;
  if (name !== undefined) member.name = name;
  if (phone !== undefined) member.phone = phone;
  if (req.body.permissions !== undefined) member.permissions = cleanPerms(req.body.permissions);
  if (blocked !== undefined) member.blocked = Boolean(blocked);
  if (password) {
    const problem = passwordProblem(password);
    if (problem) {
      res.status(400);
      throw new Error(problem);
    }
    member.password = password; // déconnecte aussi ses sessions en cours
    await logSecurity(req, 'password_reset_by_owner', { user: member, detail: `par ${req.user.email}` });
  }
  await member.save();
  res.json(view(member));
});

// DELETE /api/team/:id — retire un sous-administrateur (son compte devient un simple client)
exports.removeMember = asyncHandler(async (req, res) => {
  const member = await load(req, res);
  member.role = 'client';
  member.permissions = [];
  await member.save();
  res.json({ message: 'Sous-administrateur retiré (le compte devient un compte client)' });
});

// GET /api/team/log?page=&user=&module= — journal d'activité
exports.getLog = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.user && /^[a-f\d]{24}$/i.test(req.query.user)) filter.user = req.query.user;
  if (req.query.module) filter.module = String(req.query.module);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const total = await AuditLog.countDocuments(filter);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
  const items = await AuditLog.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit);
  res.json({ items, total, page, pages });
});

// GET /api/team/security?type=&page= — évènements de sécurité (connexions, échecs, verrouillages, 2FA…)
exports.getSecurityEvents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = String(req.query.type);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const total = await SecurityEvent.countDocuments(filter);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
  const items = await SecurityEvent.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('user', 'name role');
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [failed24h, locked24h] = await Promise.all([
    SecurityEvent.countDocuments({ type: 'login_failed', createdAt: { $gte: since } }),
    SecurityEvent.countDocuments({ type: { $in: ['login_locked', 'twofactor_locked'] }, createdAt: { $gte: since } }),
  ]);
  // comptes du personnel sans double authentification
  const User = require('../models/User');
  const staffWithout2fa = await User.find({ role: { $in: ['admin', 'superadmin'] }, 'twoFactor.enabled': { $ne: true } }).select('name email role');
  res.json({ items, total, page, pages, summary: { failed24h, locked24h, staffWithout2fa } });
});
