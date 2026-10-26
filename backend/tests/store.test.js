const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Endcap = require('../models/Endcap');
const ensureStore = require('../utils/ensureStore');
const ensureMarkets = require('../utils/ensureMarkets');
const loadCatalog = require('../utils/loadCatalog');
const { PRODUCTS } = require('../data/catalog');

let mongod, admin, client, cats;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;
const mk = (name, category, extra = {}) => Product.create({ name, price: 1000, stock: 10, category: cats[category]._id, ...extra });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.create([
    { name: 'Admin', email: 'admin@st.sn', password: 'Admin123!', role: 'superadmin' },
    { name: 'Client', email: 'client@st.sn', password: 'Client123!' },
  ]);
  await Category.create({ name: 'Vêtements' }); // rayon qui existait avant le plan du magasin (sans zone)
  await ensureStore();
  cats = Object.fromEntries((await Category.find()).map((c) => [c.name, c]));
  admin = await login('admin@st.sn', 'Admin123!');
  client = await login('client@st.sn', 'Client123!');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('plan du magasin', () => {
  test('les rayons sont placés dans trois zones, avec leurs allées et leurs travées', () => {
    expect(cats['Fruits & légumes']).toMatchObject({ zone: 'fresh', aisle: 1, slug: 'fruits-legumes' });
    expect(cats['Fruits & légumes'].bays).toEqual(['Fruits', 'Légumes', 'Tubercules & racines']);
    expect(cats['Épicerie sèche']).toMatchObject({ zone: 'grocery', aisle: 1 });
    expect(cats['Vêtements']).toMatchObject({ zone: 'general', aisle: 1 }); // le rayon ancien est rangé lui aussi
    expect(cats['Vêtements'].effectiveLayout).toBe('free'); // plan libre pour les marchandises générales
    expect(cats['Boissons'].effectiveLayout).toBe('grid'); // grille pour l'alimentaire
  });
  test("relancer le plan n'écrase pas les réglages de l'administrateur", async () => {
    await Category.updateOne({ _id: cats['Boissons']._id }, { aisle: 9, bays: ['Mes boissons'] });
    await ensureStore();
    const b = await Category.findOne({ name: 'Boissons' });
    expect(b).toMatchObject({ aisle: 9, bays: ['Mes boissons'] });
    await Category.updateOne({ _id: b._id }, { aisle: 2, bays: ['Eaux', 'Jus & sodas', 'Thés & cafés'] });
  });
  test('GET /api/store : zones dans l’ordre du parcours, seulement les rayons qui ont des produits', async () => {
    await mk('Mangues', 'Fruits & légumes');
    await mk('Riz', 'Épicerie sèche');
    await mk('Eau', 'Boissons');
    await mk('Robe', 'Vêtements');
    const vp = await mk('Produit de vendeur', 'Vêtements');
    await Product.updateOne({ _id: vp._id }, { origin: 'market' }); // n'appartient pas à la boutique officielle (l'origine suit la boutique du produit)
    await mk('Produit masqué', 'Fruits & légumes', { published: false });
    const res = await request(app).get('/api/store');
    expect(res.status).toBe(200);
    expect(res.body.zones.map((z) => z.key)).toEqual(['fresh', 'grocery', 'general']);
    expect(res.body.zones[0]).toMatchObject({ name: 'Périmètre frais', layout: 'grid' });
    expect(res.body.zones[2].layout).toBe('free');
    expect(res.body.zones[0].rayons.map((r) => [r.name, r.products])).toEqual([['Fruits & légumes', 1]]);
    expect(res.body.zones[1].rayons.map((r) => r.name)).toEqual(['Épicerie sèche', 'Boissons']);
    expect(res.body.zones[2].rayons).toEqual([expect.objectContaining({ name: 'Vêtements', products: 1 })]);
    expect(res.body.total).toBe(4);
  });
  test("un rayon indique ses voisins : on passe d'allée en allée, puis de zone en zone", async () => {
    const res = await request(app).get('/api/store/rayon/epicerie-seche');
    expect(res.body.rayon).toMatchObject({ name: 'Épicerie sèche', zone: 'grocery', layout: 'grid', aisle: 1 });
    expect(res.body.prev).toMatchObject({ name: 'Fruits & légumes', zone: 'fresh' });
    expect(res.body.next).toMatchObject({ name: 'Boissons', aisle: 2 });
    expect((await request(app).get('/api/store/rayon/boissons')).body.next).toMatchObject({ name: 'Vêtements', zone: 'general' });
    expect((await request(app).get('/api/store/rayon/introuvable')).status).toBe(404);
  });
  test('la page d’une zone montre ses rayons avec un aperçu', async () => {
    const res = await request(app).get('/api/store/zone/grocery');
    expect(res.body.zone.key).toBe('grocery');
    expect(res.body.rayons[0].preview[0].name).toBe('Riz');
    expect((await request(app).get('/api/store/zone/nulle-part')).status).toBe(404);
  });
  test('le catalogue se filtre par zone', async () => {
    expect((await request(app).get('/api/products?zone=grocery')).body.map((p) => p.name).sort()).toEqual(['Eau', 'Riz']);
    expect((await request(app).get('/api/products?zone=fresh')).body.map((p) => p.name)).toEqual(['Mangues']);
  });
  test("l'administrateur règle zone, allée, affichage et travées d'un rayon", async () => {
    const id = cats['Maison']._id;
    expect((await request(app).put(`/api/categories/${id}`).set(auth(client)).send({ zone: 'fresh' })).status).toBe(403);
    const ok = await request(app).put(`/api/categories/${id}`).set(auth(admin)).send({ zone: 'grocery', aisle: 7, layout: 'free', bays: ['A', ' B ', ''] });
    expect(ok.body).toMatchObject({ zone: 'grocery', aisle: 7, layout: 'free', bays: ['A', 'B'] });
    const bad = await request(app).put(`/api/categories/${id}`).set(auth(admin)).send({ zone: 'lune' });
    expect(bad.body.zone).toBe('grocery'); // zone inconnue ignorée
    await request(app).put(`/api/categories/${id}`).set(auth(admin)).send({ zone: 'general', aisle: 8, layout: '', bays: [] });
  });
});

