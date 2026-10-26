const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const Coupon = require('../models/Coupon');
const Inquiry = require('../models/Inquiry');
const Market = require('../models/Market');

let mongod, admin, fatou, moussa, client, cat, platformProduct;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;
const address = { fullName: 'Amadou Diop', phone: '770000000', address: 'Plateau', city: 'Dakar' };
const order = (items, extra = {}) => request(app).post('/api/orders').set(auth(client)).send({ items, shippingAddress: address, ...extra });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Admin', email: 'admin@mk.sn', password: 'Admin123!', role: 'superadmin' },
    { name: 'Fatou', email: 'fatou@mk.sn', password: 'Fatou123!' },
    { name: 'Moussa', email: 'moussa@mk.sn', password: 'Moussa123!' },
    { name: 'Client', email: 'client@mk.sn', password: 'Client123!' },
  ]);
  cat = await Category.create({ name: 'Mode' });
  await Market.create({ name: 'Marché Test', slug: 'test', categories: [cat._id] }); // chaque boutique s'ouvre dans un marché
  platformProduct = await Product.create({ name: 'Article plateforme', price: 10000, stock: 50, category: cat._id });
  await Settings.get();
  admin = await login('admin@mk.sn', 'Admin123!');
  fatou = await login('fatou@mk.sn', 'Fatou123!');
  moussa = await login('moussa@mk.sn', 'Moussa123!');
  client = await login('client@mk.sn', 'Client123!');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('ouverture de boutique', () => {
  test("un client ouvre sa boutique : elle est en attente de validation et il ne peut pas encore publier", async () => {
    expect((await request(app).post('/api/seller/shop').send({ name: 'Sans compte' })).status).toBe(401);
    expect((await request(app).post('/api/seller/shop').set(auth(fatou)).send({ name: 'ab' })).status).toBe(400);
    const res = await request(app).post('/api/seller/shop').set(auth(fatou)).send({ name: 'Fatou Créations', market: 'test', city: 'Dakar', description: 'Wax et couture' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Fatou Créations', status: 'pending', effectiveCommission: 10 });
    expect((await request(app).post('/api/seller/shop').set(auth(fatou)).send({ name: 'Autre', market: 'test' })).status).toBe(400); // une seule boutique
    expect((await request(app).post('/api/seller/shop').set(auth(moussa)).send({ name: 'fatou créations', market: 'test' })).status).toBe(400); // nom déjà pris
    const blocked = await request(app).post('/api/seller/products').set(auth(fatou)).send({ name: 'Pagne', price: 5000, stock: 10, category: cat._id });
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toMatch(/attente/i);
    expect((await request(app).get('/api/suppliers/directory')).body).toHaveLength(0); // invisible au public
  });
  test("seul l'administrateur valide, puis la boutique devient vendeuse", async () => {
    const shop = await Supplier.findOne({ name: 'Fatou Créations' });
    expect((await request(app).put(`/api/shops/${shop._id}/status`).set(auth(fatou)).send({ status: 'approved' })).status).toBe(403);
    expect((await request(app).get('/api/shops').set(auth(fatou))).status).toBe(403);
    const ok = await request(app).put(`/api/shops/${shop._id}/status`).set(auth(admin)).send({ status: 'approved' });
    expect(ok.body.status).toBe('approved');
    const prod = await request(app).post('/api/seller/products').set(auth(fatou)).send({ name: 'Pagne wax', price: 5000, stock: 20, category: cat._id, featured: true, sold: 999 });
    expect(prod.status).toBe(201);
    expect(prod.body.supplier.name).toBe('Fatou Créations'); // rattaché à sa boutique
    expect(prod.body.featured).toBe(false); // la mise en avant reste à la plateforme
    expect(prod.body.sold).toBe(0);
  });
  test('un client sans boutique n’accède pas à l’espace vendeur', async () => {
    expect((await request(app).get('/api/seller/stats').set(auth(client))).status).toBe(403);
  });
});

describe('isolation entre vendeurs', () => {
  let fatouProduct, moussaProduct;
  beforeAll(async () => {
    await request(app).post('/api/seller/shop').set(auth(moussa)).send({ name: 'Moussa Électro', market: 'test' });
    const shop = await Supplier.findOne({ name: 'Moussa Électro' });
    await request(app).put(`/api/shops/${shop._id}/status`).set(auth(admin)).send({ status: 'approved' });
    moussaProduct = (await request(app).post('/api/seller/products').set(auth(moussa)).send({ name: 'Chargeur', price: 8000, stock: 30, category: cat._id })).body;
    fatouProduct = await Product.findOne({ name: 'Pagne wax' });
  });
  test('chacun ne voit et ne modifie que ses produits', async () => {
    const mine = await request(app).get('/api/seller/products').set(auth(moussa));
    expect(mine.body.items.map((p) => p.name)).toEqual(['Chargeur']);
    expect((await request(app).get(`/api/seller/products/${fatouProduct._id}`).set(auth(moussa))).status).toBe(404);
    expect((await request(app).put(`/api/seller/products/${fatouProduct._id}`).set(auth(moussa)).send({ price: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/seller/products/${fatouProduct._id}`).set(auth(moussa))).status).toBe(404);
    expect((await request(app).put(`/api/seller/products/${moussaProduct._id}`).set(auth(moussa)).send({ price: 8500 })).body.price).toBe(8500);
  });
  test("le vendeur ne peut pas utiliser les routes d'administration", async () => {
    expect((await request(app).post('/api/products').set(auth(moussa)).send({ name: 'X', price: 1, stock: 1, category: cat._id })).status).toBe(403);
    expect((await request(app).get('/api/orders').set(auth(moussa))).status).toBe(403);
    expect((await request(app).get('/api/team').set(auth(moussa))).status).toBe(403);
  });
});

describe('commandes multi-boutiques et commissions', () => {
  let fatouProduct, moussaProduct, res;
  beforeAll(async () => {
    fatouProduct = await Product.findOne({ name: 'Pagne wax' });
    moussaProduct = await Product.findOne({ name: 'Chargeur' });
    await Coupon.create({ code: 'PROMO10', type: 'percent', value: 10, active: true });
    res = await order([{ product: fatouProduct._id, quantity: 2 }, { product: moussaProduct._id, quantity: 1 }, { product: platformProduct._id, quantity: 1 }], { couponCode: 'PROMO10' });
  });
  test('un panier avec 3 vendeurs donne 3 commandes, la remise est répartie', async () => {
    expect(res.status).toBe(201);
    expect(res.body.orders).toHaveLength(3);
    const orders = await Order.find({ checkoutId: (await Order.findById(res.body._id)).checkoutId });
    expect(orders).toHaveLength(3);
    expect(orders.reduce((s, o) => s + o.discount, 0)).toBe(2800); // 10 % de (10 000 + 8 000 + 10 000)
    const byName = Object.fromEntries(orders.map((o) => [o.items[0].name, o]));
    expect(byName['Pagne wax'].commission).toBe(Math.round((10000 - 1000) * 0.1)); // 10 % sur les ventes après remise
    expect(byName['Article plateforme'].commission).toBe(0); // produit de la plateforme : pas de commission
    expect((await Coupon.findOne({ code: 'PROMO10' })).usedCount).toBe(1); // utilisé une seule fois
  });
  test('chaque vendeur ne voit que ses commandes et peut les traiter', async () => {
    const mine = await request(app).get('/api/seller/orders?page=1').set(auth(fatou));
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0].items[0].name).toBe('Pagne wax');
    const theirs = mine.body.items[0]._id;
    expect((await request(app).put(`/api/orders/${theirs}`).set(auth(moussa)).send({ status: 'Confirmée' })).status).toBe(403);
    expect((await request(app).get(`/api/orders/${theirs}`).set(auth(moussa))).status).toBe(403);
    const ok = await request(app).put(`/api/orders/${theirs}`).set(auth(fatou)).send({ status: 'Livrée' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('Livrée');
  });
  test('la commission due se calcule sur les ventes livrées, le reversement la réduit', async () => {
    const e = await request(app).get('/api/seller/earnings').set(auth(fatou));
    expect(e.body.ledger).toMatchObject({ deliveredOrders: 1, sales: 9000, commission: 900, net: 8100, due: 900, settled: 0 });
    const shop = await Supplier.findOne({ name: 'Fatou Créations' });
    expect((await request(app).post(`/api/shops/${shop._id}/settlements`).set(auth(fatou)).send({ amount: 500 })).status).toBe(403);
    const pay = await request(app).post(`/api/shops/${shop._id}/settlements`).set(auth(admin)).send({ amount: 500, method: 'Wave' });
    expect(pay.status).toBe(201);
    expect(pay.body.ledger).toMatchObject({ settled: 500, due: 400 });
    expect((await request(app).post(`/api/shops/${shop._id}/settlements`).set(auth(admin)).send({ amount: -5 })).status).toBe(400);
  });
  test('un retour remboursé retire la commission', async () => {
    const o = await Order.findOne({ 'items.name': 'Pagne wax' });
    await request(app).post(`/api/orders/${o._id}/return`).set(auth(client)).send({ reason: 'Produit défectueux' });
    expect((await request(app).put(`/api/orders/${o._id}/return`).set(auth(moussa)).send({ status: 'Remboursée' })).status).toBe(403);
    await request(app).put(`/api/orders/${o._id}/return`).set(auth(fatou)).send({ status: 'Remboursée' });
    const e = await request(app).get('/api/seller/earnings').set(auth(fatou));
    expect(e.body.ledger).toMatchObject({ deliveredOrders: 0, commission: 0, due: 0, credit: 500 });
  });
  test("annuler une commande d'un panier partagé ne rend le code promo que quand tout est annulé", async () => {
    const orders = await Order.find({ checkoutId: (await Order.findById(res.body._id)).checkoutId, status: { $ne: 'Livrée' } });
    await request(app).put(`/api/orders/${orders[0]._id}`).set(auth(admin)).send({ status: 'Annulée' });
    expect((await Coupon.findOne({ code: 'PROMO10' })).usedCount).toBe(1);
    await request(app).put(`/api/orders/${orders[1]._id}`).set(auth(admin)).send({ status: 'Annulée' });
    expect((await Coupon.findOne({ code: 'PROMO10' })).usedCount).toBe(1); // la commande livrée reste active
  });
  test('le tableau de bord du vendeur résume son activité', async () => {
    const s = await request(app).get('/api/seller/stats').set(auth(moussa));
    expect(s.status).toBe(200);
    expect(s.body).toMatchObject({ products: 1 });
    expect(s.body.daily).toHaveLength(14);
  });
});

describe('suspension, messagerie et réglages', () => {
  test('suspendre une boutique masque ses produits, la réactiver les remet en ligne', async () => {
    const shop = await Supplier.findOne({ name: 'Moussa Électro' });
    await request(app).put(`/api/shops/${shop._id}/status`).set(auth(admin)).send({ status: 'suspended' });
    expect((await request(app).get('/api/products?search=Chargeur')).body.map((p) => p.name)).not.toContain('Chargeur');
    expect((await request(app).get(`/api/suppliers/${shop._id}/profile`)).status).toBe(404);
    expect((await request(app).post('/api/seller/products').set(auth(moussa)).send({ name: 'Nouveau', price: 1000, stock: 1, category: cat._id })).status).toBe(403);
    await request(app).put(`/api/shops/${shop._id}/status`).set(auth(admin)).send({ status: 'approved' });
    expect((await request(app).get('/api/products?search=Chargeur')).body.map((p) => p.name)).toContain('Chargeur');
  });
  test('les questions sur un produit arrivent chez son vendeur, qui y répond', async () => {
    const p = await Product.findOne({ name: 'Pagne wax' });
    const q = await request(app).post('/api/inquiries').set(auth(client)).send({ type: 'question', product: p._id, message: 'Avez-vous du bleu ?' });
    expect(q.status).toBe(201);
    const mine = await request(app).get('/api/seller/inquiries').set(auth(fatou));
    expect(mine.body).toHaveLength(1);
    expect((await request(app).get('/api/seller/inquiries').set(auth(moussa))).body).toHaveLength(0);
    expect((await request(app).get(`/api/inquiries/${q.body._id}`).set(auth(moussa))).status).toBe(403);
    const reply = await request(app).post(`/api/inquiries/${q.body._id}/messages`).set(auth(fatou)).send({ text: 'Oui, en bleu et en vert.' });
    expect(reply.body.messages[1].from).toBe('admin'); // affiché « Vendeur » côté client
    expect(reply.body.status).toBe('Répondu');
  });
  test("l'administrateur règle la commission d'une boutique et peut valider automatiquement", async () => {
    const shop = await Supplier.findOne({ name: 'Moussa Électro' });
    expect((await request(app).put(`/api/shops/${shop._id}`).set(auth(admin)).send({ commissionRate: 60 })).status).toBe(400);
    const r = await request(app).put(`/api/shops/${shop._id}`).set(auth(admin)).send({ commissionRate: 5, verified: true });
    expect(r.body).toMatchObject({ commissionRate: 5, verified: true });
    expect((await request(app).get('/api/seller/shop').set(auth(moussa))).body.effectiveCommission).toBe(5);
    expect((await request(app).delete(`/api/suppliers/${shop._id}`).set(auth(admin))).status).toBe(400); // pas de suppression d'une boutique de vendeur
    await request(app).put('/api/settings').set(auth(admin)).send({ autoApproveShops: true, commissionRate: 8 });
    await User.create({ name: 'Awa', email: 'awa@mk.sn', password: 'Awa12345!' });
    const awa = await login('awa@mk.sn', 'Awa12345!');
    expect((await request(app).post('/api/seller/shop').set(auth(awa)).send({ name: 'Awa Beauté', market: 'test' })).body).toMatchObject({ status: 'approved', effectiveCommission: 8 });
  });
});
