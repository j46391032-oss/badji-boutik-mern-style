const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const loadCatalog = require('../utils/loadCatalog');
const { PRODUCTS } = require('../data/catalog');

let mongod, admin, client, cat, sup, polo, plain;
const address = { fullName: 'Amadou Diop', phone: '770000000', address: 'Plateau', city: 'Dakar' };
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;
const order = (items) => request(app).post('/api/orders').set(auth(client)).send({ items, shippingAddress: address });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Admin', email: 'admin@ft.sn', password: 'Admin123!', role: 'admin' },
    { name: 'Client', email: 'client@ft.sn', password: 'Client123!' },
  ]);
  cat = await Category.create({ name: 'Mode', icon: '👕' });
  sup = await Supplier.create({ name: 'Boutique Test', verified: true });
  polo = await Product.create({
    name: 'Polo test', brand: 'Teranga', price: 9000, stock: 100, moq: 2, category: cat._id, supplier: sup._id, sampleAvailable: true,
    priceTiers: [{ minQty: 10, price: 8000 }],
    options: [{ name: 'Taille', values: ['M', 'L'] }, { name: 'Couleur', values: ['Blanc', 'Noir'] }],
  });
  plain = await Product.create({ name: 'Clé USB test', price: 5000, stock: 10, category: cat._id });
  admin = await login('admin@ft.sn', 'Admin123!');
  client = await login('client@ft.sn', 'Client123!');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('variantes (couleur, taille…)', () => {
  test('exige les options et refuse une valeur inconnue', async () => {
    const none = await order([{ product: polo._id, quantity: 2 }]);
    expect(none.status).toBe(400);
    expect(none.body.message).toMatch(/choisir/i);
    const bad = await order([{ product: polo._id, quantity: 2, variant: { Taille: 'XXL', Couleur: 'Noir' } }]);
    expect(bad.status).toBe(400);
  });
  test('garde une ligne par variante et applique le palier sur la quantité totale du produit', async () => {
    const res = await order([
      { product: polo._id, quantity: 6, variant: { Taille: 'M', Couleur: 'Blanc' } },
      { product: polo._id, quantity: 6, variant: { Taille: 'L', Couleur: 'Noir' } },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].variant).toBe('Taille : M / Couleur : Blanc');
    expect(res.body.items.every((i) => i.price === 8000)).toBe(true); // 12 unités au total → palier ≥ 10
    expect((await Product.findById(polo._id)).stock).toBe(88);
  });
  test("un produit sans option n'accepte aucune variante particulière", async () => {
    expect((await order([{ product: plain._id, quantity: 1 }])).status).toBe(201);
  });
});

describe('suggestions de recherche', () => {
  test('renvoie produits, catégories et marques', async () => {
    const res = await request(app).get('/api/products/suggest?q=pol');
    expect(res.status).toBe(200);
    expect(res.body.products.map((p) => p.name)).toContain('Polo test');
    const brand = await request(app).get('/api/products/suggest?q=teran');
    expect(brand.body.brands).toContain('Teranga');
    const cats = await request(app).get('/api/products/suggest?q=mod');
    expect(cats.body.categories[0].name).toBe('Mode');
  });
  test('ignore les requêtes trop courtes', async () => {
    const res = await request(app).get('/api/products/suggest?q=p');
    expect(res.body.products).toEqual([]);
  });
});

describe('filtres du catalogue', () => {
  test('MOQ maximum, vendeurs vérifiés, échantillons et marque', async () => {
    const moq = await request(app).get('/api/products?maxMoq=1');
    expect(moq.body.map((p) => p.name)).not.toContain('Polo test');
    const ver = await request(app).get('/api/products?verified=1');
    expect(ver.body.map((p) => p.name)).toEqual(['Polo test']);
    const smp = await request(app).get('/api/products?samples=1');
    expect(smp.body.map((p) => p.name)).toEqual(['Polo test']);
    const br = await request(app).get('/api/products?brand=teranga');
    expect(br.body).toHaveLength(1);
  });
});

