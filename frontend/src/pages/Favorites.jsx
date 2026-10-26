import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Favorites() {
  const { t } = useI18n();
  const { ids } = useFavorites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/favorites').then((r) => setProducts(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, []);

  // un produit retiré avec le cœur disparaît aussitôt de la liste
  const shown = products.filter((p) => ids.includes(p._id));

  return (
    <>
      <h1>{t('Mes favoris')}</h1>
      {error && <p className="alert alert-error">{error}</p>}
      {loading ? (
        <p className="empty">{t('Chargement…')}</p>
      ) : shown.length === 0 ? (
        <p className="empty">{t('Aucun favori pour le moment.')}{' '}<Link to="/produits">{t('Parcourir les produits')}</Link></p>
      ) : (
        <div className="grid">{shown.map((p) => <ProductCard key={p._id} product={p} />)}</div>
      )}
    </>
  );
}
