import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import ProductImage from '../components/ProductImage.jsx';
import Stars from '../components/Stars.jsx';
import { useCompare } from '../context/CompareContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fcfa, num, priceRange } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Comparateur de produits : tableau côte à côte (prix, quantité minimum, vendeur, caractéristiques…)
export default function Compare() {
  const { t } = useI18n();
  const { ids, remove, clear } = useCompare();
  const { add } = useCart();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get('/products', { params: { ids: ids.join(',') } })
      .then((r) => {
        const order = new Map(ids.map((id, i) => [id, i]));
        setProducts([...r.data].sort((a, b) => order.get(a._id) - order.get(b._id)));
        setError('');
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toutes les caractéristiques rencontrées, dans l'ordre
  const specLabels = useMemo(() => [...new Set(products.flatMap((p) => (p.specs || []).map((s) => s.label)))], [products]);
  const lowest = useMemo(() => Math.min(...products.map((p) => p.price)), [products]);

  if (loading) return <p className="empty">{t('Chargement…')}</p>;
  if (products.length === 0)
    return (
      <>
        <h1>{t('Comparer des produits')}</h1>
        <p className="empty">{t('Aucun produit à comparer. Cochez « Comparer » sur les produits qui vous intéressent.')}{' '}<Link to="/produits">{t('Voir les produits')}</Link></p>
      </>
    );

  const specOf = (p, label) => p.specs?.find((s) => s.label === label)?.value || '—';
  const rows = [
    ['Prix', (p) => {
      const { min, max, tiered } = priceRange(p);
      return <><strong className={p.price === lowest && products.length > 1 ? 'text-green' : ''}>{tiered ? `${num(min)} – ${num(max)} FCFA` : fcfa(p.price)}</strong>{p.oldPrice > p.price && <> <s className="old-price">{fcfa(p.oldPrice)}</s></>}</>;
    }],
    ['Prix dégressifs', (p) => (p.priceTiers?.length ? p.priceTiers.map((t) => <div key={t.minQty}>≥ {t.minQty} : {fcfa(t.price)}</div>) : '—')],
    ['Quantité minimum', (p) => t((p.moq || 1) > 1 ? '{n} pièces' : '{n} pièce', { n: p.moq || 1 })],
    ['Note', (p) => (p.ratingCount > 0 ? <><Stars value={p.ratingAvg} /> <span className="muted small">({num(p.ratingCount)})</span></> : '—')],
    ['Vendus', (p) => num(p.sold)],
    ['Marque', (p) => p.brand || '—'],
    ['Vendeur', (p) => (p.supplier ? <Link to={`/vendeurs/${p.supplier._id}`}>{p.supplier.name}{p.supplier.verified ? ' ✔' : ''}</Link> : '—')],
    ['Livraison', (p) => (p.freeShipping ? <span className="text-green">{t('Gratuite')}</span> : 'Selon commande')],
    ['Disponibilité', (p) => (p.stock <= 0 ? <span className="text-red">{t('Épuisé')}</span> : p.stock <= 5 ? t('Plus que {n}', { n: p.stock }) : t('En stock'))],
    ['Options', (p) => (p.options?.length ? p.options.map((o) => <div key={o.name}>{t(o.name)} : {o.values.map((v) => t(v)).join(', ')}</div>) : '—')],
    ['Échantillon', (p) => (p.sampleAvailable ? 'Disponible' : '—')],
    ...specLabels.map((l) => [l, (p) => specOf(p, l)]),
  ];

  return (
    <>
      <div className="page-head">
        <div><h1>{t('Comparer des produits')}</h1><span className="muted">{products.length}{' '}{t('produit')}{products.length > 1 ? 's' : ''}{' '}{t('· le prix le plus bas est en vert')}</span></div>
        <button className="btn btn-ghost" onClick={clear}>{t('Tout retirer')}</button>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="compare-scroll card">
        <table className="compare-table">
          <thead>
            <tr>
              <th />
              {products.map((p) => (
                <th key={p._id}>
                  <Link to={`/produits/${p._id}`}><ProductImage product={p} className="compare-img" /><span>{p.name}</span></Link>
                  <div className="row">
                    {!isAdmin && p.stock > 0 && !p.options?.length && <button className="btn btn-small btn-primary" onClick={() => add(p, p.moq || 1)}>{t('Ajouter au panier')}</button>}
                    {!isAdmin && p.options?.length > 0 && <Link className="btn btn-small btn-primary" to={`/produits/${p._id}`}>{t('Choisir les options')}</Link>}
                    <button className="btn btn-small btn-ghost" onClick={() => remove(p._id)}>{t('Retirer')}</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, render]) => (
              <tr key={label}>
                <th scope="row">{t(label)}</th>
                {products.map((p) => <td key={p._id}>{render(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
