const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
const SecurityEvent = require('../models/SecurityEvent');
const guard = require('../utils/loginGuard');
const totp = require('../utils/totp');
const { passwordProblem } = require('../utils/password');
const { encrypt, decrypt } = require('../utils/crypto');
const checkEnv = require('../utils/checkEnv');
const uploads = require('../middleware/upload').dir;

let mongod, owner, client;
const created = [];
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });
const tokenOf = async (email, password) => (await login(email, password)).body.token;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Propriétaire', email: 'owner@sec.sn', password: 'Owner123!', role: 'superadmin' },
    { name: 'Client', email: 'client@sec.sn', password: 'Client123!' },
  ]);
  owner = await tokenOf('owner@sec.sn', 'Owner123!');
  client = await tokenOf('client@sec.sn', 'Client123!');
});

afterAll(async () => {
  created.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
  await mongoose.disconnect();
  await mongod.stop();
});

describe('en-têtes et entrées', () => {
  test("l'API envoie des en-têtes de sécurité et ne dit pas qu'elle utilise Express", async () => {
    const res = await request(app).get('/api/auth/profile'); // 401, mais les en-têtes sont là
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'none'/);
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toBeUndefined(); // seulement en production
    expect((await request(app).get('/api/products')).headers['cache-control']).toBeUndefined(); // le catalogue public reste en cache normal
  });
  test('les opérateurs MongoDB dans les paramètres ou le corps sont neutralisés', async () => {
    const q = await request(app).get('/api/orders?status[$ne]=zzz&search[$regex]=.*').set(auth(owner));
    expect(q.status).toBe(200);
    expect((await request(app).get('/api/products?category[$ne]=x&search=a&search=b')).status).toBe(200); // paramètre répété
    const inj = await login({ $gt: '' }, { $gt: '' });
    expect(inj.status).toBe(401);
    const reg = await request(app).post('/api/auth/register').send({ name: 'A', email: { $ne: 'x' }, password: 'Motdepasse9' });
    expect(reg.status).toBe(400);
    const proto = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"__proto__":{"role":"superadmin"},"email":"client@sec.sn","password":"Client123!"}');
    expect(proto.body.role).toBe('client');
  });
  test('un JSON mal formé ou trop gros est refusé proprement', async () => {
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{oups');
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/JSON/);
    const big = await request(app).post('/api/auth/login').send({ email: 'a@b.sn', password: 'x'.repeat(400 * 1024) });
    expect(big.status).toBe(413);
  });
  test('en production, une erreur interne ne montre pas ses détails et HSTS est activé', async () => {
    const spy = jest.spyOn(Product, 'find').mockImplementationOnce(() => { throw new Error('détail secret de la base'); });
    process.env.NODE_ENV = 'production';
    const res = await request(app).get('/api/products');
    process.env.NODE_ENV = 'test';
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.message).not.toMatch(/secret/);
    const hsts = await (async () => { process.env.NODE_ENV = 'production'; const r = await request(app).get('/api/health'); process.env.NODE_ENV = 'test'; return r; })();
    expect(hsts.headers['strict-transport-security']).toMatch(/max-age=31536000/);
  });
});

