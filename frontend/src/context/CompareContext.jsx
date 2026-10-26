import { createContext, useContext, useEffect, useState } from 'react';
import { translate } from '../i18n/I18nContext.jsx';

const CompareContext = createContext(null);
export const useCompare = () => useContext(CompareContext);
export const MAX_COMPARE = 4;

// Liste de comparaison (jusqu'à 4 produits), conservée dans le navigateur
export function CompareProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('compare')) || [];
    } catch {
      return [];
    }
  });
  const [notice, setNotice] = useState('');

  useEffect(() => localStorage.setItem('compare', JSON.stringify(ids)), [ids]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const has = (id) => ids.includes(id);
  const toggle = (id) =>
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) {
        setNotice(translate('Vous pouvez comparer {n} produits au maximum.', { n: MAX_COMPARE }));
        return prev;
      }
      return [...prev, id];
    });
  const remove = (id) => setIds((prev) => prev.filter((x) => x !== id));
  const clear = () => setIds([]);

  return <CompareContext.Provider value={{ ids, has, toggle, remove, clear, notice }}>{children}</CompareContext.Provider>;
}
