import { assetUrl } from '../api.js';

const hue = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

// Image du produit, ou pastille colorée (icône de la catégorie ou initiale) si aucune image n'est définie
export default function ProductImage({ product, className = '', src }) {
  const image = src ?? product.image;
  if (image) return <img className={`product-img ${className}`} src={assetUrl(image)} alt={product.name} loading="lazy" />;
  const h = hue(product.name);
  return (
    <div
      className={`product-img placeholder ${className}`}
      aria-label={product.name}
      style={{ background: `linear-gradient(135deg, hsl(${h} 45% 94%), hsl(${(h + 40) % 360} 45% 86%))` }}
    >
      {product.category?.icon || product.name?.[0]?.toUpperCase()}
    </div>
  );
}