describe('images envoyées', () => {
  test('une page HTML déguisée en image est refusée, quels que soient son nom et son type annoncé', async () => {
    const res = await request(app).post('/api/products/upload').set(auth(owner)).attach('image', Buffer.from('<html><script>alert(1)</script></html>'), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/vraies images/);
  });
  test("une vraie image est enregistrée sous un nom aléatoire, avec l'extension déduite du contenu", async () => {
    const res = await request(app).post('/api/products/upload').set(auth(owner)).attach('image', PNG, { filename: 'evil.php.html', contentType: 'text/html' });
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/);
    const file = path.join(uploads, path.basename(res.body.url));
    created.push(file);
    expect(fs.existsSync(file)).toBe(true);
    const served = await request(app).get(res.body.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-security-policy']).toMatch(/sandbox/);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });
  test("l'envoi est réservé à ceux qui y ont droit", async () => {
    expect((await request(app).post('/api/products/upload').attach('image', PNG, 'a.png')).status).toBe(401);
    expect((await request(app).post('/api/products/upload').set(auth(client)).attach('image', PNG, 'a.png')).status).toBe(403);
  });
});

describe('mots de passe', () => {
  test('la règle : 8 caractères, une lettre, un chiffre, pas trop courant', () => {
    expect(passwordProblem('court1')).toMatch(/8 caractères/);
    expect(passwordProblem('uniquementlettres')).toMatch(/lettre et un chiffre/);
    expect(passwordProblem('12345678901')).toMatch(/lettre et un chiffre/);
    expect(passwordProblem('Password1')).toMatch(/courant/);
    expect(passwordProblem('x1'.repeat(70))).toMatch(/trop long/);
    expect(passwordProblem('Teranga2026')).toBe('');
  });
  test("l'inscription applique la règle et normalise l'email", async () => {
    const weak = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@sec.sn', password: 'abc' });
    expect(weak.status).toBe(400);
    const ok = await request(app).post('/api/auth/register').send({ name: 'Awa', email: '  AWA@Sec.SN ', password: 'Teranga2026', role: 'superadmin' });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ email: 'awa@sec.sn', role: 'client' });
    expect((await login('awa@sec.sn', 'Teranga2026')).status).toBe(200);
  });
  test('le mot de passe est haché, jamais renvoyé', async () => {
    const u = await User.findOne({ email: 'awa@sec.sn' }).select('+password');
    expect(u.password).toMatch(/^\$2[aby]\$/);
    expect(JSON.stringify((await request(app).get('/api/auth/profile').set(auth(await tokenOf('awa@sec.sn', 'Teranga2026')))).body)).not.toMatch(/\$2[aby]\$/);
  });
});

describe('verrouillage après des échecs répétés', () => {
  beforeAll(() => { process.env.FORCE_RATE_LIMIT = '1'; guard.resetAll(); });
  afterAll(() => { delete process.env.FORCE_RATE_LIMIT; guard.resetAll(); });
  test('5 mauvais mots de passe bloquent 15 minutes, même avec le bon ensuite', async () => {
    for (let i = 0; i < 5; i++) expect((await login('client@sec.sn', `mauvais${i}`)).status).toBe(401);
    const locked = await login('client@sec.sn', 'Client123!');
    expect(locked.status).toBe(429);
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(800);
    expect(locked.body.message).toMatch(/Trop d’essais/);
    expect((await login('awa@sec.sn', 'Teranga2026')).status).toBe(200); // les autres comptes ne sont pas touchés
  });
  test("un email inconnu est traité pareil (on ne peut pas deviner quels comptes existent)", async () => {
    for (let i = 0; i < 5; i++) expect((await login('inconnu@sec.sn', 'x')).status).toBe(401);
    expect((await login('inconnu@sec.sn', 'x')).status).toBe(429);
  });
  test('les échecs et le verrouillage sont enregistrés pour l’administrateur du projet', async () => {
    const res = await request(app).get('/api/team/security').set(auth(owner));
    expect(res.status).toBe(200);
    const types = res.body.items.map((e) => e.type);
    expect(types).toContain('login_failed');
    expect(types).toContain('login_locked');
    expect(res.body.summary.failed24h).toBeGreaterThan(0);
    expect((await request(app).get('/api/team/security').set(auth(client))).status).toBe(403);
  });
  test("une connexion réussie remet le compteur à zéro", async () => {
    guard.resetAll();
    for (let i = 0; i < 3; i++) await login('client@sec.sn', 'faux');
    expect((await login('client@sec.sn', 'Client123!')).status).toBe(200);
    for (let i = 0; i < 4; i++) await login('client@sec.sn', 'faux');
    expect((await login('client@sec.sn', 'Client123!')).status).toBe(200); // 4 échecs seulement depuis la réussite
  });
});

