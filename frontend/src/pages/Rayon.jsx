import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import QuickAddRow from '../components/QuickAddRow.jsx';
import EndcapList from '../components/Endcap.jsx';
import { useCart } from '../context/CartContext.jsx';
import { fcfa } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const PREFIX = { fresh: 'F', grocery: 'E', general: 'G' };

// Un rayon (allée). Alimentaire : grille régulière rangée par travées selon le planogramme, ou liste de courses.
// Marchandises générales : mosaïque libre pour flâner.
export default function Rayon() {
  const { t } = useI18n();
  const { slug } = useParams();
  const { count, total } = useCart();
  const [info, setInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState('aisle');
  const [view, setView] = useState('grid');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setInfo(null);
    setError('');
    setSort('aisle');
    api.get(`/store/rayon/${slug}`).then((r) => setInfo(r.data)).catch((e) => setError(errMsg(e)));
    window.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => {
    if (!info) return;
    setLoading(true);
    api.get('/products', { params: { category: info.rayon._id, scope: 'official', sort, page: 1, limit: 100 } })
      .then((r) => setProducts(r.data.items || r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [info, sort]);

  if (error && !info) return <p className="alert alert-error">{error}</p>;
  if (!info) return <p className="empty">{t('Chargement…')}</p>;
  const { rayon, zone, prev, next, endcaps } = info;
  const grid = rayon.layout === 'grid';
  const letter = PREFIX[rayon.zone];

  // Travées : on regroupe seulement quand l'ordre est celui du planogramme
  const groups = [];
  if (grid && sort === 'aisle' && rayon.bays.length > 0) {
    [...rayon.bays, ''].forEach((bay) => {
      const items = products.filter((p) => (rayon.bays.includes(p.bay) ? p.bay : '') === bay);
      if (items.length) groups.push({ bay, items });
    });
  } else groups.push({ bay: null, items: products });

  const Nav = () => (
    <nav className="aisle-nav" aria-label={t('Allées')}>
      {prev ? <Link to={`/rayon/${prev.slug}`}>← {PREFIX[prev.zone]}{prev.aisle} · {prev.icon} {t(prev.name)}</Link> : <span />}
      {next && <Link to={`/rayon/${next.slug}`}>{next.icon} {t(next.name)} · {PREFIX[next.zone]}{next.aisle} →</Link>}
    </nav>
  );

  return (
    <>
      <nav className="breadcrumb"><Link to="/">{t('Accueil')}</Link> › <Link to="/boutique-officielle">{t('Boutique officielle')}</Link> › <Link to={`/boutique-officielle/${rayon.zone}`}>{t(zone.name)}</Link> › <span>{t(rayon.name)}</span></nav>

      <header className={`aisle-header card ${grid ? 'is-grid' : 'is-free'}`}>
        <div className="aisle-sign big"><small>{t('Allée')}</small><strong>{letter}{rayon.aisle}</strong></div>
        <div className="grow">
          <h1>{rayon.icon} {t(rayon.name)}</h1>
          <p className="muted">{t(zone.name)} · {t(rayon.products === 1 ? '{n} produit' : '{n} produits', { n: rayon.products })} · {grid ? t('Allées en grille') : t('Plan libre')}</p>
          {grid && rayon.bays.length > 0 && <div className="chip-line">{rayon.bays.map((b, i) => <span key={b} className="mini-tag">{t('Travée')} {i + 1} · {t(b)}</span>)}</div>}
        </div>
        <div className="aisle-tools">
          {grid && (
            <div className="seg" role="group" aria-label={t('Affichage')}>
              <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>▦ {t('Grille')}</button>
              <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>☰ {t('Liste de courses')}</button>
            </div>
          )}
          <label className="inline">{t('Trier par')}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="aisle">{grid ? t('Ordre du rayon') : t('Sélection du magasin')}</option>
              <option value="best">{t('Meilleures ventes')}</option>
              <option value="price_asc">{t('Prix croissant')}</option>
              <option value="price_desc">{t('Prix décroissant')}</option>
              <option value="new">{t('Nouveautés')}</option>
            </select>
          </label>
        </div>
      </header>

      <Nav />
      {loading ? (
        <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" />)}</div>
      ) : products.length === 0 ? (
        <p className="empty">{t('Aucun produit dans cette sélection.')}</p>
      ) : grid ? (
        groups.map((g) => (
          <section key={g.bay ?? 'all'} className="bay">
            {g.bay !== null && <h2 className="bay-title"><span>{t('Travée')} {rayon.bays.indexOf(g.bay) + 1 || '·'}</span> {g.bay ? t(g.bay) : t('Autres produits')}</h2>}
            {view === 'list' ? (
              <div className="quick-list card">{g.items.map((p) => <QuickAddRow key={p._id} product={p} />)}</div>
            ) : (
              <div className="grid aisle-grid">{g.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
            )}
          </section>
        ))
      ) : (
        <div className="mosaic">
          {products.map((p, i) => (
            <div key={p._id} className={`mosaic-tile ${i % 7 === 0 ? 'big' : ''}`}>
              <ProductCard product={p} />
              {i === 2 && next && (
                <Link to={`/rayon/${next.slug}`} className="mosaic-walk">
                  <span aria-hidden="true">🧭</span><strong>{t('Continuez la balade')}</strong><span>{next.icon} {t(next.name)} ›</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="part-title">{t('Tête de gondole')}</h2>
      <EndcapList endcaps={endcaps} />
      {(!endcaps || endcaps.length === 0) && <p className="muted">{t('Pas de promotion en bout d’allée pour le moment.')}</p>}
      <Nav />

      {grid && view === 'list' && count > 0 && (
        <div className="mini-cart-bar" role="status">
          <span>🛒 {t(count === 1 ? '{n} article' : '{n} articles', { n: count })} · <strong>{fcfa(total)}</strong></span>
          <Link to="/panier" className="btn btn-small btn-accent">{t('Aller aux caisses')}</Link>
        </div>
      )}
    </>
  );
}
