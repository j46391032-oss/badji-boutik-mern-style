const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Market = require('../models/Market');
const ensureMarkets = require('../utils/ensureMarkets');

let mongod, admin, seller, cats, official, shopProduct;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Admin', email: 'admin@mq.sn', password: 'Admin123!', role: 'superadmin' },
    { name: 'Fatou', email: 'fatou@mq.sn', password: 'Fatou123!' },
  ]);
  cats = Object.fromEntries((await Category.create([{ name: 'Vêtements' }, { name: 'Électronique' }, { name: 'Maison' }])).map((c) => [c.name, c]));
  official = await Product.create({ name: 'Article officiel', price: 5000, stock: 10, category: cats['Électronique']._id });
  await ensureMarkets();
  admin = await login('admin@mq.sn', 'Admin123!');
  seller = await login('fatou@mq.sn', 'Fatou123!');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('les cinq marchés', () => {
  test('sont installés avec leurs catégories, sans doublon au redémarrage', async () => {
    await ensureMarkets();
    const res = await request(app).get('/api/markets');
    expect(res.status).toBe(200);
    expect(res.body.map((m) => m.slug)).toEqual(['sandaga', 'hlm', 'kermel', 'colobane', 'soumbedioune']);
    const hlm = res.body.find((m) => m.slug === 'hlm');
    expect(hlm.categories.map((c) => c.name)).toEqual(['Vêtements']); // seules les catégories qui existent sont liées
    expect(hlm).toMatchObject({ shops: 0, products: 0 });
    expect((await request(app).get('/api/markets/inconnu')).status).toBe(404);
  });
  test('seul un administrateur les modifie', async () => {
    const m = await Market.findOne({ slug: 'kermel' });
    expect((await request(app).put(`/api/markets/${m._id}`).set(auth(seller)).send({ name: 'X' })).status).toBe(403);
    const ok = await request(app).put(`/api/markets/${m._id}`).set(auth(admin)).send({ description: 'Frais du jour', color: '#00aa00' });
    expect(ok.body).toMatchObject({ description: 'Frais du jour', slug: 'kermel' });
    const created = await request(app).post('/api/markets').set(auth(admin)).send({ name: 'Marché Tilène' });
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe('marche-tilene');
    expect((await request(app).delete(`/api/markets/${created.body._id}`).set(auth(admin))).status).toBe(200);
  });
});

