const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const { computeShipping } = require('../utils/pricing');

let mongod, admin, client, cat, tiered;
const address = { fullName: 'Amadou Diop', phone: '770000000', address: 'Plateau', city: 'Dakar' };
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;
const buy = (token, product, quantity, extra = {}) =>
  request(app).post('/api/orders').set(auth(token)).send({ items: [{ product: product._id, quantity }], shippingAddress: address, ...extra });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Admin', email: 'admin@mk.sn', password: 'Admin123!', role: 'admin' },
    { name: 'Client', email: 'client@mk.sn', password: 'Client123!' },
  ]);
  cat = await Category.create({ name: 'Mode', icon: '👕' });
  tiered = await Product.create({
    name: 'T-shirt', price: 6000, oldPrice: 8000, stock: 100, category: cat._id, moq: 2, freeShipping: false,
    priceTiers: [{ minQty: 10, price: 5000 }, { minQty: 50, price: 4000 }],
  });
  await Product.create({ name: 'Casque', brand: 'Sonic', price: 25000, stock: 3, category: cat._id, freeShipping: true, sold: 50 });
  admin = await login('admin@mk.sn', 'Admin123!');
  client = await login('client@mk.sn', 'Client123!');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('prix dégressifs, quantité minimum et livraison', () => {
  test('applique le prix du palier et calcule la remise affichée', async () => {
    const res = await buy(client, tiered, 10);
    expect(res.status).toBe(201);
    expect(res.body.items[0].price).toBe(5000);
    expect(res.body.totalAmount).toBe(50000);
    expect(res.body.history[0].status).toBe('En attente');
    const p = await request(app).get(`/api/products/${tiered._id}`);
    expect(p.body.discountPercent).toBe(25);
  });
  test('refuse une quantité inférieure au minimum', async () => {
    const res = await buy(client, tiered, 1);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimum/i);
  });
  test('ajoute les frais de livraison, sauf au-dessus du seuil ou en livraison gratuite', async () => {
    await request(app).put('/api/settings').set(auth(admin)).send({ shippingFee: 2000, freeShippingThreshold: 50000 });
    const small = await buy(client, tiered, 2);
    expect(small.body.shippingFee).toBe(2000);
    expect(small.body.totalAmount).toBe(12000 + 2000);
    const big = await buy(client, tiered, 20); // 20 x 5000 = 100000
    expect(big.body.shippingFee).toBe(0);
    const casque = await Product.findOne({ name: 'Casque' });
    expect((await buy(client, casque, 1)).body.shippingFee).toBe(0);
  });
  test("computeShipping : pas de frais si aucun tarif n'est défini", () => {
    expect(computeShipping({}, [{ freeShipping: false }], 100)).toBe(0);
    expect(computeShipping({ shippingFee: 1500 }, [{ freeShipping: false }], 100)).toBe(1500);
  });
  test('les ventes sont comptées puis annulées avec la commande', async () => {
    const before = (await Product.findById(tiered._id)).sold;
    const res = await buy(client, tiered, 3);
    expect((await Product.findById(tiered._id)).sold).toBe(before + 3);
    await request(app).put(`/api/orders/${res.body._id}`).set(auth(client)).send({ status: 'Annulée' });
    expect((await Product.findById(tiered._id)).sold).toBe(before);
  });
});

describe('catalogue : filtres, tri et pagination', () => {
  test('filtre promo, livraison gratuite et marque', async () => {
    const promo = await request(app).get('/api/products?promo=1');
    expect(promo.body.map((p) => p.name)).toEqual(['T-shirt']);
    const free = await request(app).get('/api/products?freeShipping=1');
    expect(free.body.map((p) => p.name)).toEqual(['Casque']);
    const brand = await request(app).get('/api/products?search=sonic');
    expect(brand.body).toHaveLength(1);
  });
  test('pagine quand page est fourni et trie par ventes', async () => {
    const res = await request(app).get('/api/products?page=1&limit=1&sort=best');
    expect(res.body.total).toBe(2);
    expect(res.body.pages).toBe(2);
    expect(res.body.items[0].name).toBe('Casque');
  });
  test('un produit masqué est invisible du public mais visible par un admin', async () => {
    const hidden = await Product.create({ name: 'Secret', price: 1, stock: 1, category: cat._id, published: false });
    expect((await request(app).get(`/api/products/${hidden._id}`)).status).toBe(404);
    expect((await request(app).get('/api/products')).body.some((p) => p.name === 'Secret')).toBe(false);
    expect((await request(app).get(`/api/products/${hidden._id}`).set(auth(admin))).status).toBe(200);
    expect((await request(app).get('/api/products?all=1&published=0').set(auth(admin))).body).toHaveLength(1);
    const order = await buy(client, hidden, 1);
    expect(order.status).toBe(400);
  });
  test("refuse un ancien prix inférieur au prix", async () => {
    const res = await request(app).post('/api/products').set(auth(admin)).send({ name: 'X', price: 5000, oldPrice: 4000, stock: 1, category: cat._id });
    expect(res.status).toBe(400);
  });
  test('les catégories renvoient le nombre de produits', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.body[0].count).toBeGreaterThanOrEqual(2);
  });
});

