// Adresses autorisées du site (CLIENT_URL, séparées par des virgules) : CORS et retour après connexion Google / Facebook / GitHub
const list = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173,https://badji-boutik-mern-1.onrender.com')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

module.exports = { list };
