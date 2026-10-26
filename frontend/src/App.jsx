import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import MyOrders from './pages/MyOrders.jsx';
import Profile from './pages/Profile.jsx';
import Favorites from './pages/Favorites.jsx';
import MyInquiries from './pages/MyInquiries.jsx';
import RequestQuote from './pages/RequestQuote.jsx';
import Help from './pages/Help.jsx';
import Compare from './pages/Compare.jsx';
import Suppliers from './pages/Suppliers.jsx';
import SupplierStore from './pages/SupplierStore.jsx';
import CompareBar from './components/CompareBar.jsx';
import AdminTeam from './pages/admin/AdminTeam.jsx';
import AdminLog from './pages/admin/AdminLog.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import AdminShops from './pages/admin/AdminShops.jsx';
import AdminMarkets from './pages/admin/AdminMarkets.jsx';
import AdminPlanogram from './pages/admin/AdminPlanogram.jsx';
import AdminEndcaps from './pages/admin/AdminEndcaps.jsx';
import PickList from './pages/admin/PickList.jsx';
import Sell from './pages/Sell.jsx';
import Markets from './pages/Markets.jsx';
import Store from './pages/Store.jsx';
import Zone from './pages/Zone.jsx';
import Rayon from './pages/Rayon.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Market from './pages/Market.jsx';
import SellerLayout from './components/seller/SellerLayout.jsx';
import SellerDashboard from './pages/seller/SellerDashboard.jsx';
import SellerEarnings from './pages/seller/SellerEarnings.jsx';
import SellerShop from './pages/seller/SellerShop.jsx';
import Invoice from './pages/Invoice.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminProductForm from './pages/admin/AdminProductForm.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminCustomers from './pages/admin/AdminCustomers.jsx';
import AdminReviews from './pages/admin/AdminReviews.jsx';
import AdminInquiries from './pages/admin/AdminInquiries.jsx';
import AdminCoupons from './pages/admin/AdminCoupons.jsx';
import AdminSuppliers from './pages/admin/AdminSuppliers.jsx';
import AdminBanners from './pages/admin/AdminBanners.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import { useI18n } from './i18n/I18nContext.jsx';

// Mise en page de la boutique : en-tête, contenu, pied de page
function StoreLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <>
      <Navbar />
      <main className="container page">
        <Outlet />
      </main>
      <Footer />
      <CompareBar />
      <CookieBanner />
    </>
  );
}

const client = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  const { t } = useI18n();
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/produits" element={<Products />} />
        <Route path="/produits/:id" element={<ProductDetail />} />
        <Route path="/panier" element={<Cart />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/aide" element={<Help />} />
        <Route path="/comparer" element={<Compare />} />
        <Route path="/vendeurs" element={<Suppliers />} />
        <Route path="/vendeurs/:id" element={<SupplierStore />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/vendre" element={<Sell />} />
        <Route path="/boutique-officielle" element={<Store />} />
        <Route path="/boutique-officielle/produits" element={<Products part="official" />} />
        <Route path="/boutique-officielle/:zone" element={<Zone />} />
        <Route path="/rayon/:slug" element={<Rayon />} />
        <Route path="/marches" element={<Markets />} />
        <Route path="/marches/:slug" element={<Market />} />
        <Route path="/demande-devis" element={<RequestQuote />} />

        <Route path="/mes-commandes" element={client(<MyOrders />)} />
        <Route path="/mes-devis" element={client(<MyInquiries />)} />
        <Route path="/favoris" element={client(<Favorites />)} />
        <Route path="/profil" element={client(<Profile />)} />
        <Route path="/facture/:id" element={client(<Invoice />)} />

        <Route path="*" element={<p className="empty">{t('Cette page n\'existe pas.')}</p>} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminHome />} />
        <Route path="produits" element={<ProtectedRoute module="produits"><AdminProducts /></ProtectedRoute>} />
        <Route path="produits/nouveau" element={<ProtectedRoute module="produits"><AdminProductForm /></ProtectedRoute>} />
        <Route path="produits/:id" element={<ProtectedRoute module="produits"><AdminProductForm /></ProtectedRoute>} />
        <Route path="categories" element={<ProtectedRoute module="produits"><AdminCategories /></ProtectedRoute>} />
        <Route path="vendeurs" element={<ProtectedRoute module="produits"><AdminSuppliers /></ProtectedRoute>} />
        <Route path="bannieres" element={<ProtectedRoute module="produits"><AdminBanners /></ProtectedRoute>} />
        <Route path="commandes" element={<ProtectedRoute module="commandes"><AdminOrders /></ProtectedRoute>} />
        <Route path="commandes/:id/preparation" element={<ProtectedRoute module="commandes"><PickList /></ProtectedRoute>} />
        <Route path="planogramme" element={<ProtectedRoute module="produits"><AdminPlanogram /></ProtectedRoute>} />
        <Route path="gondoles" element={<ProtectedRoute module="produits"><AdminEndcaps /></ProtectedRoute>} />
        <Route path="devis" element={<ProtectedRoute module="devis"><AdminInquiries /></ProtectedRoute>} />
        <Route path="promos" element={<ProtectedRoute module="promos"><AdminCoupons /></ProtectedRoute>} />
        <Route path="avis" element={<ProtectedRoute module="avis"><AdminReviews /></ProtectedRoute>} />
        <Route path="clients" element={<ProtectedRoute module="clients"><AdminCustomers /></ProtectedRoute>} />
        <Route path="marches" element={<ProtectedRoute module="boutiques"><AdminMarkets /></ProtectedRoute>} />
        <Route path="boutiques" element={<ProtectedRoute module="boutiques"><AdminShops /></ProtectedRoute>} />
        <Route path="equipe" element={<ProtectedRoute owner><AdminTeam /></ProtectedRoute>} />
        <Route path="journal" element={<ProtectedRoute owner><AdminLog /></ProtectedRoute>} />
        <Route path="parametres" element={<ProtectedRoute module="parametres"><AdminSettings /></ProtectedRoute>} />
        <Route path="*" element={<p className="empty">{t('Cette page n\'existe pas.')}</p>} />
      </Route>

      <Route path="/vendeur" element={<ProtectedRoute seller><SellerLayout /></ProtectedRoute>}>
        <Route index element={<SellerDashboard />} />
        <Route path="produits" element={<AdminProducts />} />
        <Route path="produits/nouveau" element={<AdminProductForm />} />
        <Route path="produits/:id" element={<AdminProductForm />} />
        <Route path="commandes" element={<AdminOrders />} />
        <Route path="messages" element={<AdminInquiries />} />
        <Route path="revenus" element={<SellerEarnings />} />
        <Route path="boutique" element={<SellerShop />} />
        <Route path="*" element={<p className="empty">Cette page n'existe pas.</p>} />
      </Route>
    </Routes>
  );
}
