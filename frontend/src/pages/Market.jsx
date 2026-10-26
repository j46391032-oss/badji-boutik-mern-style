import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api, { assetUrl, errMsg } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';
import Pagination from '../components/Pagination.jsx';
import { num } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Un marché : ses boutiques (les « étals ») puis tous ses produits
export default function Market() {
  const { t } = useI18n();
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'best';
  const page = Number(params.get('page')) || 1;
  const [market, setMarket] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setMarket(null);
    api.get(`/markets/${slug}`).then((r) => setMarket(r.data)).catch((e) => setError(errMsg(e)));
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    api.get('/products', { params: { market: slug, category: category || undefined, sort, page, limit: 12 } })
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [slug, category, sort, page]);

  const update = (next) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p);
  };

  if (error && !market) return <p className="alert alert-error">{error}</p>;
  if (!market) return <p className="empty">{t('Chargement…')}</p>;

  return (
    <>
      <nav className="breadcrumb"><Link to="/">{t('Accueil')}</Link> › <Link to="/marches">{t('Les marchés')}</Link> › <span>{market.name}</span></nav>
      <section className="market-hero card" style={{ '--mk': market.color }}>
        <span className="market-banner" aria-hidden="true">{market.icon}</span>
        <div>
          <h1>{market.name}</h1>
          <p>{market.description}</p>
          <div className="chip-line">
            {market.categories.map((c) => <span key={c._id} className="mini-tag">{c.icon} {t(c.name)}</span>)}
          </div>
        </div>
      </section>

      <div className="part-title"><h2>🏪 {t('Les boutiques du marché')}</h2><span className="muted">{t(market.shops.length === 1 ? '{n} boutique' : '{n} boutiques', { n: market.shops.length })}</span></div>
      {market.shops.length === 0 ? (
        <p className="empty">{t('Aucune boutique pour le moment.')} <Link to="/vendre">{t('Ouvrez la première !')}</Link></p>
      ) : (
        <div className="stall-grid">
          {market.shops.map((s) => (
            <Link key={s._id} to={`/vendeurs/${s._id}`} className="card stall">
              <div className="stall-head">
                {s.logo ? <img className="supplier-logo logo-img" src={assetUrl(s.logo)} alt="" /> : <div className="supplier-logo" aria-hidden="true">{s.name[0]}</div>}
                <div><strong>{s.name}</strong>{s.verified && <span className="verified"> ✔</span>}<div className="muted small">{[s.city].filter(Boolean).join(', ')} · {t(s.products === 1 ? '{n} produit' : '{n} produits', { n: s.products })}</div></div>
              </div>
              <div className="tile-grid">
                {s.showcase.map((p) => <ProductImage key={p._id} product={p} />)}
              </div>
              <span className="part-cta">{t('Entrer dans la boutique ›')}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="part-title"><h2>🛍️ {t('Tous les produits du marché')}</h2><span className="muted">{t(data.total === 1 ? '{n} résultat' : '{n} résultats', { n: num(data.total) })}</span></div>
      <div className="results-head card">
        <div className="chip-line">
          <button className={`mini-tag ${!category ? 'mini-on' : ''}`} onClick={() => update({ category: '' })}>{t('Tous')}</button>
          {market.categories.map((c) => (
            <button key={c._id} className={`mini-tag ${category === c._id ? 'mini-on' : ''}`} onClick={() => update({ category: c._id })}>{c.icon} {t(c.name)}</button>
          ))}
        </div>
        <label className="inline">{t('Trier par')}
          <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="best">{t('Meilleures ventes')}</option>
            <option value="new">{t('Nouveautés')}</option>
            <option value="rating">{t('Mieux notés')}</option>
            <option value="price_asc">{t('Prix croissant')}</option>
            <option value="price_desc">{t('Prix décroissant')}</option>
          </select>
        </label>
      </div>
      {loading ? (
        <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" />)}</div>
      ) : data.items.length === 0 ? (
        <p className="empty">{t('Aucun produit dans cette sélection.')}</p>
      ) : (
        <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
      )}
      <Pagination page={data.page || 1} pages={data.pages || 1} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </>
  );
}
