import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import { I18nProvider, LangKey } from './i18n/I18nContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import './styles.css';
import './store.css';
import './admin.css';
import './polish.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
      <SettingsProvider>
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <CompareProvider>
                <LangKey>
                  <App />
                </LangKey>
              </CompareProvider>
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </SettingsProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
