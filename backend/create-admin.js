// Crée le premier administrateur du projet (compte « superadmin ») SANS données de démonstration.
// À utiliser en production à la place de « seed.js » :
//   ADMIN_EMAIL=moi@exemple.com ADMIN_PASSWORD='MotDePasse2026' ADMIN_NAME='Mon Nom' npm run admin:create
// (ou avec --email / --password / --name ; préférez les variables d'environnement : un mot de passe passé en
//  argument reste visible dans l'historique de votre terminal)
// Peut être lancé depuis votre ordinateur en pointant MONGO_URI vers la base de production (MongoDB Atlas).
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { passwordProblem } = require('./utils/password');
const ensureStore = require('./utils/ensureStore');
const ensureMarkets = require('./utils/ensureMarkets');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

(async () => {
  const email = String(arg('--email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(arg('--password') || process.env.ADMIN_PASSWORD || '');
  const name = String(arg('--name') || process.env.ADMIN_NAME || 'Administrateur').trim();
  if (!email || !password) {
    console.error("Indiquez ADMIN_EMAIL et ADMIN_PASSWORD (variables d'environnement) ou --email et --password.");
    process.exit(1);
  }
  const problem = passwordProblem(password);
  if (problem) {
    console.error(`⛔ ${problem}.`);
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('⛔ MONGO_URI est absent (adresse de la base MongoDB).');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  if (await User.exists({ email })) {
    console.error(`⛔ Un compte existe déjà avec ${email}.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  await User.create({ name, email, password, role: 'superadmin' });
  await ensureStore(); // rayons du magasin
  await ensureMarkets(); // les cinq marchés
  console.log(`✅ Administrateur du projet créé : ${email}\n   Connectez-vous sur le site, puis activez la double authentification (Mon profil → Sécurité du compte).`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
