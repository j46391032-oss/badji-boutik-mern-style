import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import ProductImage from './ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { fcfa } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// « Avant de passer en caisse » : petits produits à moins de 2 000 FCFA, comme les rayons de la file de caisse d'un supermarché
export default function ImpulseRow() {
  const { t } = useI18n();
  const { items, add } = useCart();
  const [list, setList] = useState([]);
  const [added, setAdded] = useState({});

  useEffect(() => {
    api.get('/products', { params: { scope: 'official', maxPrice: 2000, inStock: 1, sort: 'best', page: 1, limit: 12 } })
      .then((r) => setList(r.data.items || r.data))
      .catch(() => {});
  }, []);

  const inCart = new Set(items.map((i) => i._id));
  const shown = list.filter((p) => !inCart.has(p._id) && !p.options?.length).slice(0, 6);
  if (shown.length === 0) return null;
  return (
    <section className="impulse card" aria-label={t('Avant de passer en caisse')}>
      <h3>🛒 {t('Avant de passer en caisse')}</h3>
      <p className="muted small">{t('Un petit plus à ajouter, tout près de la caisse.')}</p>
      <div className="impulse-items">
        {shown.map((p) => (
          <div key={p._id} className="impulse-item">
            <Link to={`/produits/${p._id}`}><ProductImage product={p} /></Link>
            <span className="impulse-name">{p.name}</span>
            <strong>{fcfa(p.price)}</strong>
            <button className="btn btn-small btn-primary" onClick={() => { add(p, p.moq || 1); setAdded((a) => ({ ...a, [p._id]: true })); }} disabled={added[p._id]}>{added[p._id] ? `✓ ${t('Ajouté')}` : `+ ${t('Ajouter')}`}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
