require('dotenv').config();
const connectDB = require('./config/db');
const ensureOwner = require('./utils/ensureOwner');
const checkEnv = require('./utils/checkEnv');
const ensureMarkets = require('./utils/ensureMarkets');
const ensureStore = require('./utils/ensureStore');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET manquant : copiez .env.example vers .env');
  process.exit(1);
}

const app = require('./app');
const PORT = process.env.PORT || 5000;
checkEnv(); // refuse de démarrer en production avec un JWT_SECRET faible
connectDB()
  .then(() => ensureOwner(console.log))
  .then(() => ensureStore(console.log))
  .then(() => ensureMarkets(console.log))
  .then(() => app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`)));