describe('planogramme', () => {
  let fruits;
  beforeAll(async () => {
    fruits = await Promise.all(['Banane', 'Orange', 'Tomate', 'Oignon', 'Patate'].map((n, i) => mk(n, 'Fruits & légumes', { sold: i * 10 })));
    await mk('Chemise', 'Vêtements');
  });
  test('réservé à ceux qui gèrent le catalogue', async () => {
    const id = cats['Fruits & légumes']._id;
    expect((await request(app).get(`/api/planogram/${id}`)).status).toBe(401);
    expect((await request(app).get(`/api/planogram/${id}`).set(auth(client))).status).toBe(403);
  });
  test("l'ordre envoyé devient l'ordre des étagères, avec les travées", async () => {
    const id = cats['Fruits & légumes']._id;
    const [banane, orange, tomate, oignon, patate] = fruits.map((p) => String(p._id));
    const res = await request(app).put(`/api/planogram/${id}`).set(auth(admin)).send({
      bays: ['Fruits', 'Légumes'],
      items: [{ id: orange, bay: 'Fruits' }, { id: banane, bay: 'Fruits' }, { id: tomate, bay: 'Légumes' }, { id: oignon, bay: 'Travée inconnue' }],
    });
    expect(res.status).toBe(200);
    const items = res.body.items;
    expect(items.map((p) => [p.name, p.position, p.bay]).slice(0, 4)).toEqual([['Orange', 1, 'Fruits'], ['Banane', 2, 'Fruits'], ['Tomate', 3, 'Légumes'], ['Oignon', 4, '']]); // travée inconnue → sans travée
    expect(items.map((p) => p.position)).toEqual([1, 2, 3, 4, 5, 6, 7]); // places consécutives
    expect(items.slice(4).map((p) => p.name).sort()).toEqual(['Mangues', 'Patate', 'Produit masqué']); // produits oubliés : placés après, dans leur ordre
    expect(res.body.rayon.bays).toEqual(['Fruits', 'Légumes']);
    expect(String(res.body.items.find((p) => p.name === 'Patate')._id)).toBe(patate);
  });
  test('le site affiche le rayon dans l’ordre du planogramme (tri « aisle »)', async () => {
    const id = cats['Fruits & légumes']._id;
    const list = (await request(app).get(`/api/products?category=${id}&scope=official&sort=aisle`)).body.map((p) => p.name);
    expect(list.slice(0, 4)).toEqual(['Orange', 'Banane', 'Tomate', 'Oignon']);
    expect(list).not.toContain('Produit masqué'); // non publié : jamais affiché au public
  });
  test("un produit d'un autre rayon, ou d'un vendeur, est refusé", async () => {
    const id = cats['Fruits & légumes']._id;
    const chemise = await Product.findOne({ name: 'Chemise' });
    expect((await request(app).put(`/api/planogram/${id}`).set(auth(admin)).send({ items: [{ id: String(chemise._id) }] })).status).toBe(400);
    const vendeur = await Product.findOne({ name: 'Produit de vendeur' });
    expect((await request(app).put(`/api/planogram/${cats['Vêtements']._id}`).set(auth(admin)).send({ items: [{ id: String(vendeur._id) }] })).status).toBe(400);
  });
  test('rangement automatique : par travée, puis meilleures ventes', async () => {
    const id = cats['Fruits & légumes']._id;
    const res = await request(app).post(`/api/planogram/${id}/auto`).set(auth(admin));
    const names = res.body.items.map((p) => p.name);
    // travée « Fruits » (Orange vendue 10, Banane 0) avant « Légumes » (Tomate) avant les produits sans travée (meilleures ventes d'abord)
    expect(names.indexOf('Orange')).toBeLessThan(names.indexOf('Banane'));
    expect(names.indexOf('Banane')).toBeLessThan(names.indexOf('Tomate'));
    expect(names.indexOf('Tomate')).toBeLessThan(names.indexOf('Oignon'));
    expect(names.indexOf('Patate')).toBeLessThan(names.indexOf('Oignon')); // sans travée : meilleures ventes d'abord (Patate 40, Oignon 30)
  });
});