describe('annuaire des vendeurs (public)', () => {
  test("liste les vendeurs avec leurs statistiques et expose la fiche d'un vendeur", async () => {
    const list = await request(app).get('/api/suppliers/directory');
    expect(list.status).toBe(200);
    expect(list.body[0]).toMatchObject({ name: 'Boutique Test', products: 1 });
    const one = await request(app).get(`/api/suppliers/${sup._id}/profile`);
    expect(one.body.name).toBe('Boutique Test');
    expect(one.body.categories[0].name).toBe('Mode');
  });
  test('la liste complète reste réservée à l’administrateur', async () => {
    expect((await request(app).get('/api/suppliers')).status).toBe(401);
    expect((await request(app).get('/api/suppliers').set(auth(client))).status).toBe(403);
  });
});

describe('demandes de retour', () => {
  let o;
  beforeAll(async () => {
    o = (await order([{ product: plain._id, quantity: 1 }])).body;
  });
  test('refuse un retour tant que la commande n’est pas livrée', async () => {
    const res = await request(app).post(`/api/orders/${o._id}/return`).set(auth(client)).send({ reason: 'Produit défectueux' });
    expect(res.status).toBe(400);
  });
  test('accepte un retour après livraison, une seule fois, puis le traite côté admin', async () => {
    await request(app).put(`/api/orders/${o._id}`).set(auth(admin)).send({ status: 'Livrée' });
    const bad = await request(app).post(`/api/orders/${o._id}/return`).set(auth(client)).send({ reason: 'n’importe quoi' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post(`/api/orders/${o._id}/return`).set(auth(client)).send({ reason: 'Produit défectueux', details: 'Ne s’allume pas' });
    expect(ok.status).toBe(201);
    expect(ok.body.returnRequest.status).toBe('Demandée');
    expect((await request(app).post(`/api/orders/${o._id}/return`).set(auth(client)).send({ reason: 'Autre' })).status).toBe(400);
    expect((await request(app).put(`/api/orders/${o._id}/return`).set(auth(client)).send({ status: 'Acceptée' })).status).toBe(403);
    const upd = await request(app).put(`/api/orders/${o._id}/return`).set(auth(admin)).send({ status: 'Acceptée', adminReply: 'Passez en boutique.' });
    expect(upd.body.returnRequest).toMatchObject({ status: 'Acceptée', adminReply: 'Passez en boutique.' });
    const list = await request(app).get('/api/orders?returns=1&page=1').set(auth(admin));
    expect(list.body.items).toHaveLength(1);
  });
  test('refuse un retour hors délai', async () => {
    const late = (await order([{ product: plain._id, quantity: 1 }])).body;
    await request(app).put(`/api/orders/${late._id}`).set(auth(admin)).send({ status: 'Livrée' });
    await Order.updateOne({ _id: late._id }, { $set: { 'history.1.at': new Date(Date.now() - 30 * 86400000) } });
    const res = await request(app).post(`/api/orders/${late._id}/return`).set(auth(client)).send({ reason: 'Autre' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/délai/i);
  });
});

describe('chargement du catalogue', () => {
  test('ajoute les produits une seule fois et complète les produits existants', async () => {
    await Product.create({ name: PRODUCTS[0].name, price: PRODUCTS[0].price, stock: 1, category: cat._id }); // produit « ancien », sans vendeur
    const first = await loadCatalog();
    expect(first.added).toBe(PRODUCTS.length - 1);
    expect(first.completed).toBe(1);
    const second = await loadCatalog();
    expect(second.added).toBe(0);
    const filled = await Product.findOne({ name: PRODUCTS[0].name });
    expect(filled.supplier).toBeTruthy();
    expect(await Product.countDocuments({ name: PRODUCTS[0].name })).toBe(1);
  });
});
