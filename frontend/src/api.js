import axios from 'axios';
import { translate } from './i18n/I18nContext.jsx';

// En production (Vercel / Render), définissez VITE_API_URL = URL du backend, sans /api final
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const api = axios.create({ baseURL: `${API_URL}/api` });

// Ajoute automatiquement le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Extrait un message d'erreur lisible
// (les messages du serveur sont en français : ceux qui figurent dans le dictionnaire sont traduits)
export const errMsg = (e) => translate(e?.response?.data?.message || e?.message || 'Une erreur est survenue');

// Les images envoyées par l'admin sont servies par le backend (/uploads/...)
export const assetUrl = (src) => (src && src.startsWith('/uploads') ? `${API_URL}${src}` : src);

export default api;
