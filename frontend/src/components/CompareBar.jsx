import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api.js';
import ProductImage from './ProductImage.jsx';
import { useCompare } from '../context/CompareContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// Barre flottante : produits sélectionnés pour la comparaison
export default function CompareBar() {
  const { t } = useI18n();
  const { ids, remove, clear, notice } = useCompare();
  const { pathname } = useLocation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    api.get('/products', { params: { ids: ids.join(',') } }).then((r) => setProducts(r.data)).catch(() => {});
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ids.length === 0 || pathname === '/comparer') return notice ? <div className="compare-notice">{notice}</div> : null;
  const byId = new Map(products.map((p) => [p._id, p]));

  return (
    <div className="compare-bar" role="region" aria-label={t('Comparateur')}>
      {notice && <div className="compare-notice">{notice}</div>}
      <div className="container compare-inner">
        <strong>{t('Comparer ({n}/4)', { n: ids.length })}</strong>
        <div className="compare-items">
          {ids.map((id) => (
            <span className="compare-chip" key={id}>
              {byId.get(id) ? <ProductImage product={byId.get(id)} className="chip-img" /> : null}
              <span className="chip-name">{byId.get(id)?.name || '…'}</span>
              <button onClick={() => remove(id)} aria-label={t('Retirer de la comparaison')}>✕</button>
            </span>
          ))}
        </div>
        <button className="btn btn-ghost btn-small" onClick={clear}>{t('Vider')}</button>
        <Link to="/comparer" className={`btn btn-accent btn-small ${ids.length < 2 ? 'disabled' : ''}`} aria-disabled={ids.length < 2}>{ids.length < 2 ? t('Comparer (2 minimum)') : t('Comparer')}
        </Link>
      </div>
    </div>
  );
}
