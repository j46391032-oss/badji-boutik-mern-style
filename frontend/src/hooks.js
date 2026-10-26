import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// Produits consultés récemment (stockés dans le navigateur)
const KEY = 'recent';
export const getRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};
export const pushRecent = (id) => {
  const list = [id, ...getRecent().filter((x) => x !== id)].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(list));
};
