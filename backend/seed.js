// Remplit la base avec un admin, des clients, des catégories, des vendeurs, des produits, des bannières et des commandes d'exemple
// Usage : npm run seed   (⚠️ efface les données existantes)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Counter = require('./models/Counter');
const Coupon = require('./models/Coupon');
const Review = require('./models/Review');
const Supplier = require('./models/Supplier');
const Banner = require('./models/Banner');
const Settings = require('./models/Settings');
const Inquiry = require('./models/Inquiry');
const AuditLog = require('./models/AuditLog');
const recomputeRating = require('./utils/rating');
const loadCatalog = require('./utils/loadCatalog');
const Market = require('./models/Market');
const Endcap = require('./models/Endcap');
const Settlement = require('./models/Settlement');
const demoShops = require('./data/demo-shops');
const { imagePath } = require('./utils/productImage');

(async () => {
  // Garde-fou : le seed efface TOUTES les données et crée des comptes aux mots de passe publics (Admin123!…)
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('⛔ Refusé en production : « node seed.js » efface la base et crée des comptes de démonstration connus de tous.\n   Si c\'est vraiment ce que vous voulez (base de test), ajoutez --force. Changez ensuite tous les mots de passe.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce');
  await Promise.all(
    [User, Category, Product, Order, Counter, Coupon, Review, Supplier, Banner, Settings, Inquiry, AuditLog, Market, Settlement, Endcap].map((m) => m.deleteMany())
  );

  const [, , client, ...others] = await User.create([
    { name: 'Administrateur du projet', email: 'admin@boutik.sn', password: 'Admin123!', role: 'superadmin' },
    { name: 'Sous-administrateur (démo)', email: 'equipe@boutik.sn', password: 'Equipe123!', role: 'admin', permissions: ['produits', 'commandes', 'devis'] },
    { name: 'Amadou Diop', email: 'client@boutik.sn', password: 'Client123!', role: 'client', phone: '770000000', address: 'Plateau', city: 'Dakar' },
    { name: 'Fatou Ndiaye', email: 'fatou@boutik.sn', password: 'Client123!', role: 'client', phone: '771111111', address: 'Médina', city: 'Dakar' },
    { name: 'Moussa Sow', email: 'moussa@boutik.sn', password: 'Client123!', role: 'client', phone: '772222222', address: 'Escale', city: 'Thiès' },
    { name: 'Awa Ba', email: 'awa@boutik.sn', password: 'Client123!', role: 'client', phone: '773333333', address: 'Sor', city: 'Saint-Louis' },
    { name: 'Cheikh Fall', email: 'cheikh@boutik.sn', password: 'Client123!', role: 'client', phone: '774444444', address: 'Ngor', city: 'Dakar' },
  ]);
  const clients = [client, ...others];

  await Settings.create({
    _id: 'main',
    shopName: 'Boutik',
    announcement: 'Livraison gratuite dès 50 000 FCFA — code BIENVENUE10 : −10 % sur votre commande',
    shippingFee: 2000,
    freeShippingThreshold: 50000,
    returnDays: 7,
    supportPhone: '+221 77 000 00 00',
    supportEmail: 'contact@boutik.sn',
    lowStockThreshold: 5,
  });

  const cats = await Category.insertMany(
    [
      ['Électronique', '🎧'],
      ['Vêtements', '👕'],
      ['Chaussures', '👟'],
      ['Accessoires', '👜'],
    ].map(([name, icon]) => ({ name, icon }))
  );
  const id = Object.fromEntries(cats.map((c) => [c.name, c._id]));

  const [tech, mode, sahel] = await Supplier.insertMany([
    { name: 'Dakar Tech Distribution', verified: true, city: 'Dakar', yearsActive: 6, rating: 4.9, responseHours: 2, onTimeRate: 98, repurchaseRate: 34, markets: ['Sénégal', 'Mali', 'Guinée'] },
    { name: 'Teranga Mode', verified: true, city: 'Thiès', yearsActive: 4, rating: 4.7, responseHours: 4, onTimeRate: 94, repurchaseRate: 27, markets: ['Sénégal', "Côte d'Ivoire"] },
    { name: 'Sahel Import', verified: false, city: 'Saint-Louis', yearsActive: 1, rating: 4.5, responseHours: 8, onTimeRate: 88, repurchaseRate: 15, markets: ['Sénégal'] },
  ]);

  const inDays = (n) => new Date(Date.now() + n * 86400000);
  const specs = (...pairs) => pairs.map(([label, value]) => ({ label, value }));

  const products = await Product.insertMany([
    { name: 'Casque Bluetooth', brand: 'SonicWave', description: "Casque sans fil avec réduction de bruit, 20 h d'autonomie.", price: 25000, oldPrice: 38000, stock: 15, sold: 412, category: id['Électronique'], supplier: tech._id, freeShipping: true, featured: true, flashSaleEnds: inDays(3), specs: specs(['Connexion', 'Bluetooth 5.3'], ['Autonomie', '20 heures'], ['Réduction de bruit', 'Active'], ['Garantie', '12 mois']), priceTiers: [{ minQty: 5, price: 23000 }, { minQty: 20, price: 21000 }] },
    { name: 'Souris sans fil', brand: 'ClickPro', description: 'Souris ergonomique 2,4 GHz, silencieuse.', price: 10000, stock: 40, sold: 238, category: id['Électronique'], supplier: tech._id, specs: specs(['Connexion', '2,4 GHz'], ['Résolution', '1600 DPI'], ['Pile', '1 x AA']), priceTiers: [{ minQty: 10, price: 9000 }] },
    { name: 'Chargeur rapide 30 W', brand: 'VoltUp', description: 'Chargeur USB-C compatible smartphones et tablettes.', price: 8500, oldPrice: 11000, stock: 60, sold: 1204, category: id['Électronique'], supplier: tech._id, freeShipping: true, flashSaleEnds: inDays(2), specs: specs(['Puissance', '30 W'], ['Port', 'USB-C'], ['Norme', 'Power Delivery']), priceTiers: [{ minQty: 10, price: 7500 }, { minQty: 50, price: 6500 }], moq: 1 },
    { name: 'Enceinte portable', brand: 'SonicWave', description: 'Enceinte étanche, son 360°.', price: 32000, stock: 12, sold: 96, category: id['Électronique'], supplier: tech._id, featured: true, specs: specs(['Étanchéité', 'IPX7'], ['Autonomie', '12 heures'], ['Puissance', '20 W']) },
    { name: 'T-shirt coton', brand: 'Teranga', description: 'T-shirt 100 % coton, coupe droite.', price: 6000, stock: 80, sold: 856, category: id['Vêtements'], supplier: mode._id, moq: 2, specs: specs(['Matière', '100 % coton'], ['Coupe', 'Droite'], ['Tailles', 'S à XXL']), priceTiers: [{ minQty: 10, price: 5200 }, { minQty: 50, price: 4500 }] },
    { name: 'Boubou brodé', brand: 'Teranga', description: 'Boubou traditionnel brodé à la main.', price: 45000, oldPrice: 52000, stock: 8, sold: 63, category: id['Vêtements'], supplier: mode._id, featured: true, specs: specs(['Matière', 'Bazin riche'], ['Broderie', 'Faite main'], ['Entretien', 'Lavage à la main']) },
    { name: 'Veste en jean', brand: 'UrbanDak', description: 'Veste en jean délavé, unisexe.', price: 22000, stock: 20, sold: 140, category: id['Vêtements'], supplier: mode._id, specs: specs(['Matière', 'Jean coton'], ['Coupe', 'Unisexe']) },
    { name: 'Baskets de ville', brand: 'UrbanDak', description: 'Baskets légères et confortables.', price: 28000, oldPrice: 35000, stock: 25, sold: 321, category: id['Chaussures'], supplier: sahel._id, freeShipping: true, flashSaleEnds: inDays(1), specs: specs(['Semelle', 'Caoutchouc antidérapant'], ['Pointures', '38 à 45']) },
    { name: 'Sandales en cuir', brand: 'Artisan Teranga', description: 'Sandales artisanales en cuir véritable.', price: 12000, stock: 30, sold: 512, category: id['Chaussures'], supplier: mode._id, moq: 1, specs: specs(['Matière', 'Cuir véritable'], ['Fabrication', 'Artisanale']), priceTiers: [{ minQty: 6, price: 10500 }] },
    { name: 'Montre classique', brand: 'Chronos', description: 'Montre à quartz, bracelet acier.', price: 35000, oldPrice: 42000, stock: 10, sold: 77, category: id['Accessoires'], supplier: tech._id, specs: specs(['Mouvement', 'Quartz'], ['Bracelet', 'Acier inoxydable'], ['Étanchéité', '3 ATM']) },
    { name: 'Sac à dos 20 L', brand: 'TrekGo', description: "Sac à dos résistant à l'eau avec port USB.", price: 18000, stock: 22, sold: 205, category: id['Accessoires'], supplier: sahel._id, freeShipping: true, specs: specs(['Volume', '20 litres'], ['Port', 'USB intégré'], ['Matière', 'Polyester déperlant']), priceTiers: [{ minQty: 5, price: 16500 }] },
    { name: 'Lunettes de soleil', brand: 'Sunset', description: 'Verres polarisés, protection UV400.', price: 9000, stock: 0, sold: 330, category: id['Accessoires'], supplier: sahel._id, specs: specs(['Protection', 'UV400'], ['Verres', 'Polarisés']) },
  ]);

  // image de chaque produit de démonstration (fichiers dans frontend/public/produits)
  for (const p of products) {
    const img = imagePath(p.name);
    if (img) {
      p.image = img;
      await Product.updateOne({ _id: p._id }, { image: img });
    }
  }

  // Codes promo de démonstration
  await Coupon.create([
    { code: 'BIENVENUE10', type: 'percent', value: 10 },
    { code: 'TABASKI5000', type: 'fixed', value: 5000, minOrder: 20000 },
  ]);

  // Bannières du carrousel d'accueil
  await Banner.create([
    { title: 'Ventes Flash', subtitle: "Jusqu'à −35 % sur une sélection, pour quelques jours seulement", cta: 'Voir les offres', link: '/produits?flash=1', color: '#b12704', order: 1 },
    { title: 'Livraison gratuite dès 50 000 FCFA', subtitle: 'Recevez vos commandes chez vous, partout au Sénégal', cta: 'Parcourir le catalogue', link: '/produits?freeShipping=1', color: '#0a4733', order: 2 },
    { title: 'Achetez en gros, payez moins', subtitle: 'Prix dégressifs sur des centaines de produits — demandez votre devis', cta: 'Demander un devis', link: '/demande-devis', color: '#08855c', order: 3 },
  ]);

  // Commandes de démonstration réparties sur 30 jours (pour les graphiques et les avis)
  const day = 86400000;
  const demo = [];
  for (let i = 0; i < 18; i++) {
    const owner = clients[i % clients.length];
    const picked = [products[i % 11], products[(i * 3 + 1) % 11]];
    const items = picked.map((p, k) => ({ product: p._id, name: p.name, price: p.price, image: p.image, quantity: 1 + ((i + k) % 3) }));
    const totalAmount = items.reduce((t, it) => t + it.price * it.quantity, 0);
    const status = i < 12 ? 'Livrée' : i < 15 ? 'Expédiée' : i < 17 ? 'Confirmée' : 'En attente';
    const createdAt = new Date(Date.now() - (29 - i * 1.6) * day);
    const flow = ['En attente', 'Confirmée', 'Expédiée', 'Livrée'];
    const steps = flow.slice(0, flow.indexOf(status) + 1);
    demo.push({
      orderNumber: 1001 + i,
      user: owner._id,
      items,
      subtotal: totalAmount,
      totalAmount,
      paymentMethod: Order.PAYMENTS[i % 3],
      shippingAddress: { fullName: owner.name, phone: owner.phone, address: owner.address, city: owner.city },
      status,
      history: steps.map((s, k) => ({ status: s, at: new Date(createdAt.getTime() + k * 0.6 * day) })),
      createdAt,
    });
  }
  await Order.insertMany(demo);
  await Counter.create({ _id: 'order', seq: demo.length });

  // Quelques avis
  await Review.create([
    { product: products[0]._id, user: client._id, rating: 5, comment: 'Excellent son, très confortable.' },
    { product: products[0]._id, user: clients[1]._id, rating: 4, comment: 'Très bon casque, la batterie tient la promesse.' },
    { product: products[1]._id, user: client._id, rating: 4, comment: 'Bonne souris, silencieuse comme annoncé.' },
    { product: products[4]._id, user: client._id, rating: 4, comment: 'Tissu agréable, taille correcte.' },
    { product: products[2]._id, user: clients[2]._id, rating: 5, comment: 'Charge mon téléphone en un rien de temps.' },
  ]);
  for (const p of [products[0], products[1], products[2], products[4]]) await recomputeRating(p._id);

  // Demandes de devis / questions pour la messagerie de l'admin
  await Inquiry.create([
    {
      user: clients[2]._id,
      type: 'devis',
      product: products[4]._id,
      productName: products[4].name,
      subject: 'Devis pour 200 T-shirts floqués',
      quantity: 200,
      budget: 900000,
      messages: [{ from: 'client', text: "Bonjour, je souhaite 200 T-shirts avec le logo de mon association. Pouvez-vous me proposer un prix et un délai ?" }],
      unreadByAdmin: true,
    },
    {
      user: client._id,
      type: 'question',
      product: products[0]._id,
      productName: products[0].name,
      subject: 'Casque Bluetooth — garantie',
      messages: [
        { from: 'client', text: 'La garantie de 12 mois est-elle bien valable au Sénégal ?' },
        { from: 'admin', text: 'Bonjour, oui : la garantie est assurée par notre boutique, présentez simplement votre facture.' },
      ],
      status: 'Répondu',
      unreadByAdmin: false,
      unreadByClient: true,
    },
  ]);

  await loadCatalog({ log: console.log });

  // Place de marché : un vendeur validé avec quelques produits, et une boutique en attente de validation
  const markets = Object.fromEntries((await Market.find()).map((m) => [m.slug, m]));
  const wear = await Category.findOne({ name: 'Vêtements' });
  const acc = await Category.findOne({ name: 'Accessoires' });
  const seller = await User.create({ name: 'Fatou Sow', email: 'vendeur@boutik.sn', password: 'Vendeur123!', phone: '770000099' });
  const demoShop = await Supplier.create({ name: 'Atelier Fatou', owner: seller._id, market: markets.hlm._id, status: 'approved', city: 'Dakar', phone: '770000099', rating: 0, yearsActive: 0, responseHours: 24, onTimeRate: 0, repurchaseRate: 0, description: 'Couture et accessoires en tissu wax, faits main à Dakar.' });
  await User.updateOne({ _id: seller._id }, { shop: demoShop._id });
  const demoProducts = [
    { name: 'Pagne wax bleu 6 yards', price: 11000, stock: 40, moq: 1, category: wear._id, description: 'Wax 100 % coton, motifs bleus.', priceTiers: [{ minQty: 10, price: 9500 }] },
    { name: 'Sac en tissu wax', price: 12500, stock: 15, category: acc._id, description: 'Sac cabas doublé, fermeture zippée.' },
    { name: 'Trousse de toilette en wax', price: 4500, stock: 60, category: acc._id, description: 'Trousse imperméable doublée.' },
  ];
  for (const p of demoProducts) await Product.create({ ...p, supplier: demoShop._id, image: imagePath(p.name) });
  const newcomer = await User.create({ name: 'Karim Ndiaye', email: 'nouveau@boutik.sn', password: 'Nouveau123!' });
  const pendingShop = await Supplier.create({ name: 'Boutique Karim', owner: newcomer._id, market: markets.colobane._id, status: 'pending', city: 'Thiès', rating: 0, yearsActive: 0, responseHours: 24, onTimeRate: 0, repurchaseRate: 0, description: 'Matériel informatique reconditionné.' });
  await User.updateOne({ _id: newcomer._id }, { shop: pendingShop._id });

  // Boutiques de démonstration réparties dans les cinq marchés
  const categoriesByName = Object.fromEntries((await Category.find()).map((c) => [c.name, c]));
  for (const [i, d] of demoShops.entries()) {
    const owner = await User.create({ name: `Vendeur ${d.name}`, email: `boutique${i + 1}@boutik.sn`, password: 'Vendeur123!', phone: `7700001${String(i).padStart(2, '0')}` });
    const shop = await Supplier.create({ name: d.name, owner: owner._id, market: markets[d.market]._id, status: 'approved', verified: Boolean(d.verified), city: d.city, description: d.description, rating: 0, yearsActive: 0, responseHours: 24, onTimeRate: 0, repurchaseRate: 0 });
    await User.updateOne({ _id: owner._id }, { shop: shop._id });
    for (const p of d.products) {
      await Product.create({ name: p.name, price: p.price, stock: p.stock, category: categoriesByName[p.category]._id, description: p.description, priceTiers: p.tiers || [], supplier: shop._id, image: imagePath(p.name), sold: 5 + ((i * 7 + p.price) % 60) });
    }
  } // + ~110 produits, 10 catégories et 9 vendeurs supplémentaires

  console.log(
    'Base initialisée.\n  Administrateur du projet : admin@boutik.sn / Admin123!\n  Sous-administrateur (produits, commandes, devis) : equipe@boutik.sn / Equipe123!\n  Vendeur (boutique validée) : vendeur@boutik.sn / Vendeur123!  (autres boutiques : boutique1@ à boutique9@boutik.sn / Vendeur123!)\n  Vendeur (boutique en attente) : nouveau@boutik.sn / Nouveau123!\n  Client : client@boutik.sn / Client123!  (autres clients : fatou@, moussa@, awa@, cheikh@boutik.sn / Client123!)\n  Codes promo : BIENVENUE10 (-10 %), TABASKI5000 (-5 000 FCFA dès 20 000 FCFA)'
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
