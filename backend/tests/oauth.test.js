const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');

let mongod;
const realFetch = global.fetch;
const SITE = 'http://localhost:5173';

// Faux fournisseurs : on simule les réponses de Google, Facebook et GitHub
let profiles;
const fakeFetch = async (url, opts = {}) => {
  const u = String(url);
  const ok = (body) => ({ ok: true, status: 200, json: async () => body });
  if (u.includes('googleapis.com/oauth2/v3/userinfo')) return ok(profiles.google);
  if (u.includes('graph.facebook.com/me')) return ok(profiles.facebook);
  if (u.endsWith('api.github.com/user')) return ok(profiles.github);
  if (u.endsWith('api.github.com/user/emails')) return ok(profiles.githubEmails);
  if (u.includes('/token') || u.includes('access_token') || u.includes('oauth2.googleapis.com/token') || u.includes('login/oauth/access_token')) return ok({ access_token: 'tok' });
  return { ok: false, status: 404, json: async () => ({}) };
};

// parcourt le flux complet : démarrage, passage chez le fournisseur (simulé), retour
async function signIn(provider) {
  const start = await request(app).get(`/api/auth/oauth/${provider}?redirect=${encodeURIComponent(SITE)}`);
  const cookie = start.headers['set-cookie'][0].split(';')[0];
  const state = new URL(start.headers.location).searchParams.get('state');
  const cb = await request(app).get(`/api/auth/oauth/${provider}/callback?code=abc&state=${state}`).set('Cookie', cookie);
  return { start, cb, state, cookie };
}
const tokenOf = (cb) => new URLSearchParams(new URL(cb.headers.location).hash.slice(1)).get('token');
const errorOf = (cb) => new URL(cb.headers.location).searchParams.get('oauth_error');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  global.fetch = fakeFetch;
  process.env.GOOGLE_CLIENT_ID = 'gid';
  process.env.GOOGLE_CLIENT_SECRET = 'gsecret';
  process.env.GITHUB_CLIENT_ID = 'hid';
  process.env.GITHUB_CLIENT_SECRET = 'hsecret';
  delete process.env.FACEBOOK_APP_ID;
  delete process.env.FACEBOOK_APP_SECRET;
  process.env.CLIENT_URL = SITE;
  await User.create([
    { name: 'Admin', email: 'admin@oa.sn', password: 'Admin123!', role: 'superadmin' },
    { name: 'Client Existant', email: 'client@oa.sn', password: 'Client123!' },
  ]);
});

beforeEach(() => {
  profiles = {
    google: { sub: 'g-1', email: 'awa@gmail.com', email_verified: true, name: 'Awa Diallo', picture: 'http://img/awa.png' },
    facebook: { id: 'f-1', name: 'Cheikh Fall', email: 'cheikh@fb.com', picture: { data: { url: 'http://img/c.png' } } },
    github: { id: 'h-1', login: 'moussa', name: 'Moussa Ba' },
    githubEmails: [{ email: 'old@x.com', primary: false, verified: true }, { email: 'moussa@dev.sn', primary: true, verified: true }],
  };
});

afterAll(async () => {
  global.fetch = realFetch;
  await mongoose.disconnect();
  await mongod.stop();
});

describe('fournisseurs disponibles', () => {
  test('indique ceux qui sont configurés', async () => {
    const res = await request(app).get('/api/auth/providers');
    expect(res.body).toEqual({ google: true, facebook: false, github: true });
  });
  test('un fournisseur non configuré renvoie vers la page de connexion avec un message', async () => {
    const res = await request(app).get(`/api/auth/oauth/facebook?redirect=${encodeURIComponent(SITE)}`);
    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.origin + url.pathname).toBe(`${SITE}/connexion`);
    expect(url.searchParams.get('oauth_error')).toBe('not_configured');
    expect(new URL((await request(app).get('/api/auth/oauth/twitter')).headers.location).searchParams.get('oauth_error')).toBe('unknown_provider');
  });
});