describe('sessions', () => {
  test('changer son email ou son mot de passe demande le mot de passe actuel', async () => {
    const t = await tokenOf('awa@sec.sn', 'Teranga2026');
    expect((await request(app).put('/api/auth/profile').set(auth(t)).send({ email: 'pirate@sec.sn' })).status).toBe(400);
    expect((await request(app).put('/api/auth/profile').set(auth(t)).send({ password: 'Nouveau2026' })).status).toBe(400);
    expect((await request(app).put('/api/auth/profile').set(auth(t)).send({ password: 'Nouveau2026', currentPassword: 'faux' })).body.message).toMatch(/actuel incorrect/);
    expect((await request(app).put('/api/auth/profile').set(auth(t)).send({ password: 'abc', currentPassword: 'Teranga2026' })).status).toBe(400); // règle des mots de passe
    expect((await request(app).put('/api/auth/profile').set(auth(t)).send({ name: 'Awa D.' })).status).toBe(200); // le reste ne demande rien
  });
  test('après un changement de mot de passe, les anciens jetons ne marchent plus', async () => {
    const old = await tokenOf('awa@sec.sn', 'Teranga2026');
    const other = await tokenOf('awa@sec.sn', 'Teranga2026');
    const res = await request(app).put('/api/auth/profile').set(auth(old)).send({ password: 'Nouveau2026', currentPassword: 'Teranga2026' });
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/auth/profile').set(auth(old))).status).toBe(401);
    expect((await request(app).get('/api/auth/profile').set(auth(other))).status).toBe(401);
    expect((await request(app).get('/api/auth/profile').set(auth(res.body.token))).status).toBe(200); // celui qui a changé reste connecté
    expect((await login('awa@sec.sn', 'Nouveau2026')).status).toBe(200);
  });
  test('« déconnexion partout » invalide tous les autres appareils', async () => {
    const a = await tokenOf('awa@sec.sn', 'Nouveau2026');
    const b = await tokenOf('awa@sec.sn', 'Nouveau2026');
    const res = await request(app).post('/api/auth/logout-all').set(auth(a));
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/auth/profile').set(auth(b))).status).toBe(401);
    expect((await request(app).get('/api/auth/profile').set(auth(a))).status).toBe(401);
    expect((await request(app).get('/api/auth/profile').set(auth(res.body.token))).status).toBe(200);
  });
  test("durées : plus courte pour le personnel ; un jeton « alg: none » ou falsifié est refusé", async () => {
    const staff = jwt.decode(owner);
    const cust = jwt.decode(client);
    expect(staff.exp - staff.iat).toBe(12 * 3600);
    expect(cust.exp - cust.iat).toBe(7 * 24 * 3600);
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: staff.id, tv: 0 })).toString('base64url')}.`;
    expect((await request(app).get('/api/auth/profile').set(auth(none))).status).toBe(401);
    const forged = jwt.sign({ id: staff.id, tv: 0 }, 'mauvaise-cle');
    expect((await request(app).get('/api/auth/profile').set(auth(forged))).status).toBe(401);
  });
});

describe('double authentification (TOTP)', () => {
  test('les codes suivent le standard RFC 6238 (vecteurs officiels)', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // « 12345678901234567890 »
    expect(totp.totp(secret, 59 * 1000)).toBe('287082');
    expect(totp.totp(secret, 1111111109 * 1000)).toBe('081804');
    expect(totp.totp(secret, 1234567890 * 1000)).toBe('005924');
    expect(totp.verify(secret, '287082', 59 * 1000)).toBe(true);
    expect(totp.verify(secret, '287082', 59 * 1000 + 30000)).toBe(true); // période voisine tolérée
    expect(totp.verify(secret, '287082', 59 * 1000 + 120000)).toBe(false);
    expect(totp.verify(secret, 'abcdef')).toBe(false);
  });
  test('les secrets sont chiffrés au repos', () => {
    const c = encrypt('GEZDGNBVGY3TQOJQ');
    expect(c).not.toMatch(/GEZD/);
    expect(decrypt(c)).toBe('GEZDGNBVGY3TQOJQ');
    expect(() => decrypt(c.replace(/.$/, 'A'))).toThrow();
  });
  let secret;
  let recovery;
  test('activation : secret, confirmation par un premier code, codes de secours', async () => {
    const t = await tokenOf('owner@sec.sn', 'Owner123!');
    const setup = await request(app).post('/api/auth/2fa/setup').set(auth(t));
    expect(setup.status).toBe(200);
    secret = setup.body.secret;
    expect(setup.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\/Boutik:owner%40sec\.sn\?secret=/);
    expect((await request(app).post('/api/auth/2fa/enable').set(auth(t)).send({ code: '000000' })).status).toBe(400);
    const on = await request(app).post('/api/auth/2fa/enable').set(auth(t)).send({ code: totp.totp(secret) });
    expect(on.status).toBe(200);
    recovery = on.body.recoveryCodes;
    expect(recovery).toHaveLength(8);
    const stored = await User.findOne({ email: 'owner@sec.sn' }).select('+twoFactor.secret +twoFactor.recovery');
    expect(stored.twoFactor.secret).not.toContain(secret); // chiffré
    expect(stored.twoFactor.recovery.join('')).not.toContain(recovery[0].replace('-', '')); // seulement des empreintes
  });
  test("la connexion se fait en deux étapes ; le jeton de l'étape 1 n'ouvre aucune session", async () => {
    const step1 = await login('owner@sec.sn', 'Owner123!');
    expect(step1.body.twoFactorRequired).toBe(true);
    expect(step1.body.token).toBeUndefined();
    expect((await request(app).get('/api/auth/profile').set(auth(step1.body.challenge))).status).toBe(401);
    expect((await request(app).post('/api/auth/2fa/verify').send({ challenge: step1.body.challenge, code: '123456' })).status).toBe(401);
    const ok = await request(app).post('/api/auth/2fa/verify').send({ challenge: step1.body.challenge, code: totp.totp(secret) });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ role: 'superadmin', twoFactorEnabled: true });
    expect((await request(app).get('/api/auth/profile').set(auth(ok.body.token))).status).toBe(200);
  });
  test('un code de secours fonctionne une seule fois', async () => {
    const c1 = (await login('owner@sec.sn', 'Owner123!')).body.challenge;
    expect((await request(app).post('/api/auth/2fa/verify').send({ challenge: c1, code: recovery[0] })).status).toBe(200);
    const c2 = (await login('owner@sec.sn', 'Owner123!')).body.challenge;
    expect((await request(app).post('/api/auth/2fa/verify').send({ challenge: c2, code: recovery[0] })).status).toBe(401);
    const status = await request(app).get('/api/auth/security').set(auth(await (async () => { const c = (await login('owner@sec.sn', 'Owner123!')).body.challenge; return (await request(app).post('/api/auth/2fa/verify').send({ challenge: c, code: totp.totp(secret) })).body.token; })()));
    expect(status.body).toMatchObject({ twoFactorEnabled: true, recoveryCodesLeft: 7, staff: true });
  });
  test('un jeton de connexion expiré ou falsifié est refusé', async () => {
    const id = (await User.findOne({ email: 'owner@sec.sn' }))._id;
    const expired = jwt.sign({ id, scope: '2fa' }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await request(app).post('/api/auth/2fa/verify').send({ challenge: expired, code: totp.totp(secret) })).status).toBe(401);
    const noScope = jwt.sign({ id }, process.env.JWT_SECRET);
    expect((await request(app).post('/api/auth/2fa/verify').send({ challenge: noScope, code: totp.totp(secret) })).status).toBe(401);
  });
  test('la désactivation demande le mot de passe ET un code', async () => {
    const c = (await login('owner@sec.sn', 'Owner123!')).body.challenge;
    const t = (await request(app).post('/api/auth/2fa/verify').send({ challenge: c, code: totp.totp(secret) })).body.token;
    expect((await request(app).post('/api/auth/2fa/disable').set(auth(t)).send({ password: 'faux', code: totp.totp(secret) })).status).toBe(400);
    expect((await request(app).post('/api/auth/2fa/disable').set(auth(t)).send({ password: 'Owner123!', code: '000000' })).status).toBe(400);
    expect((await request(app).post('/api/auth/2fa/disable').set(auth(t)).send({ password: 'Owner123!', code: totp.totp(secret) })).status).toBe(200);
    expect((await login('owner@sec.sn', 'Owner123!')).body.token).toBeTruthy();
  });
});

describe('configuration au démarrage', () => {
  const silent = { warn: () => {}, error: () => {} };
  test('en production, un JWT_SECRET faible empêche de démarrer', () => {
    const env = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret';
    expect(checkEnv({ exit: false, log: silent }).problems).toHaveLength(1);
    process.env.JWT_SECRET = 'remplacez_par_une_longue_phrase_secrete_unique';
    expect(checkEnv({ exit: false, log: silent }).problems).toHaveLength(1);
    process.env.JWT_SECRET = 'a'.repeat(20) + 'b'.repeat(20);
    expect(checkEnv({ exit: false, log: silent }).problems).toHaveLength(0);
    Object.assign(process.env, env);
    process.env.NODE_ENV = 'test';
  });
  test('en développement, c’est seulement un avertissement', () => {
    const env = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'court';
    const r = checkEnv({ exit: false, log: silent });
    expect(r.problems).toHaveLength(0);
    expect(r.warnings).toHaveLength(1);
    process.env.JWT_SECRET = env;
    process.env.NODE_ENV = 'test';
  });
});
