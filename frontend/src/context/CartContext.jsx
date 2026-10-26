import { createContext, useContext, useEffect, useState } from 'react';
import { unitPriceFor } from '../utils.js';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

// Libellé d'une variante : { Couleur: 'Noir', Taille: 'M' } -> « Couleur : Noir / Taille : M »
export const variantLabel = (v) => Object.entries(v || {}).map(([k, x]) => `${k} : ${x}`).join(' / ');
// Un même produit peut figurer plusieurs fois dans le panier avec des variantes différentes
const keyOf = (id, variant) => `${id}|${variantLabel(variant)}`;

const snapshot = (p, quantity, variant) => ({
  key: keyOf(p._id, variant),
  _id: p._id,
  name: p.name,
  price: p.price,
  image: p.image,
  stock: p.stock,
  moq: p.moq || 1,
  priceTiers: p.priceTiers || [],
  freeShipping: Boolean(p.freeShipping),
  variant: variant || {},
  quantity,
});

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      // anciens paniers (sans `key`) : on complète
      return (JSON.parse(localStorage.getItem('cart')) || []).map((i) => ({ variant: {}, ...i, key: i.key || keyOf(i._id, i.variant) }));
    } catch {
      return [];
    }
  });

  useEffect(() => localStorage.setItem('cart', JSON.stringify(items)), [items]);

  // La quantité minimum de commande (MOQ) s'applique au produit (toutes variantes confondues)
  const add = (product, quantity = 1, variant = {}) =>
    setItems((prev) => {
      const moq = product.moq || 1;
      const key = keyOf(product._id, variant);
      const others = prev.filter((i) => i._id === product._id && i.key !== key).reduce((s, i) => s + i.quantity, 0);
      const room = Math.max(product.stock - others, 0); // le stock est partagé entre les variantes
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? snapshot(product, Math.min(i.quantity + quantity, room), variant) : i));
      const base = others > 0 ? quantity : Math.max(quantity, moq);
      return [...prev, snapshot(product, Math.min(base, room), variant)];
    });

  const remove = (key) => setItems((prev) => prev.filter((i) => i.key !== key));

  const setQuantity = (key, quantity) =>
    setItems((prev) => {
      const line = prev.find((i) => i.key === key);
      if (!line) return prev;
      const others = prev.filter((i) => i._id === line._id && i.key !== key).reduce((s, i) => s + i.quantity, 0);
      const min = others > 0 ? 1 : line.moq || 1;
      return prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(min, Math.min(quantity, i.stock - others)) } : i));
    });

  const clear = () => setItems([]);

  // quantité totale d'un produit dans le panier : c'est elle qui détermine le prix dégressif
  const productQty = (id) => items.filter((i) => i._id === id).reduce((s, i) => s + i.quantity, 0);
  const unitPrice = (i) => unitPriceFor(i, productQty(i._id));
  const total = items.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQuantity, clear, total, count, unitPrice, productQty }}>{children}</CartContext.Provider>
  );
}
