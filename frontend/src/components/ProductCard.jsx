import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import Countdown from './Countdown.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import FavoriteButton from './FavoriteButton.jsx';
import Stars from './Stars.jsx';
import CompareButton from './CompareButton.jsx';
import { fcfa, num, priceRange, flashActive } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Carte produit : badge de remise, ancien prix, note, quantité minimum, ventes, livraison gratuite, vendeur vérifié
export default function ProductCard({ product, rank }) {
  const { t } = useI18n();
  const { add } = useCart();
  const { isAdmin } = useAuth();
  const out = product.stock <= 0;
  const { min, max, tiered } = priceRange(product);
  const flash = flashActive(product);
  const moq = product.moq || 1;

  return (
    <article className="card product-card">
      <div className="card-media">
        <Link to={`/produits/${product._id}`}>
          <ProductImage product={product} />
        </Link>
        <FavoriteButton productId={product._id} />
        {product.discountPercent > 0 && <span className="badge-discount">−{product.discountPercent} %</span>}
        {rank && <span className="badge-rank">#{rank}</span>}
      </div>
      <div className="product-body">
        {flash && <Countdown until={product.flashSaleEnds} compact />}
        <h3><Link to={`/produits/${product._id}`}>{product.name}</Link></h3>
        <span className="origin-line">{product.market ? `${product.market.icon} ${product.market.name}${product.supplier?.name ? ` · ${product.supplier.name}` : ''}` : `🏪 ${t('Boutique officielle')}`}</span>
        {product.ratingCount > 0 && (
          <span className="rating-line"><Stars value={product.ratingAvg} /> <span className="muted small">({num(product.ratingCount)})</span></span>
        )}
        <div className="price-line">
          <strong className="price">{tiered ? `${num(min)} – ${num(max)} FCFA` : fcfa(product.price)}</strong>
          {product.oldPrice > product.price && <s className="old-price">{fcfa(product.oldPrice)}</s>}
        </div>
        <div className="meta-line">
          {moq > 1 && <span>{t('MOQ : {n} pièces', { n: moq })}</span>}
          {product.sold > 0 && <span>{t('{n} vendus', { n: num(product.sold) })}</span>}
        </div>
        <div className="chip-line">
          {product.freeShipping && <span className="mini-tag mini-green">{t('Livraison gratuite')}</span>}
          {product.supplier?.verified && <span className="mini-tag mini-blue">{t('✔ Vérifié')}</span>}
          {product.sampleAvailable && <span className="mini-tag mini-orange">{t('Échantillon')}</span>}
        </div>
        <CompareButton productId={product._id} />
        <div className="product-foot">
          {out ? (
            <span className="tag tag-red">{t('Épuisé')}</span>
          ) : (
            !isAdmin && (product.options?.length > 0
              ? <Link className="btn btn-small btn-primary" to={`/produits/${product._id}`}>{t('Choisir les options')}</Link>
              : <button className="btn btn-small btn-primary" onClick={() => add(product, moq)}>{t('Ajouter au panier')}</button>)
          )}
        </div>
      </div>
    </article>
  );
}
