const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

let mongod, admin, client, product;
const address = { fullName: 'Amadou Diop', phone: '770000000', address: 'Plateau', city: 'Dakar' };
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;
const order = (token, qty = 1, extra = {}) =>
  request(app).post('/api/orders').set(auth(token)).send({ items: [{ product: product._id, quantity: qty }], shippingAddress: address, ...extra });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Admin', email: 'admin@test.sn', password: 'Admin123!', role: 'admin' },
    { name: 'Client', email: 'client@test.sn', password: 'Client123!' },
  ]);
  const cat = await Category.create({ name: 'Test' });
  product = await Product.create({ name: 'Casque', price: 10000, stock: 10, category: cat._id });
  admin = await login('admin@test.sn', 'Admin123!');
  client = await login('client@test.sn', 'Client123!');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('authentification', () => {
  test("l'inscription ne permet pas de choisir le rôle admin", async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@test.sn', password: 'Secret123', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('client');
  });
  test('refuse un mauvais mot de passe', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'client@test.sn', password: 'faux' })).status).toBe(401);
  });
  test("les routes admin sont interdites aux clients", async () => {
    expect((await request(app).get('/api/stats').set(auth(client))).status).toBe(403);
    expect((await request(app).get('/api/coupons').set(auth(client))).status).toBe(403);
    expect((await request(app).get('/api/stats')).status).toBe(401);
  });
});

describe('commandes et stock', () => {
  test('recalcule le total côté serveur et décrémente le stock', async () => {
    const res = await order(client, 2);
    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(20000);
    expect((await Product.findById(product._id)).stock).toBe(8);
  });
  test('refuse une quantité supérieure au stock', async () => {
    expect((await order(client, 999)).status).toBe(400);
    expect((await Product.findById(product._id)).stock).toBe(8);
  });
  test("l'annulation remet le stock en vente", async () => {
    const created = (await order(client, 3)).body;
    expect((await Product.findById(product._id)).stock).toBe(5);
    const res = await request(app).put(`/api/orders/${created._id}`).set(auth(client)).send({ status: 'Annulée' });
    expect(res.status).toBe(200);
    expect((await Product.findById(product._id)).stock).toBe(8);
  });
});

describe('codes promo', () => {
  let coupon;
  beforeAll(async () => {
    const res = await request(app).post('/api/coupons').set(auth(admin)).send({ code: 'promo10', type: 'percent', value: 10, maxUses: 1 });
    expect(res.status).toBe(201);
    coupon = res.body;
  });

  test('le code est enregistré en majuscules et validé', async () => {
    expect(coupon.code).toBe('PROMO10');
    const res = await request(app).post('/api/coupons/validate').set(auth(client)).send({ code: 'promo10', subtotal: 20000 });
    expect(res.body.discount).toBe(2000);
  });
  test('la remise est appliquée à la commande et le code est consommé', async () => {
    const res = await order(client, 1, { couponCode: 'promo10' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ subtotal: 10000, discount: 1000, totalAmount: 9000, couponCode: 'PROMO10' });
    expect((await Coupon.findById(coupon._id)).usedCount).toBe(1);
  });
  test('un code épuisé est refusé sans toucher au stock', async () => {
    const before = (await Product.findById(product._id)).stock;
    expect((await order(client, 1, { couponCode: 'PROMO10' })).status).toBe(400);
    expect((await Product.findById(product._id)).stock).toBe(before);
  });
  test("annuler la commande rend l'utilisation du code", async () => {
    const used = await request(app).get('/api/orders/mine').set(auth(client));
    const o = used.body.find((x) => x.couponCode === 'PROMO10');
    await request(app).put(`/api/orders/${o._id}`).set(auth(client)).send({ status: 'Annulée' });
    expect((await Coupon.findById(coupon._id)).usedCount).toBe(0);
  });
  test('un code inconnu est refusé', async () => {
    expect((await order(client, 1, { couponCode: 'NOPE' })).status).toBe(400);
  });
});

describe('avis', () => {
  test('impossible de noter avant la livraison', async () => {
    const res = await request(app).post(`/api/products/${product._id}/reviews`).set(auth(client)).send({ rating: 5 });
    expect(res.status).toBe(403);
  });
  test('après livraison : avis créé, moyenne mise à jour, un seul avis par client', async () => {
    const created = (await order(client, 1)).body;
    await request(app).put(`/api/orders/${created._id}`).set(auth(admin)).send({ status: 'Livrée' });

    const r1 = await request(app).post(`/api/products/${product._id}/reviews`).set(auth(client)).send({ rating: 5, comment: 'Super' });
    expect(r1.status).toBe(201);
    await request(app).post(`/api/products/${product._id}/reviews`).set(auth(client)).send({ rating: 3 });

    const list = await request(app).get(`/api/products/${product._id}/reviews`);
    expect(list.body).toHaveLength(1);
    const p = await Product.findById(product._id);
    expect(p.ratingCount).toBe(1);
    expect(p.ratingAvg).toBe(3);
  });
  test('refuse une note hors limites', async () => {
    expect((await request(app).post(`/api/products/${product._id}/reviews`).set(auth(client)).send({ rating: 9 })).status).toBe(400);
  });
  test("l'auteur peut supprimer son avis et la moyenne est recalculée", async () => {
    const [review] = (await request(app).get(`/api/products/${product._id}/reviews`)).body;
    expect((await request(app).delete(`/api/reviews/${review._id}`).set(auth(client))).status).toBe(200);
    expect((await Product.findById(product._id)).ratingCount).toBe(0);
  });
});

describe('favoris', () => {
  test('ajout idempotent puis retrait', async () => {
    await request(app).put(`/api/favorites/${product._id}`).set(auth(client));
    const res = await request(app).put(`/api/favorites/${product._id}`).set(auth(client));
    expect(res.body.favorites).toHaveLength(1);
    const list = await request(app).get('/api/favorites').set(auth(client));
    expect(list.body[0].name).toBe('Casque');
    const del = await request(app).delete(`/api/favorites/${product._id}`).set(auth(client));
    expect(del.body.favorites).toHaveLength(0);
  });
  test('refuse un produit inexistant', async () => {
    expect((await request(app).put(`/api/favorites/${new mongoose.Types.ObjectId()}`).set(auth(client))).status).toBe(404);
  });
});

describe('statistiques', () => {
  test('30 jours de ventes, meilleurs produits et statuts', async () => {
    const res = await request(app).get('/api/stats').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.salesByDay).toHaveLength(30);
    expect(res.body.topProducts[0].name).toBe('Casque');
    expect(res.body.ordersByStatus.Livrée).toBeGreaterThanOrEqual(1);
  });
});