describe('têtes de gondole', () => {
  let mangue, riz;
  beforeAll(async () => {
    mangue = await Product.findOne({ name: 'Mangues' });
    riz = await Product.findOne({ name: 'Riz' });
  });
  const make = (extra) => request(app).post('/api/endcaps').set(auth(admin)).send({ title: 'Promo', products: [String(mangue._id)], ...extra });

  test('réservé aux administrateurs ; dates incohérentes refusées', async () => {
    expect((await request(app).post('/api/endcaps').set(auth(client)).send({ title: 'X' })).status).toBe(403);
    expect((await make({ title: '' })).status).toBe(400);
    expect((await make({ startsAt: '2030-02-01', endsAt: '2030-01-01' })).status).toBe(400);
  });
  test('apparaît en bout de ses rayons, de ses zones et sur le plan du magasin', async () => {
    const created = await make({ title: 'Arrivage', zones: ['fresh'], rayons: [String(cats['Épicerie sèche']._id)], showOnStore: true, kind: 'seasonal' });
    expect(created.status).toBe(201);
    const fresh = await request(app).get('/api/store/zone/fresh');
    expect(fresh.body.endcaps.map((e) => e.title)).toContain('Arrivage');
    expect((await request(app).get('/api/store/rayon/epicerie-seche')).body.endcaps.map((e) => e.title)).toContain('Arrivage');
    expect((await request(app).get('/api/store/rayon/boissons')).body.endcaps).toEqual([]); // pas son rayon, pas sa zone
    expect((await request(app).get('/api/store')).body.endcaps.map((e) => e.title)).toContain('Arrivage');
    expect((await request(app).get(`/api/endcaps?zone=fresh`)).body[0].products[0].name).toBe('Mangues');
  });
  test('respecte les dates, l’activation et les produits masqués', async () => {
    await Endcap.deleteMany({});
    const past = await make({ title: 'Passée', zones: ['fresh'], startsAt: '2020-01-01', endsAt: '2020-02-01' });
    const future = await make({ title: 'Future', zones: ['fresh'], startsAt: '2099-01-01' });
    const off = await make({ title: 'Désactivée', zones: ['fresh'], active: false });
    const now = await make({ title: 'En cours', zones: ['fresh'], startsAt: '2020-01-01', endsAt: '2099-01-01' });
    expect([past, future, off, now].every((r) => r.status === 201)).toBe(true);
    expect((await request(app).get('/api/endcaps?zone=fresh')).body.map((e) => e.title)).toEqual(['En cours']);
    await Product.updateOne({ _id: mangue._id }, { published: false });
    expect((await request(app).get('/api/endcaps?zone=fresh')).body).toEqual([]); // plus aucun produit en vente : rien à montrer
    await Product.updateOne({ _id: mangue._id }, { published: true });
  });
  test("l'administrateur modifie et supprime ; la liste complète lui est réservée", async () => {
    const all = await request(app).get('/api/endcaps/all').set(auth(admin));
    expect(all.body).toHaveLength(4);
    expect((await request(app).get('/api/endcaps/all').set(auth(client))).status).toBe(403);
    const id = all.body.find((e) => e.title === 'Désactivée')._id;
    expect((await request(app).put(`/api/endcaps/${id}`).set(auth(admin)).send({ active: true, products: [String(mangue._id), String(riz._id)] })).body.active).toBe(true);
    expect((await request(app).delete(`/api/endcaps/${id}`).set(auth(admin))).status).toBe(200);
    expect((await request(app).delete(`/api/endcaps/${id}`).set(auth(admin))).status).toBe(404);
  });
});