describe('ouvrir une boutique dans un marché', () => {
  test('le marché est obligatoire', async () => {
    const res = await request(app).post('/api/seller/shop').set(auth(seller)).send({ name: 'Fatou Mode' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/marché/i);
    expect((await request(app).post('/api/seller/shop').set(auth(seller)).send({ name: 'Fatou Mode', market: 'nulle-part' })).status).toBe(400);
  });
  test('la boutique est rangée dans son marché et ses produits aussi', async () => {
    const res = await request(app).post('/api/seller/shop').set(auth(seller)).send({ name: 'Fatou Mode', market: 'hlm' });
    expect(res.status).toBe(201);
    expect(res.body.market.slug).toBe('hlm');
    const shop = await Supplier.findOne({ name: 'Fatou Mode' });
    await request(app).put(`/api/shops/${shop._id}/status`).set(auth(admin)).send({ status: 'approved' });
    const p = await request(app).post('/api/seller/products').set(auth(seller)).send({ name: 'Boubou', price: 30000, stock: 5, category: cats['Vêtements']._id });
    expect(p.status).toBe(201);
    shopProduct = await Product.findById(p.body._id);
    expect(shopProduct.origin).toBe('market');
    expect(String(shopProduct.market)).toBe(String(shop.market));
  });
  test("on ne vend dans un marché que les catégories de ce marché", async () => {
    const res = await request(app).post('/api/seller/products').set(auth(seller)).send({ name: 'Télévision', price: 90000, stock: 2, category: cats['Électronique']._id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Marché HLM ne vend que : Vêtements/);
    const move = await request(app).put(`/api/seller/products/${shopProduct._id}`).set(auth(seller)).send({ category: cats['Électronique']._id });
    expect(move.status).toBe(400);
  });
  test("changer de marché n'est possible qu'avant d'avoir des produits", async () => {
    const res = await request(app).put('/api/seller/shop').set(auth(seller)).send({ market: 'colobane' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/administrateur/);
    const shop = await Supplier.findOne({ name: 'Fatou Mode' });
    const colobane = await Market.findOne({ slug: 'colobane' });
    const ok = await request(app).put(`/api/shops/${shop._id}`).set(auth(admin)).send({ market: colobane._id });
    expect(ok.status).toBe(200);
    expect(String((await Product.findById(shopProduct._id)).market)).toBe(String(colobane._id)); // les produits suivent
    await request(app).put(`/api/shops/${shop._id}`).set(auth(admin)).send({ market: (await Market.findOne({ slug: 'hlm' }))._id });
  });
});

describe('deux parties : boutique officielle et marchés', () => {
  test('le catalogue se filtre par partie et par marché', async () => {
    const all = (await request(app).get('/api/products')).body.map((p) => p.name).sort();
    expect(all).toEqual(['Article officiel', 'Boubou']);
    expect((await request(app).get('/api/products?scope=official')).body.map((p) => p.name)).toEqual(['Article officiel']);
    expect((await request(app).get('/api/products?scope=market')).body.map((p) => p.name)).toEqual(['Boubou']);
    expect((await request(app).get('/api/products?market=hlm')).body.map((p) => p.name)).toEqual(['Boubou']);
    expect((await request(app).get('/api/products?market=colobane')).body).toEqual([]);
    expect((await request(app).get('/api/products?market=n-existe-pas')).body).toEqual([]);
  });
  test('la page du marché montre ses boutiques avec leur vitrine', async () => {
    const res = await request(app).get('/api/markets/hlm');
    expect(res.body.shops).toHaveLength(1);
    expect(res.body.shops[0]).toMatchObject({ name: 'Fatou Mode', products: 1 });
    expect(res.body.shops[0].showcase[0].name).toBe('Boubou');
    const list = (await request(app).get('/api/markets')).body.find((m) => m.slug === 'hlm');
    expect(list).toMatchObject({ shops: 1, products: 1 });
  });
  test('un produit rattaché par l’administrateur à une boutique rejoint son marché', async () => {
    const shop = await Supplier.findOne({ name: 'Fatou Mode' });
    const r = await request(app).put(`/api/products/${official._id}`).set(auth(admin)).send({ supplier: shop._id });
    expect(r.status).toBe(200);
    const p = await Product.findById(official._id);
    expect(p.origin).toBe('market');
    expect(String(p.market)).toBe(String(shop.market));
    await request(app).put(`/api/products/${official._id}`).set(auth(admin)).send({ supplier: null });
    expect((await Product.findById(official._id)).origin).toBe('official');
  });
  test("l'annuaire des boutiques se filtre par marché", async () => {
    expect((await request(app).get('/api/suppliers/directory?market=hlm')).body.map((s) => s.name)).toEqual(['Fatou Mode']);
    expect((await request(app).get('/api/suppliers/directory?market=kermel')).body).toEqual([]);
  });
  test('suspendre une boutique la retire de son marché', async () => {
    const shop = await Supplier.findOne({ name: 'Fatou Mode' });
    await request(app).put(`/api/shops/${shop._id}/status`).set(auth(admin)).send({ status: 'suspended' });
    expect((await request(app).get('/api/markets/hlm')).body.shops).toHaveLength(0);
    expect((await request(app).get('/api/products?market=hlm')).body).toEqual([]);
    expect((await request(app).delete(`/api/markets/${(await Market.findOne({ slug: 'hlm' }))._id}`).set(auth(admin))).status).toBe(400); // contient encore une boutique
  });
});
