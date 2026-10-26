import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import HeroCarousel from '../components/HeroCarousel.jsx';
import ProductRow from '../components/ProductRow.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { getRecent } from '../hooks.js';
import EndcapList from '../components/Endcap.jsx';
import { sortRayons } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const get = (url, params) => api.get(url, { params }).then((r) => r.data).catch(() => []);

const TRUST = [
  ['🚚', 'Livraison partout au Sénégal', 'Suivi de commande en ligne'],
  ['💳', 'Paiement à la livraison', 'Espèces, Wave ou Orange Money'],
  ['↩️', 'Retours simples', 'Remboursement si le produit ne convient pas'],
  ['💬', 'Vendeurs réactifs', 'Questions et devis en quelques heures'],
];

export default function Home() {
  const { t } = useI18n();
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ flash: [], best: [], fresh: [], free: [], featured: [], recent: [], samples: [] });
  const [tileItems, setTileItems] = useState({}); // produits à afficher dans chaque tuile de catégorie
  const [suppliers, setSuppliers] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [endcaps, setEndcaps] = useState([]); // têtes de gondole du plan du magasin
  const [marketItems, setMarketItems] = useState({}); // quelques produits en vitrine par marché

  useEffect(() => {
    get('/banners').then(setBanners);
    get('/categories').then((raw) => {
      const cats = sortRayons(raw); // dans l'ordre du magasin
      setCategories(cats);
      // 4 meilleures ventes de chacune des 8 premières catégories non vides
      Promise.all(cats.filter((c) => c.count > 0).map((c) => get('/products', { category: c._id, scope: 'official', sort: 'best', limit: 4 }).then((items) => [c._id, items]))).then((r) => setTileItems(Object.fromEntries(r)));
    });
    get('/suppliers/directory', { verified: 1 }).then((r) => setSuppliers(r.slice(0, 6)));
    get('/endcaps', { store: 1 }).then(setEndcaps);
    get('/markets').then((ms) => {
      setMarkets(ms);
      Promise.all(ms.map((m) => get('/products', { market: m.slug, sort: 'best', limit: 4 }).then((items) => [m.slug, items]))).then((r) => setMarketItems(Object.fromEntries(r)));
    });
    const recentIds = getRecent();
    Promise.all([
      get('/products', { scope: 'official', flash: 1, sort: 'flash', limit: 12 }),
      get('/products', { scope: 'official', sort: 'best', limit: 12 }),
      get('/products', { scope: 'official', sort: 'new', limit: 12 }),
      get('/products', { scope: 'official', freeShipping: 1, limit: 12 }),
      get('/products', { scope: 'official', featured: 1, limit: 12 }),
      recentIds.length ? get('/products', { ids: recentIds.join(',') }) : Promise.resolve([]),
      get('/products', { samples: 1, sort: 'best', limit: 12 }),
    ]).then(([flash, best, fresh, free, featured, recent, samples]) => {
      const order = new Map(recentIds.map((id, i) => [id, i]));
      setData({ flash, best, fresh, free, featured, samples, recent: [...recent].sort((a, b) => order.get(a._id) - order.get(b._id)) });
    });
  }, []);

  // « Tuiles » de catégories : 4 miniatures de produits par catégorie (style Amazon)
  const tiles = categories.filter((c) => (tileItems[c._id] || []).length > 0).slice(0, 8); // catégories de la boutique officielle
  const officialCats = categories.filter((c) => (tileItems[c._id] || []).length > 0);

  return (
    <>
      <HeroCarousel banners={banners} />

      <section className="two-parts" aria-label={t('Les deux parties du site')}>
        <Link to="/boutique-officielle" className="part part-official">
          <span className="part-icon" aria-hidden="true">🏪</span>
          <strong>{t('Boutique officielle')}</strong>
          <span>{t('Nos propres produits, sélectionnés et livrés par Boutik.')}</span>
          <span className="part-cta">{t('Entrer dans la boutique ›')}</span>
        </Link>
        <Link to="/marches" className="part part-markets">
          <span className="part-icon" aria-hidden="true">🏬</span>
          <strong>{t('Les marchés')}</strong>
          <span>{t('Cinq grands marchés où des vendeurs tiennent leurs boutiques : tissus, high-tech, produits frais, artisanat…')}</span>
          <span className="part-cta">{t('Se promener dans les marchés ›')}</span>
        </Link>
      </section>

      <div className="part-title"><h2>🏪 {t('Boutique officielle')}</h2><Link to="/boutique-officielle">{t('Voir tout ›')}</Link></div>
      <nav className="zone-strip" aria-label={t('Zones du magasin')}>
        <Link to="/boutique-officielle/fresh">🥬 {t('Périmètre frais')}</Link>
        <Link to="/boutique-officielle/grocery">🛒 {t('Allées centrales')}</Link>
        <Link to="/boutique-officielle/general">🛍️ {t('Marchandises générales')}</Link>
        <Link to="/boutique-officielle" className="map-link">🗺️ {t('Plan du magasin')}</Link>
      </nav>
      <EndcapList endcaps={endcaps} />
      <nav className="cat-strip" aria-label={t('Catégories')}>
        {officialCats.map((c) => (
          <Link key={c._id} to={c.slug ? `/rayon/${c.slug}` : `/produits?category=${c._id}`}><span aria-hidden="true">{c.icon || '📦'}</span>{t(c.name)}</Link>
        ))}
      </nav>

      <div className="tiles">
        {tiles.map((c) => {
          const items = tileItems[c._id] || [];
          return (
            <section className="card tile" key={c._id}>
              <h3>{c.icon} {t(c.name)}</h3>
              <div className="tile-grid">
                {items.map((p) => (
                  <Link key={p._id} to={`/produits/${p._id}`} title={p.name}><ProductImage product={p} /></Link>
                ))}
              </div>
              <Link to={c.slug ? `/rayon/${c.slug}` : `/produits?category=${c._id}`}>{t('Voir tout')}</Link>
            </section>
          );
        })}
      </div>

      <ProductRow title={t('⚡ Ventes Flash')} products={data.flash} to="/produits?flash=1" />
      <ProductRow title={t('🏆 Meilleures ventes')} products={data.best} to="/produits?sort=best" ranked />

      <section className="markets-home" aria-label={t('Les marchés')}>
        <div className="part-title"><h2>🏬 {t('Les marchés')}</h2><Link to="/marches">{t('Tous les marchés ›')}</Link></div>
        <div className="market-grid">
          {markets.map((m) => (
            <Link key={m._id} to={`/marches/${m.slug}`} className="card market-tile" style={{ '--mk': m.color }}>
              <div className="market-head"><span className="market-icon" aria-hidden="true">{m.icon}</span><div><strong>{m.name}</strong><div className="muted small">{t(m.shops === 1 ? '{n} boutique' : '{n} boutiques', { n: m.shops })} · {t(m.products === 1 ? '{n} produit' : '{n} produits', { n: m.products })}</div></div></div>
              <div className="tile-grid">
                {(marketItems[m.slug] || []).map((p) => <ProductImage key={p._id} product={p} />)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rfq-banner card">
        <div>
          <h2>{t('Besoin de grandes quantités ?')}</h2>
          <p>{t('Décrivez votre besoin, nos vendeurs vous répondent avec un devis. Les prix baissent avec la quantité.')}</p>
        </div>
        <Link to="/demande-devis" className="btn btn-accent">{t('Demander un devis')}</Link>
      </section>

      <ProductRow title={t('📦 Échantillons disponibles')} products={data.samples} to="/produits?samples=1" />

      {suppliers.length > 0 && (
        <section className="row-section card">
          <div className="section-head"><h2>{t('✔ Vendeurs vérifiés')}</h2><Link to="/vendeurs">{t('Tous les vendeurs ›')}</Link></div>
          <div className="supplier-grid compact">
            {suppliers.map((s) => (
              <Link key={s._id} to={`/vendeurs/${s._id}`} className="supplier-mini">
                <div className="supplier-logo" aria-hidden="true">{s.name[0]}</div>
                <div><strong>{s.name}</strong><div className="muted small">{s.city} · {t('{n} produits · ⭐ {r}', { n: s.products, r: s.rating?.toFixed(1) })}</div></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductRow title={t('Nouveautés')} products={data.fresh} to="/produits?sort=new" />
      <ProductRow title={t('Livraison gratuite')} products={data.free} to="/produits?freeShipping=1" />
      <ProductRow title={t('Sélection de la boutique')} products={data.featured} to="/produits" />
      <ProductRow title={t('Consultés récemment')} products={data.recent} />

      <section className="trust">
        {TRUST.map(([icon, title, text]) => (
          <div key={title}><span aria-hidden="true">{icon}</span><strong>{t(title)}</strong><span className="muted small">{t(text)}</span></div>
        ))}
      </section>
    </>
  );
}
