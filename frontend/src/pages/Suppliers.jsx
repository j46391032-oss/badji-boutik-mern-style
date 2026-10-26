import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl, errMsg } from '../api.js';
import { useDebounce } from '../hooks.js';
import { num } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Annuaire des vendeurs (style Alibaba) : recherche, vendeurs vérifiés, catégories
export default function Suppliers() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [verified, setVerified] = useState(false);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const term = useDebounce(q);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/suppliers/directory', { params: { q: term, verified: verified ? 1 : undefined, category: category || undefined } })
      .then((r) => { setList(r.data); setError(''); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [term, verified, category]);

  return (
    <>
      <div className="results-head card">
        <div>
          <h1>{t('🏪 Annuaire des vendeurs')}</h1>
          <span className="muted">{loading ? t('Chargement…') : t(list.length > 1 ? '{n} vendeurs' : '{n} vendeur', { n: num(list.length) })}</span>
        </div>
        <div className="results-tools">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Nom du vendeur…')} aria-label={t('Rechercher un vendeur')} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('Catégorie')}>
            <option value="">{t('Toutes les catégories')}</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{t(c.name)}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />{' '}{t('Vérifiés uniquement')}</label>
        </div>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {!loading && list.length === 0 && <p className="empty">{t('Aucun vendeur ne correspond à votre recherche.')}</p>}
      <div className="supplier-grid">
        {list.map((s) => (
          <article className="card supplier-tile" key={s._id}>
            <div className="supplier-head">
              {s.logo ? <img className="supplier-logo logo-img" src={assetUrl(s.logo)} alt="" /> : <div className="supplier-logo" aria-hidden="true">{s.name[0]}</div>}
              <div>
                <Link to={`/vendeurs/${s._id}`}><strong>{s.name}</strong></Link>
                <div className="muted small">{[s.city, s.country].filter(Boolean).join(', ')} · {s.yearsActive > 0 ? t(s.yearsActive > 1 ? '{n} ans' : '{n} an', { n: s.yearsActive }) : t('🆕 Nouvelle boutique')}</div>
              </div>
              {s.verified && <span className="verified">{t('✔ Vérifié')}</span>}
            </div>
            <div className="supplier-stats">
              <div><strong>{s.rating > 0 ? `${s.rating.toFixed(1)}/5` : "—"}</strong><span>{t('Note')}</span></div>
              <div><strong>≤ {s.responseHours} h</strong><span>{t('Réponse')}</span></div>
              <div><strong>{num(s.products)}</strong><span>{t('Produits')}</span></div>
              <div><strong>{num(s.sold)}</strong><span>{t('Vendus')}</span></div>
            </div>
            {s.market && <span className="mini-tag mini-blue">{s.market.icon} {s.market.name}</span>}
            <div className="chip-line">
              {s.categories.slice(0, 4).map((c) => <span key={c._id} className="mini-tag mini-blue">{c.icon} {t(c.name)}</span>)}
            </div>
            <Link to={`/vendeurs/${s._id}`} className="btn btn-small">{t('Voir la boutique')}</Link>
          </article>
        ))}
      </div>
    </>
  );
}
