import { createContext, useContext } from 'react';

// Les écrans de gestion (produits, commandes, messages) servent à l'administration ET à l'espace vendeur :
// ce contexte indique quelles routes de l'API et quels liens utiliser.
export const ADMIN_SCOPE = {
  seller: false, base: '/admin', productsList: '/products', productApi: '/products', ordersList: '/orders', ordersExport: '/orders/export',
  inquiriesList: '/inquiries', uploadPath: '/products/upload',
};
export const SELLER_SCOPE = {
  seller: true, base: '/vendeur', productsList: '/seller/products', productApi: '/seller/products', ordersList: '/seller/orders', ordersExport: '/seller/orders/export',
  inquiriesList: '/seller/inquiries', uploadPath: '/seller/upload',
};
export const ScopeContext = createContext(ADMIN_SCOPE);
export const useScope = () => useContext(ScopeContext);