describe('devis et messages', () => {
  let id;
  test('un client crée une demande, le vendeur répond', async () => {
    const res = await request(app).post('/api/inquiries').set(auth(client)).send({ type: 'devis', product: tiered._id, quantity: 200, message: 'Prix pour 200 ?' });
    expect(res.status).toBe(201);
    id = res.body._id;
    expect(res.body.productName).toBe('T-shirt');
    const reply = await request(app).post(`/api/inquiries/${id}/messages`).set(auth(admin)).send({ text: '4 000 FCFA pièce' });
    expect(reply.body.status).toBe('Répondu');
    expect(reply.body.unreadByClient).toBe(true);
    const read = await request(app).get(`/api/inquiries/${id}`).set(auth(client));
    expect(read.body.messages).toHaveLength(2);
  });
  test("un autre client n'y a pas accès", async () => {
    await User.create({ name: 'Autre', email: 'autre@mk.sn', password: 'Autre123!' });
    const other = await login('autre@mk.sn', 'Autre123!');
    expect((await request(app).get(`/api/inquiries/${id}`).set(auth(other))).status).toBe(403);
    expect((await request(app).get('/api/inquiries').set(auth(other))).status).toBe(403);
  });
  test('la liste admin et les statuts', async () => {
    expect((await request(app).get('/api/inquiries').set(auth(admin))).body).toHaveLength(1);
    expect((await request(app).put(`/api/inquiries/${id}`).set(auth(admin)).send({ status: 'Clos' })).body.status).toBe('Clos');
    expect((await request(app).post(`/api/inquiries/${id}/messages`).set(auth(client)).send({ text: 'encore ?' })).status).toBe(400);
  });
});

describe('administration', () => {
  test('les statistiques contiennent les indicateurs de période', async () => {
    const res = await request(app).get('/api/stats?days=7').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.salesByDay).toHaveLength(7);
    expect(res.body.period.orders).toBeGreaterThan(0);
    expect(res.body.period.prev).toBeDefined();
    expect(Array.isArray(res.body.lowStock)).toBe(true);
    const summary = await request(app).get('/api/stats/summary').set(auth(admin));
    expect(summary.body.pendingOrders).toBeGreaterThan(0);
  });
  test('liste paginée des commandes avec compteurs, recherche et export CSV', async () => {
    const res = await request(app).get('/api/orders?page=1&limit=2').set(auth(admin));
    expect(res.body.items).toHaveLength(2);
    expect(res.body.counts['En attente']).toBeGreaterThan(0);
    const byNumber = await request(app).get(`/api/orders?q=${res.body.items[0].orderNumber}`).set(auth(admin));
    expect(byNumber.body.some((o) => o.orderNumber === res.body.items[0].orderNumber)).toBe(true);
    const csv = await request(app).get('/api/orders/export').set(auth(admin));
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toMatch(/Statut/);
  });
  test('note interne et historique des statuts', async () => {
    const o = (await request(app).get('/api/orders').set(auth(admin))).body[0];
    const noted = await request(app).put(`/api/orders/${o._id}`).set(auth(admin)).send({ adminNote: 'Appeler le client' });
    expect(noted.body.adminNote).toBe('Appeler le client');
    const next = await request(app).put(`/api/orders/${o._id}`).set(auth(admin)).send({ status: 'Confirmée' });
    expect(next.body.history.map((h) => h.status)).toContain('Confirmée');
  });
  test('clients : total dépensé, suspension et connexion refusée', async () => {
    const list = await request(app).get('/api/users?q=client@mk').set(auth(admin));
    const me = list.body.items[0];
    expect(me.orders).toBeGreaterThan(0);
    expect((await request(app).put(`/api/users/${me._id}`).set(auth(admin)).send({ blocked: true })).body.blocked).toBe(true);
    expect((await request(app).post('/api/auth/login').send({ email: 'client@mk.sn', password: 'Client123!' })).status).toBe(403);
    expect((await request(app).get('/api/orders/mine').set(auth(client))).status).toBe(403);
    await request(app).put(`/api/users/${me._id}`).set(auth(admin)).send({ blocked: false });
  });
  test("bannières : le public ne voit que les actives, l'admin voit tout", async () => {
    await request(app).post('/api/banners').set(auth(admin)).send({ title: 'Active' });
    await request(app).post('/api/banners').set(auth(admin)).send({ title: 'Cachée', active: false });
    expect((await request(app).get('/api/banners')).body).toHaveLength(1);
    expect((await request(app).get('/api/banners?all=1').set(auth(admin))).body).toHaveLength(2);
    expect((await request(app).post('/api/banners').set(auth(client)).send({ title: 'x' })).status).toBe(403);
  });
  test('vendeurs et réglages : réservés aux administrateurs', async () => {
    expect((await request(app).get('/api/suppliers').set(auth(client))).status).toBe(403);
    const s = await request(app).post('/api/suppliers').set(auth(admin)).send({ name: 'Teranga', verified: true, markets: 'Sénégal, Mali' });
    expect(s.body.markets).toEqual(['Sénégal', 'Mali']);
    expect((await request(app).put('/api/settings').set(auth(client)).send({ shippingFee: 1 })).status).toBe(403);
    expect((await Settings.get()).shippingFee).toBe(2000);
  });
});