describe('bon de préparation', () => {
  test("les articles sont classés dans l'ordre du magasin : frais, épicerie, général", async () => {
    const [mangue, riz, robe] = await Promise.all(['Mangues', 'Riz', 'Robe'].map((n) => Product.findOne({ name: n })));
    const address = { fullName: 'A B', phone: '770000000', address: 'Plateau', city: 'Dakar' };
    const order = await request(app).post('/api/orders').set(auth(client)).send({ shippingAddress: address, items: [{ product: robe._id, quantity: 1 }, { product: riz._id, quantity: 2 }, { product: mangue._id, quantity: 3 }] });
    expect(order.status).toBe(201);
    const pick = await request(app).get(`/api/orders/${order.body._id}/picklist`).set(auth(admin));
    expect(pick.status).toBe(200);
    expect(pick.body.lines.map((l) => [l.name, l.zone, l.aisle])).toEqual([['Mangues', 'fresh', 1], ['Riz', 'grocery', 1], ['Robe', 'general', 1]]);
    expect(pick.body.lines[0].code).toMatch(/^F1-/);
    expect(pick.body.lines[1].code).toMatch(/^E1-/);
    expect(pick.body.lines[2].code).toMatch(/^G1-/);
    expect((await request(app).get(`/api/orders/${order.body._id}/picklist`).set(auth(client))).status).toBe(403);
  });
});

describe('catalogue', () => {
  test('charge les rayons, les travées et les places, sans écraser un planogramme déjà réglé', async () => {
    await loadCatalog();
    const sample = PRODUCTS.find((p) => p.name === 'Riz brisé parfumé (5 kg)');
    let riz = await Product.findOne({ name: sample.name });
    expect(riz).toMatchObject({ bay: 'Riz & céréales', origin: 'official' });
    expect(riz.position).toBeLessThan(1000000);
    expect(await Endcap.countDocuments()).toBeGreaterThan(0); // têtes de gondole de démonstration (déjà présentes : pas de doublon)
    await Product.updateOne({ _id: riz._id }, { position: 1, bay: 'Conserves' }); // l'administrateur a réorganisé
    const again = await loadCatalog();
    expect(again.added).toBe(0);
    riz = await Product.findById(riz._id);
    expect(riz).toMatchObject({ position: 1, bay: 'Conserves' });
  });
  test('chaque rayon de la boutique officielle a des produits après chargement', async () => {
    const store = (await request(app).get('/api/store')).body;
    store.zones.forEach((z) => expect(z.rayons.length).toBeGreaterThan(0));
    expect(store.zones[0].rayons.map((r) => r.name)).toEqual(['Fruits & légumes', 'Boulangerie & pâtisserie', 'Boucherie & poissonnerie', 'Produits laitiers & œufs']);
    expect(store.endcaps.length).toBeGreaterThan(0);
  });
  test('les nouveaux rayons alimentaires sont aussi ouverts aux vendeurs du marché Kermel', async () => {
    await ensureMarkets();
    const kermel = await require('../models/Market').findOne({ slug: 'kermel' }).populate('categories', 'name');
    const names = kermel.categories.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Fruits & légumes', 'Épicerie sèche', 'Boissons']));
    expect(await Supplier.countDocuments({ owner: { $ne: null } })).toBe(0);
  });
});
