// Calculs de prix partagés (fonctions pures, faciles à tester)

// Frais de livraison : gratuits si tous les articles sont en livraison gratuite
// ou si le sous-total atteint le seuil défini dans les réglages (0 = pas de seuil).
function computeShipping(settings, items, subtotal) {
  const fee = settings?.shippingFee || 0;
  if (fee <= 0 || items.length === 0) return 0;
  if (items.every((i) => i.freeShipping)) return 0;
  const threshold = settings?.freeShippingThreshold || 0;
  if (threshold > 0 && subtotal >= threshold) return 0;
  return fee;
}

module.exports = { computeShipping };
