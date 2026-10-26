// Langue des nombres et des dates : changée par I18nProvider quand le visiteur choisit une langue
let locale = 'fr-FR';
export const setLocale = (l) => { locale = l; };

export const fcfa = (n) => `${new Intl.NumberFormat(locale).format(Math.round(n || 0))} FCFA`;
export const num = (n) => new Intl.NumberFormat(locale).format(n || 0);

export const formatDate = (d) =>
  new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

export const formatDateTime = (d) =>
  new Date(d).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const STATUSES = ['En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];
export const PAYMENTS = ['Paiement à la livraison (espèces)', 'Wave à la livraison', 'Orange Money à la livraison'];

// Prix unitaire selon la quantité (prix dégressifs) — même règle que le serveur
export const unitPriceFor = (item, qty) => {
  let price = item.price;
  let best = 0;
  for (const t of item.priceTiers || []) if (qty >= t.minQty && t.minQty > best) { best = t.minQty; price = t.price; }
  return price;
};

// Frais de livraison — même règle que le serveur (aperçu seulement, le serveur recalcule)
export const shippingFor = (settings, items, subtotal) => {
  const fee = settings?.shippingFee || 0;
  if (fee <= 0 || items.length === 0) return 0;
  if (items.every((i) => i.freeShipping)) return 0;
  const threshold = settings?.freeShippingThreshold || 0;
  return threshold > 0 && subtotal >= threshold ? 0 : fee;
};

// Vente flash encore active ?
export const flashActive = (p) => Boolean(p?.flashSaleEnds && new Date(p.flashSaleEnds) > new Date());

// Fourchette de prix affichée quand il y a des prix dégressifs
export const priceRange = (p) => {
  const prices = [p.price, ...(p.priceTiers || []).map((t) => t.price)];
  return { min: Math.min(...prices), max: Math.max(...prices), tiered: (p.priceTiers || []).length > 0 };
};

export const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')} k` : String(n || 0));

// Ordre de parcours du magasin : périmètre frais → allées centrales → marchandises générales, puis numéro d'allée
export const ZONE_ORDER = ['fresh', 'grocery', 'general'];
export const sortRayons = (cats) =>
  [...cats].sort((a, b) => (ZONE_ORDER.indexOf(a.zone) + 1 || 9) - (ZONE_ORDER.indexOf(b.zone) + 1 || 9) || (a.aisle || 0) - (b.aisle || 0) || a.name.localeCompare(b.name));

// « Couleur : Noir / Taille : M » -> { Couleur: 'Noir', Taille: 'M' }
export const parseVariant = (label = '') =>
  Object.fromEntries(label.split(' / ').map((part) => part.split(' : ')).filter((kv) => kv.length === 2 && kv[0] && kv[1]));

// Motifs de retour — même liste que le serveur
export const RETURN_REASONS = ['Produit défectueux', 'Produit non conforme à la description', 'Mauvaise taille ou mauvais modèle', 'Produit endommagé à la livraison', 'Autre'];
export const RETURN_STATUSES = ['Demandée', 'Acceptée', 'Refusée', 'Remboursée'];
