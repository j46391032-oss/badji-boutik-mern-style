import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// Les cinq grands marchés : chacun regroupe des boutiques d'un même univers
export default function Markets() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/markets').then((r) => setMarkets(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="markets-hero card">
        <h1>🏬 {t('Les marchés')}</h1>
        <p>{t('Comme dans la vraie vie, chaque marché a son univers. Promenez-vous de marché en marché, entrez dans les boutiques et trouvez tout ce qu’il vous faut.')}</p>
        <Link to={user?.shop ? '/vendeur' : '/vendre'} className="btn btn-accent">{user?.shop ? t('Mon espace vendeur') : t('Ouvrir ma boutique dans un marché')}</Link>
      </section>
      {error && <p className="alert alert-error">{error}</p>}
      {loading && <p className="empty">{t('Chargement…')}</p>}
      <div className="market-list">
        {markets.map((m) => (
          <Link key={m._id} to={`/marches/${m.slug}`} className="card market-card" style={{ '--mk': m.color }}>
            <span className="market-banner" aria-hidden="true">{m.icon}</span>
            <div className="market-info">
              <h2>{m.name}</h2>
              <p>{m.description}</p>
              <div className="chip-line">
                {m.categories.map((c) => <span key={c._id} className="mini-tag">{c.icon} {t(c.name)}</span>)}
              </div>
              <div className="muted">{t(m.shops === 1 ? '{n} boutique' : '{n} boutiques', { n: m.shops })} · {t(m.products === 1 ? '{n} produit' : '{n} produits', { n: m.products })}</div>
              <span className="part-cta">{t('Entrer dans le marché ›')}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
