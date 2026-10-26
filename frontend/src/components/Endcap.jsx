import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { fcfa } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Tête de gondole : le bout d'allée réservé aux promotions, aux marques partenaires et aux produits de saison
export function Endcap({ endcap }) {
  const { t } = useI18n();
  const label = { promo: '🔥 Promotion', brand: '🤝 Marque partenaire', seasonal: '🎉 Produits de saison' }[endcap.kind] || '🔥 Promotion';
  return (
    <section className="endcap" style={{ '--ec': endcap.color || '#08855c' }} aria-label={endcap.title}>
      <header>
        <span className="endcap-label">{t(label)}</span>
        <h3>{endcap.title}</h3>
        {endcap.subtitle && <p>{endcap.subtitle}</p>}
      </header>
      <div className="endcap-items">
        {endcap.products.map((p) => (
          <Link key={p._id} to={`/produits/${p._id}`} className="endcap-item">
            <ProductImage product={p} />
            <span className="endcap-name">{p.name}</span>
            <span><strong>{fcfa(p.price)}</strong>{p.oldPrice > p.price && <s className="old-price"> {fcfa(p.oldPrice)}</s>}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function EndcapList({ endcaps }) {
  if (!endcaps || endcaps.length === 0) return null;
  return <div className="endcap-list">{endcaps.map((e) => <Endcap key={e._id} endcap={e} />)}</div>;
}
