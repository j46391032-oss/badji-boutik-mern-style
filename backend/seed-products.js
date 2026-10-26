// Ajoute (ou complète) le catalogue de produits SANS effacer les données existantes
// (utilisateurs, commandes, produits déjà créés restent intacts).
// Usage : npm run seed:catalog      (ou npm run seed:products)
// Pour ajouter vos propres produits, éditez backend/data/catalog.js
require('dotenv').config();
const mongoose = require('mongoose');
const loadCatalog = require('./utils/loadCatalog');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce');
  await loadCatalog({ log: console.log });
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
