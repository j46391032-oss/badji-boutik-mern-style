const { evaluateCoupon } = require('../utils/coupon');

const base = { active: true, type: 'percent', value: 10, minOrder: 0, maxUses: 0, usedCount: 0, expiresAt: null };

describe('evaluateCoupon', () => {
  test('pourcentage arrondi', () => {
    expect(evaluateCoupon(base, 25000)).toEqual({ ok: true, discount: 2500 });
    expect(evaluateCoupon({ ...base, value: 15 }, 8500)).toEqual({ ok: true, discount: 1275 });
  });
  test('montant fixe, plafonné au sous-total', () => {
    expect(evaluateCoupon({ ...base, type: 'fixed', value: 5000 }, 20000).discount).toBe(5000);
    expect(evaluateCoupon({ ...base, type: 'fixed', value: 5000 }, 3000).discount).toBe(3000);
  });
  test('refuse un code inconnu ou désactivé', () => {
    expect(evaluateCoupon(null, 1000).ok).toBe(false);
    expect(evaluateCoupon({ ...base, active: false }, 1000).ok).toBe(false);
  });
  test('refuse un code expiré', () => {
    const r = evaluateCoupon({ ...base, expiresAt: new Date('2020-01-01') }, 1000);
    expect(r).toEqual({ ok: false, message: 'Ce code promo a expiré' });
  });
  test('refuse un code épuisé', () => {
    expect(evaluateCoupon({ ...base, maxUses: 2, usedCount: 2 }, 1000).ok).toBe(false);
    expect(evaluateCoupon({ ...base, maxUses: 2, usedCount: 1 }, 1000).ok).toBe(true);
  });
  test('respecte le minimum de commande', () => {
    expect(evaluateCoupon({ ...base, minOrder: 20000 }, 19999).ok).toBe(false);
    expect(evaluateCoupon({ ...base, minOrder: 20000 }, 20000).ok).toBe(true);
  });
});
