const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/error');
const audit = require('./middleware/audit');
const { securityHeaders, sanitize } = require('./middleware/security');
const rateLimit = require('./middleware/rateLimit');

const app = express();
app.disable('x-powered-by');
// Nombre de proxys devant le serveur (TRUST_PROXY, 1 par défaut : Render ou nginx seul). Avec un proxy de plus devant
// (Caddy, Cloudflare…), mettez 2 : sinon les limites de débit prennent l'adresse du proxy pour celle du visiteur.
app.set('trust proxy', Number.isInteger(Number(process.env.TRUST_PROXY)) ? Number(process.env.TRUST_PROXY) : 1);
// CLIENT_URL peut contenir plusieurs adresses séparées par des virgules
app.use(securityHeaders);
app.use(cors({ origin: require('./utils/origins').list(), maxAge: 600 }));
app.use(express.json({ limit: '300kb' }));
app.use(sanitize); // injections NoSQL et paramètres répétés
app.use(audit); // journal d'activité du personnel
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
// Fichiers envoyés : servis comme de simples images (jamais exécutés par le navigateur)
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    next();
  },
  express.static(process.env.UPLOADS_DIR || path.join(__dirname, 'uploads'), { dotfiles: 'deny', index: false, maxAge: '7d' })
);

// Limite générale par adresse IP, puis des limites plus serrées sur les routes sensibles (voir les fichiers de routes)
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300, message: 'Trop de requêtes, patientez une minute.' }));
app.get('/api', (req, res) => res.json({ message: 'API E-commerce opérationnelle' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' })); // utilisé par Docker / Render
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/favorites', require('./routes/favoriteRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/banners', require('./routes/bannerRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/team', require('./routes/teamRoutes'));
app.use('/api/seller', require('./routes/sellerRoutes'));
app.use('/api/markets', require('./routes/marketRoutes'));
app.use('/api/store', require('./routes/storeRoutes'));
app.use('/api/endcaps', require('./routes/endcapRoutes'));
app.use('/api/planogram', require('./routes/planogramRoutes'));
app.use('/api/shops', require('./routes/shopRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
