import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fcfa } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Ligne « liste de courses » (allées alimentaires) : on règle la quantité et on ajoute sans quitter l'allée
export default function QuickAddRow({ product }) {
  const { t } = useI18n();
  const { add } = useCart();
  const { isAdmin } = useAuth();
  const min = product.moq || 1;
  const [qty, setQty] = useState(min);
  const [done, setDone] = useState(false);
  const out = product.stock <= 0;

  const put = () => {
    add(product, qty);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <div className={`quick-row ${out ? 'out' : ''}`}>
      <Link to={`/produits/${product._id}`} className="quick-thumb"><ProductImage product={product} /></Link>
      <div className="quick-main">
        <Link to={`/produits/${product._id}`}><strong>{product.name}</strong></Link>
        <span className="muted small">{product.brand}{product.brand && product.priceTiers?.length ? ' · ' : ''}{product.priceTiers?.length ? t('prix dégressifs') : ''}</span>
      </div>
      <div className="quick-price">
        <strong>{fcfa(product.price)}</strong>
        {product.oldPrice > product.price && <s className="old-price">{fcfa(product.oldPrice)}</s>}
      </div>
      {out ? <span className="text-red">{t('Épuisé')}</span> : isAdmin ? null : product.options?.length > 0 ? (
        <Link className="btn btn-small btn-primary" to={`/produits/${product._id}`}>{t('Choisir les options')}</Link>
      ) : (
        <div className="quick-actions">
          <div className="stepper" role="group" aria-label={t('Quantité')}>
            <button type="button" onClick={() => setQty((q) => Math.max(min, q - 1))} aria-label={t('Diminuer la quantité')}>−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label={t('Augmenter la quantité')}>+</button>
          </div>
          <button className="btn btn-small btn-primary" onClick={put}>{done ? `✓ ${t('Ajouté')}` : t('Ajouter')}</button>
        </div>
      )}
    </div>
  );
}
