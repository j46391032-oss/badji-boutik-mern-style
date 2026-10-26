import { useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// Rangée de produits à faire défiler (style Amazon)
export default function ProductRow({ title, products, to, ranked = false }) {
  const { t } = useI18n();
  const ref = useRef(null);
  if (!products || products.length === 0) return null;
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });

  return (
    <section className="row-section card">
      <div className="section-head">
        <h2>{title}</h2>
        {to && <Link to={to}>{t('Voir plus ›')}</Link>}
      </div>
      <div className="row-wrap">
        <button className="row-arrow left" onClick={() => scroll(-1)} aria-label={t('Précédent')}>‹</button>
        <div className="product-row" ref={ref}>
          {products.map((p, i) => (
            <div className="row-item" key={p._id}><ProductCard product={p} rank={ranked ? i + 1 : undefined} /></div>
          ))}
        </div>
        <button className="row-arrow right" onClick={() => scroll(1)} aria-label={t('Suivant')}>›</button>
      </div>
    </section>
  );
}
