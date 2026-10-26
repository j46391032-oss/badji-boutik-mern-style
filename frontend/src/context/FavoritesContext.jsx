import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext(null);
export const useFavorites = () => useContext(FavoritesContext);

export function FavoritesProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    if (!user || isAdmin) return setIds([]);
    api.get('/favorites').then((r) => setIds(r.data.map((p) => p._id))).catch(() => setIds([]));
  }, [user, isAdmin]);

  const isFavorite = (id) => ids.includes(id);

  const toggle = async (id) => {
    const had = ids.includes(id);
    setIds((prev) => (had ? prev.filter((x) => x !== id) : [...prev, id])); // mise à jour immédiate
    try {
      await (had ? api.delete(`/favorites/${id}`) : api.put(`/favorites/${id}`));
    } catch {
      setIds((prev) => (had ? [...prev, id] : prev.filter((x) => x !== id))); // annule si le serveur refuse
    }
  };

  return <FavoritesContext.Provider value={{ ids, isFavorite, toggle }}>{children}</FavoritesContext.Provider>;
}
