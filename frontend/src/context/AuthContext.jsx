import { createContext, useContext, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Rôles : client · admin (sous-administrateur, droits limités) · superadmin (administrateur du projet)
export const MODULES = {
  stats: 'Tableau de bord et statistiques',
  produits: 'Catalogue : produits, catégories, vendeurs, bannières',
  commandes: 'Commandes et retours',
  devis: 'Devis et messages',
  clients: 'Clients',
  promos: 'Codes promo',
  avis: 'Avis clients',
  boutiques: 'Boutiques des vendeurs et commissions',
  parametres: 'Paramètres de la boutique',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  const save = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  // Si la double authentification est activée, le serveur renvoie { twoFactorRequired, challenge } : on n'enregistre rien tant que le code n'est pas validé
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data.twoFactorRequired ? data : save(data);
  };
  const verifyTwoFactor = async (challenge, code) => save((await api.post('/auth/2fa/verify', { challenge, code })).data);
  // retour de Google / Facebook / GitHub : le serveur a donné un jeton, on charge le profil avec
  const signInWithToken = async (token) => {
    localStorage.setItem('token', token);
    try {
      return save((await api.get('/auth/profile')).data);
    } catch (e) {
      localStorage.removeItem('token');
      throw e;
    }
  };
  const register = async (form) => save((await api.post('/auth/register', form)).data);
  const updateProfile = async (form) => save((await api.put('/auth/profile', form)).data);

  // recharge le profil (rôle et droits peuvent avoir changé depuis la dernière connexion)
  const refresh = async () => save((await api.get('/auth/profile')).data);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isOwner = user?.role === 'superadmin';
  const isStaff = user?.role === 'admin' || isOwner;
  // droit sur un module : l'administrateur du projet a tout, un sous-administrateur seulement ce qui lui est accordé
  const can = (mod) => isOwner || (user?.role === 'admin' && (user.permissions || []).includes(mod));

  return (
    <AuthContext.Provider value={{ user, isAdmin: isStaff, isOwner, isSeller: Boolean(user?.shop), can, refresh, saveSession: save, signInWithToken, verifyTwoFactor, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
