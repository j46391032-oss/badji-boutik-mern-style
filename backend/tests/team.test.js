const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const ensureOwner = require('../utils/ensureOwner');

let mongod, owner, sub, client, cat;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Propriétaire', email: 'owner@tm.sn', password: 'Owner123!', role: 'superadmin' },
    { name: 'Client', email: 'client@tm.sn', password: 'Client123!' },
  ]);
  cat = await Category.create({ name: 'Mode' });
  owner = await login('owner@tm.sn', 'Owner123!');
  client = await login('client@tm.sn', 'Client123!');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("sous-espace de l'administrateur du projet", () => {
  test("l'équipe est invisible pour un client et pour un sous-administrateur", async () => {
    expect((await request(app).get('/api/team')).status).toBe(401);
    expect((await request(app).get('/api/team').set(auth(client))).status).toBe(403);
    const created = await request(app).post('/api/team').set(auth(owner)).send({ name: 'Sous Admin', email: 'sub@tm.sn', password: 'Sub12345!', permissions: ['produits'] });
    expect(created.status).toBe(201);
    expect(created.body.role).toBe('admin');
    expect(created.body.permissions).toEqual(['produits']);
    sub = await login('sub@tm.sn', 'Sub12345!');
    expect((await request(app).get('/api/team').set(auth(sub))).status).toBe(403);
    expect((await request(app).get('/api/team/log').set(auth(sub))).status).toBe(403);
    expect((await request(app).post('/api/team').set(auth(sub)).send({ name: 'X', email: 'x@tm.sn', password: 'Xxxxxx1!' })).status).toBe(403);
  });
  test("l'administrateur du projet voit l'équipe et les modules", async () => {
    const res = await request(app).get('/api/team').set(auth(owner));
    expect(res.status).toBe(200);
    expect(res.body.members.map((m) => m.email).sort()).toEqual(['owner@tm.sn', 'sub@tm.sn']);
    expect(Object.keys(res.body.modules)).toContain('commandes');
  });
  test('un email déjà utilisé est refusé, et les droits inconnus sont ignorés', async () => {
    expect((await request(app).post('/api/team').set(auth(owner)).send({ name: 'Doublon', email: 'sub@tm.sn', password: 'Sub12345!' })).status).toBe(400);
    const r = await request(app).post('/api/team').set(auth(owner)).send({ name: 'Bizarre', email: 'b@tm.sn', password: 'Bizarre1!', permissions: ['avis', 'pirate'] });
    expect(r.body.permissions).toEqual(['avis']);
  });
});

describe('droits par module', () => {
  test('un sous-administrateur accède seulement aux modules accordés', async () => {
    const ok = await request(app).post('/api/products').set(auth(sub)).send({ name: 'Chemise', price: 9000, stock: 5, category: cat._id });
    expect(ok.status).toBe(201);
    expect((await request(app).get('/api/orders').set(auth(sub))).status).toBe(403);
    expect((await request(app).get('/api/users').set(auth(sub))).status).toBe(403);
    expect((await request(app).get('/api/stats').set(auth(sub))).status).toBe(403);
    expect((await request(app).put('/api/settings').set(auth(sub)).send({ shippingFee: 1 })).status).toBe(403);
    expect((await request(app).get('/api/stats/summary').set(auth(sub))).status).toBe(200); // pastilles de la barre latérale
  });
  test("l'administrateur du projet a tous les droits", async () => {
    expect((await request(app).get('/api/orders').set(auth(owner))).status).toBe(200);
    expect((await request(app).get('/api/stats').set(auth(owner))).status).toBe(200);
    expect((await request(app).put('/api/settings').set(auth(owner)).send({ shippingFee: 1500 })).status).toBe(200);
  });
  test('modifier les droits prend effet immédiatement, la suspension bloque la connexion', async () => {
    const id = (await User.findOne({ email: 'sub@tm.sn' }))._id;
    await request(app).put(`/api/team/${id}`).set(auth(owner)).send({ permissions: ['produits', 'commandes'] });
    expect((await request(app).get('/api/orders').set(auth(sub))).status).toBe(200);
    await request(app).put(`/api/team/${id}`).set(auth(owner)).send({ blocked: true });
    expect((await request(app).get('/api/orders').set(auth(sub))).status).toBe(403);
    expect((await request(app).post('/api/auth/login').send({ email: 'sub@tm.sn', password: 'Sub12345!' })).status).toBe(403);
    await request(app).put(`/api/team/${id}`).set(auth(owner)).send({ blocked: false, password: 'Nouveau123!' });
    expect((await request(app).post('/api/auth/login').send({ email: 'sub@tm.sn', password: 'Nouveau123!' })).status).toBe(200);
  });
  test("le compte de l'administrateur du projet est protégé, et retirer un membre le rend client", async () => {
    const ownerId = (await User.findOne({ email: 'owner@tm.sn' }))._id;
    expect((await request(app).put(`/api/team/${ownerId}`).set(auth(owner)).send({ blocked: true })).status).toBe(400);
    expect((await request(app).delete(`/api/team/${ownerId}`).set(auth(owner))).status).toBe(400);
    const b = await User.findOne({ email: 'b@tm.sn' });
    expect((await request(app).delete(`/api/team/${b._id}`).set(auth(owner))).status).toBe(200);
    expect((await User.findById(b._id)).role).toBe('client');
  });
});

describe("journal d'activité", () => {
  test('enregistre les modifications du personnel, sans mot de passe, et reste privé', async () => {
    await wait(300);
    const res = await request(app).get('/api/team/log').set(auth(owner));
    expect(res.status).toBe(200);
    const actions = res.body.items.map((l) => l.action);
    expect(actions).toContain('Création — Produits');
    expect(actions).toContain('Création — Équipe');
    expect(JSON.stringify(res.body)).not.toMatch(/Sub12345|Nouveau123/);
    const bySub = await request(app).get(`/api/team/log?module=Produits`).set(auth(owner));
    expect(bySub.body.items.every((l) => l.module === 'Produits')).toBe(true);
    expect(await AuditLog.countDocuments({ userName: 'Client' })).toBe(0);
  });
});

describe('administrateur du projet automatique', () => {
  test("promeut l'administrateur le plus ancien quand aucun propriétaire n'existe", async () => {
    await User.updateOne({ email: 'owner@tm.sn' }, { role: 'admin' });
    const o = await ensureOwner();
    expect(o.role).toBe('superadmin');
    expect(await ensureOwner()).toBeNull(); // déjà un propriétaire
  });
});
