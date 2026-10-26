import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';

// Plan du magasin : le périmètre frais encadre les allées centrales ; l'aile des marchandises générales est à côté
export default function StoreMap({ zones }) {
  const { t } = useI18n();
  const by = Object.fromEntries(zones.map((z) => [z.key, z]));
  const fresh = by.fresh?.rayons || [];
  const top = fresh.slice(0, Math.ceil(fresh.length / 2));
  const bottom = fresh.slice(Math.ceil(fresh.length / 2));

  const Tile = ({ r, prefix }) => (
    <Link to={`/rayon/${r.slug}`} className="map-tile">
      <span className="map-icon" aria-hidden="true">{r.icon || '📦'}</span>
      <strong>{t(r.name)}</strong>
      <small>{prefix}{r.aisle} · {t(r.products === 1 ? '{n} produit' : '{n} produits', { n: r.products })}</small>
    </Link>
  );

  return (
    <div className="store-map" role="group" aria-label={t('Plan du magasin')}>
      <div className="map-door" aria-hidden="true">🚪 {t('Entrée')}</div>
      <div className="map-frame">
        {by.fresh && (
          <section className="map-zone map-fresh">
            <Link to="/boutique-officielle/fresh" className="map-zone-title">{by.fresh.icon} {t(by.fresh.name)} <span>{t(by.fresh.subtitle)}</span></Link>
            <div className="map-row">{top.map((r) => <Tile key={r._id} r={r} prefix="F" />)}</div>
          </section>
        )}
        <div className="map-body">
          {by.grocery && (
            <section className="map-zone map-grocery">
              <Link to="/boutique-officielle/grocery" className="map-zone-title">{by.grocery.icon} {t(by.grocery.name)} <span>{t(by.grocery.subtitle)}</span></Link>
              <div className="map-aisles">{by.grocery.rayons.map((r) => <Tile key={r._id} r={r} prefix="E" />)}</div>
            </section>
          )}
          {by.general && (
            <section className="map-zone map-general">
              <Link to="/boutique-officielle/general" className="map-zone-title">{by.general.icon} {t(by.general.name)} <span>{t(by.general.subtitle)}</span></Link>
              <div className="map-free">{by.general.rayons.map((r) => <Tile key={r._id} r={r} prefix="G" />)}</div>
            </section>
          )}
        </div>
        {bottom.length > 0 && <section className="map-zone map-fresh"><div className="map-row">{bottom.map((r) => <Tile key={r._id} r={r} prefix="F" />)}</div></section>}
      </div>
      <Link to="/panier" className="map-checkout">🛒 {t('Caisses')} →</Link>
    </div>
  );
}
