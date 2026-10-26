// Têtes de gondole de démonstration (créées une seule fois, si aucune n'existe encore).
const Endcap = require('../models/Endcap');
const Product = require('../models/Product');
const Category = require('../models/Category');

const DEFS = [
  { title: 'Arrivage du jour', subtitle: 'Fruits et légumes de saison, livrés ce matin', kind: 'promo', color: '#2f9e44', zones: ['fresh'], showOnStore: true, order: 1,
    products: ['Mangues Kent (1 kg)', 'Bananes (1 kg)', 'Tomates fraîches (1 kg)', 'Pastèque (pièce de 5 kg)', 'Oranges (1 kg)'] },
  { title: 'Marque partenaire : Casamance Saveurs', subtitle: 'Les saveurs du terroir, directement des producteurs', kind: 'brand', brand: 'Casamance Saveurs', color: '#c2410c', zones: ['grocery'], rayons: ['Alimentation & Boissons'], order: 2,
    products: ['Café Touba moulu 500 g', 'Miel de Casamance 500 g', 'Noix de cajou 1 kg', 'Bissap séché 500 g'] },
  { title: 'Promo ménage', subtitle: 'Faites le plein pour la maison', kind: 'promo', color: '#7c3aed', rayons: ['Entretien & ménage'], zones: [], order: 3,
    products: ['Lessive en poudre (2 kg)', 'Eau de Javel (1 L)', 'Liquide vaisselle (750 ml)', 'Éponges de cuisine (lot de 10)'] },
  { title: 'Rentrée scolaire', subtitle: 'Cahiers, stylos, cartables : tout pour bien commencer', kind: 'seasonal', color: '#1c7ed6', rayons: ['Bureau & Papeterie', 'Bébé & Enfants'], zones: [], showOnStore: true, order: 4,
    products: ['Cahiers 96 pages (lot de 20)', 'Stylos à bille (boîte de 50)', 'Cartable scolaire', 'Ramette papier A4 (carton de 5)', 'Sac à dos pour ordinateur 15,6"'] },
  { title: 'Spécial Tabaski', subtitle: 'Gigot, boubou et tenues de fête', kind: 'seasonal', color: '#9b3fb5', zones: ['fresh', 'general'], showOnStore: true, order: 5,
    products: ['Gigot de mouton (1 kg)', 'Grand boubou femme brodé', 'Ensemble bazin homme', 'Babouches artisanales en cuir'] },
];

async function seedEndcaps(log = () => {}) {
  if (await Endcap.exists({})) return 0;
  let n = 0;
  for (const d of DEFS) {
    const products = await Product.find({ name: { $in: d.products } }).select('_id');
    const rayons = await Category.find({ name: { $in: d.rayons || [] } }).select('_id');
    if (!products.length) continue;
    await Endcap.create({ ...d, products: products.map((p) => p._id), rayons: rayons.map((c) => c._id) });
    n++;
  }
  log(`${n} tête(s) de gondole créée(s).`);
  return n;
}

module.exports = seedEndcaps;