describe('connexion avec Google', () => {
  test("redirige vers Google avec l'identifiant, l'adresse de retour et un état signé", async () => {
    const res = await request(app).get(`/api/auth/oauth/google?redirect=${encodeURIComponent(SITE)}&from=/panier`);
    const url = new URL(res.headers.location);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('gid');
    expect(url.searchParams.get('redirect_uri')).toMatch(/\/api\/auth\/oauth\/google\/callback$/);
    expect(url.searchParams.get('scope')).toContain('email');
    const state = jwt.verify(url.searchParams.get('state'), process.env.JWT_SECRET);
    expect(state).toMatchObject({ p: 'google', o: SITE, r: '/panier' });
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  });
  test('crée le compte au premier passage puis le retrouve ensuite', async () => {
    const first = await signIn('google');
    expect(first.cb.status).toBe(302);
    expect(first.cb.headers.location.startsWith(`${SITE}/auth/callback#`)).toBe(true);
    const profile = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${tokenOf(first.cb)}`);
    expect(profile.body).toMatchObject({ name: 'Awa Diallo', email: 'awa@gmail.com', role: 'client', avatar: 'http://img/awa.png' });
    const again = await signIn('google');
    expect(tokenOf(again.cb)).toBeTruthy();
    expect(await User.countDocuments({ email: 'awa@gmail.com' })).toBe(1);
  });
  test("un compte social n'a pas de mot de passe : la connexion classique l'explique", async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'awa@gmail.com', password: 'nimporte' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Google/);
  });
  test('rattache le compte à un client existant ayant le même email vérifié', async () => {
    profiles.google = { sub: 'g-2', email: 'client@oa.sn', email_verified: true, name: 'Client Existant' };
    const { cb } = await signIn('google');
    expect(tokenOf(cb)).toBeTruthy();
    const user = await User.findOne({ email: 'client@oa.sn' }).select('+password');
    expect(user.providers).toHaveLength(1);
    expect(user.password).toBeTruthy(); // il peut toujours utiliser son mot de passe
    expect(await User.countDocuments({ email: 'client@oa.sn' })).toBe(1);
  });
  test("ne rattache jamais un compte administrateur par simple email", async () => {
    profiles.google = { sub: 'g-3', email: 'admin@oa.sn', email_verified: true, name: 'Pirate' };
    const { cb } = await signIn('google');
    expect(errorOf(cb)).toBe('use_password');
    expect(tokenOf(cb)).toBeFalsy();
    expect((await User.findOne({ email: 'admin@oa.sn' })).providers).toHaveLength(0);
  });
  test("un compte du personnel déjà lié à Google ne peut pas non plus se connecter sans mot de passe", async () => {
    await User.updateOne({ email: 'admin@oa.sn' }, { $push: { providers: { provider: 'google', providerId: 'g-admin' } } });
    profiles.google = { sub: 'g-admin', email: 'admin@oa.sn', email_verified: true, name: 'Admin' };
    const { cb } = await signIn('google');
    expect(errorOf(cb)).toBe('use_password');
    expect(tokenOf(cb)).toBeFalsy();
    await User.updateOne({ email: 'admin@oa.sn' }, { $set: { providers: [] } });
  });
  test("refuse un email non vérifié et un compte sans email", async () => {
    profiles.google = { sub: 'g-4', email: 'client@oa.sn', email_verified: false, name: 'X' };
    expect(errorOf((await signIn('google')).cb)).toBe('unverified_email');
    profiles.google = { sub: 'g-5', name: 'Sans email' };
    expect(errorOf((await signIn('google')).cb)).toBe('no_email');
  });
  test('un compte suspendu ne peut pas se connecter', async () => {
    await User.updateOne({ email: 'awa@gmail.com' }, { blocked: true });
    expect(errorOf((await signIn('google')).cb)).toBe('blocked');
    await User.updateOne({ email: 'awa@gmail.com' }, { blocked: false });
  });
});

describe('sécurité du retour', () => {
  test('refuse un état falsifié, un cookie manquant et un refus de l’utilisateur', async () => {
    const { state, cookie } = await signIn('google');
    expect(errorOf(await request(app).get('/api/auth/oauth/google/callback?code=abc&state=faux'))).toBe('invalid_state');
    expect(errorOf(await request(app).get(`/api/auth/oauth/google/callback?code=abc&state=${state}`))).toBe('invalid_state'); // pas de cookie
    expect(errorOf(await request(app).get(`/api/auth/oauth/google/callback?code=abc&state=${state}`).set('Cookie', 'oauth_nonce=autre'))).toBe('invalid_state');
    const s2 = await request(app).get(`/api/auth/oauth/google?redirect=${encodeURIComponent(SITE)}`);
    const st = new URL(s2.headers.location).searchParams.get('state');
    const denied = await request(app).get(`/api/auth/oauth/google/callback?error=access_denied&state=${st}`).set('Cookie', s2.headers['set-cookie'][0].split(';')[0]);
    expect(errorOf(denied)).toBe('access_denied');
    expect(cookie).toBeTruthy();
  });
  test("un état Google ne sert pas pour GitHub", async () => {
    const s = await request(app).get(`/api/auth/oauth/google?redirect=${encodeURIComponent(SITE)}`);
    const st = new URL(s.headers.location).searchParams.get('state');
    const res = await request(app).get(`/api/auth/oauth/github/callback?code=abc&state=${st}`).set('Cookie', s.headers['set-cookie'][0].split(';')[0]);
    expect(errorOf(res)).toBe('invalid_state');
  });
  test("ne renvoie que vers les adresses autorisées (CLIENT_URL)", async () => {
    const res = await request(app).get('/api/auth/oauth/google?redirect=https://pirate.example');
    const state = jwt.verify(new URL(res.headers.location).searchParams.get('state'), process.env.JWT_SECRET);
    expect(state.o).toBe(SITE);
  });
  test("si le fournisseur échoue, l'utilisateur revient avec un message", async () => {
    const before = global.fetch;
    global.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: 'boom' }) });
    const { cb } = await signIn('google');
    global.fetch = before;
    expect(errorOf(cb)).toBe('failed');
  });
});

describe('connexion avec GitHub et Facebook', () => {
  test("GitHub : prend l'email principal et vérifié, même si le profil est privé", async () => {
    const { cb } = await signIn('github');
    const profile = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${tokenOf(cb)}`);
    expect(profile.body).toMatchObject({ name: 'Moussa Ba', email: 'moussa@dev.sn' });
  });
  test('GitHub sans email vérifié : refusé proprement', async () => {
    profiles.github = { id: 'h-9', login: 'anon', name: 'Anon' };
    profiles.githubEmails = [{ email: 'x@y.z', primary: true, verified: false }];
    expect(errorOf((await signIn('github')).cb)).toBe('no_email');
  });
  test('Facebook fonctionne dès que ses identifiants sont renseignés', async () => {
    process.env.FACEBOOK_APP_ID = 'fid';
    process.env.FACEBOOK_APP_SECRET = 'fsecret';
    const { cb } = await signIn('facebook');
    const profile = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${tokenOf(cb)}`);
    expect(profile.body).toMatchObject({ name: 'Cheikh Fall', email: 'cheikh@fb.com', avatar: 'http://img/c.png' });
    expect((await request(app).get('/api/auth/providers')).body.facebook).toBe(true);
  });
});
