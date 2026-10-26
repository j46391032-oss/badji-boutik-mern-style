import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Stars from '../components/Stars.jsx';
import { num } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const SORTS = [
  ['new', 'Nouveautés'],
  ['best', 'Meilleures ventes'],
  ['rating', 'Mieux notés'],
  ['price_asc', 'Prix croissant'],
  ['price_desc', 'Prix décroissant'],
];

const TITLES = { flash: '⚡ Ventes Flash', freeShipping: 'Livraison gratuite', promo: 'Promotions', samples: '📦 Échantillons disponibles', verified: '✔ Vendeurs vérifiés' }; // traduits à l'affichage

export default function Products({ part }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const search = get('search');
  const category = get('category');
  const sort = get('sort') || 'new';
  const page = Number(get('page')) || 1;
  const minPrice = get('minPrice');
  const maxPrice = get('maxPrice');
  const minRating = get('minRating');
  const brand = get('brand');
  const maxMoq = get('maxMoq');
  const scope = part || get('scope'); // sur /boutique-officielle, la partie est imposée
  const marketSlug = get('market');
  const [markets, setMarkets] = useState([]);
  const flags = { freeShipping: get('freeShipping') === '1', inStock: get('inStock') === '1', promo: get('promo') === '1', flash: get('flash') === '1', verified: get('verified') === '1', samples: get('samples') === '1' };

  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [price, setPrice] = useState({ min: minPrice, max: maxPrice });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api.get('/markets').then((r) => setMarkets(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPrice({ min: minPrice, max: maxPrice });
  }, [minPrice, maxPrice]);

  const query = params.toString();
  useEffect(() => {
    setLoading(true);
    const q = Object.fromEntries(params.entries());
    api
      .get('/products', { params: { ...q, ...(part ? { scope: part } : {}), page, limit: 12 } })
      .then((r) => {
        setData(r.data);
        setError('');
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const update = (next) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v && v !== '0' ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p);
  };

  const toggle = (k) => update({ [k]: flags[k] ? '' : '1' });
  const activeCat = categories.find((c) => c._id === category);
  const marketName = markets.find((m) => m.slug === marketSlug)?.name;
  const title = marketName ? marketName : brand ? t('Marque : {name}', { name: brand }) : search ? t('Résultats pour « {name} »', { name: search }) : activeCat?.name ? t(activeCat.name) : t(Object.entries(TITLES).find(([k]) => flags[k])?.[1] || (sort === 'best' ? '🏆 Meilleures ventes' : sort === 'new' && [...params.keys()].length === 1 ? 'Nouveautés' : part === 'official' ? 'Boutique officielle' : 'Tous les produits'));
  const hasFilters = (!part && scope) || marketSlug || category || search || brand || maxMoq || minPrice || maxPrice || minRating || Object.values(flags).some(Boolean);

  const filters = (
    <aside className="filters card" aria-label={t('Filtres')}>
      <h3>{t('Affiner par')}</h3>

      {!part && <h4>{t('Où chercher ?')}</h4>}
      {!part && <ul className="cat-list">
        <li><button className={!scope && !marketSlug ? 'active' : ''} onClick={() => update({ scope: '', market: '' })}>{t('Tout le site')}</button></li>
        <li><button className={scope === 'official' ? 'active' : ''} onClick={() => update({ scope: 'official', market: '' })}>🏪 {t('Boutique officielle')}</button></li>
        <li><button className={scope === 'market' && !marketSlug ? 'active' : ''} onClick={() => update({ scope: 'market', market: '' })}>🏬 {t('Tous les marchés')}</button></li>
        {markets.map((m) => (
          <li key={m._id} className="sub"><button className={marketSlug === m.slug ? 'active' : ''} onClick={() => update({ market: m.slug, scope: '' })}>{m.icon} {m.name}</button></li>
        ))}
      </ul>}

      <h4>{t('Catégorie')}</h4>
      <ul className="cat-list">
        <li><button className={!category ? 'active' : ''} onClick={() => update({ category: '' })}>{t('Toutes les catégories')}</button></li>
        {categories.map((c) => (
          <li key={c._id}>
            <button className={category === c._id ? 'active' : ''} onClick={() => update({ category: c._id })}>
              <span>{c.icon} {t(c.name)}</span><span className="muted small">{c.count}</span>
            </button>
          </li>
        ))}
      </ul>

      <h4>{t('Avis des clients')}</h4>
      <ul className="cat-list">
        {[4, 3, 2].map((n) => (
          <li key={n}>
            <button className={Number(minRating) === n ? 'active' : ''} onClick={() => update({ minRating: Number(minRating) === n ? '' : String(n) })}>
              <Stars value={n} /> <span className="small">{t('et plus')}</span>
            </button>
          </li>
        ))}
      </ul>

      <h4>{t('Prix (FCFA)')}</h4>
      <form className="price-filter" onSubmit={(e) => { e.preventDefault(); update({ minPrice: price.min, maxPrice: price.max }); }}>
        <input type="number" min="0" placeholder={t('Min')} value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} aria-label={t('Prix minimum')} />
        <input type="number" min="0" placeholder={t('Max')} value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} aria-label={t('Prix maximum')} />
        <button className="btn btn-small">OK</button>
      </form>

      <h4>{t('Commande minimum (MOQ)')}</h4>
      <ul className="cat-list">
        {[1, 10, 50].map((n) => (
          <li key={n}>
            <button className={Number(maxMoq) === n ? 'active' : ''} onClick={() => update({ maxMoq: Number(maxMoq) === n ? '' : String(n) })}>
              {n === 1 ? t('Sans minimum (1 pièce)') : t("Jusqu'à {n} pièces", { n })}
            </button>
          </li>
        ))}
      </ul>

      <h4>{t('Vendeur et services')}</h4>
      <label className="check"><input type="checkbox" checked={flags.verified} onChange={() => toggle('verified')} />{' '}{t('✔ Vendeurs vérifiés')}</label>
      <label className="check"><input type="checkbox" checked={flags.samples} onChange={() => toggle('samples')} />{' '}{t('📦 Échantillon disponible')}</label>

      <h4>{t('Livraison et offres')}</h4>
      <label className="check"><input type="checkbox" checked={flags.freeShipping} onChange={() => toggle('freeShipping')} />{' '}{t('Livraison gratuite')}</label>
      <label className="check"><input type="checkbox" checked={flags.flash} onChange={() => toggle('flash')} />{' '}{t('Ventes Flash')}</label>
      <label className="check"><input type="checkbox" checked={flags.promo} onChange={() => toggle('promo')} />{' '}{t('En promotion')}</label>
      <label className="check"><input type="checkbox" checked={flags.inStock} onChange={() => toggle('inStock')} />{' '}{t('En stock uniquement')}</label>

      {hasFilters && <button className="btn btn-small block" onClick={() => setParams({})}>{t('Effacer les filtres')}</button>}
    </aside>
  );

  return (
    <>
      <div className="results-head card">
        <div>
          <h1>{title}</h1>
          <span className="muted">{loading ? t('Chargement…') : t(data.total > 1 ? '{n} résultats' : '{n} résultat', { n: num(data.total) })}</span>
        </div>
        <div className="results-tools">
          <button className="btn btn-small filters-toggle" onClick={() => setShowFilters((s) => !s)}>{t('Filtres')}</button>
          <label className="inline">{t('Trier par')}<select value={sort} onChange={(e) => update({ sort: e.target.value === 'new' ? '' : e.target.value })}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="catalog">
        <div className={`filters-wrap ${showFilters ? 'open' : ''}`}>{filters}</div>
        <section>
          {error && <p className="alert alert-error">{error}</p>}
          {loading ? (
            <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" />)}</div>
          ) : data.items.length === 0 ? (
            <p className="empty">{t('Aucun produit ne correspond à votre recherche.')}</p>
          ) : (
            <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
          )}
          <Pagination page={data.page || 1} pages={data.pages || 1} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </section>
      </div>
    </>
  );
}
