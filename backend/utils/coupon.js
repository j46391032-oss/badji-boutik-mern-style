// Vérifie un code promo et calcule la remise. Fonction pure (facile à tester).
function evaluateCoupon(coupon, subtotal, now = new Date()) {
  if (!coupon || !coupon.active) return { ok: false, message: 'Code promo invalide' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return { ok: false, message: 'Ce code promo a expiré' };
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { ok: false, message: "Ce code promo n'est plus disponible" };
  if (subtotal < (coupon.minOrder || 0)) {
    return { ok: false, message: `Commande minimum de ${coupon.minOrder} FCFA pour ce code` };
  }
  const raw = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  const discount = Math.min(Math.max(raw, 0), subtotal); // jamais plus que le sous-total
  return { ok: true, discount };
}

module.exports = { evaluateCoupon };
