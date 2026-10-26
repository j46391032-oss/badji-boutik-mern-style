import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import StoreMap from '../components/StoreMap.jsx';
import EndcapList from '../components/Endcap.jsx';
import { num } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Boutique officielle : le plan du magasin, comme un supermarché (périmètre frais, allées centrales, marchandises générales)
export default function Store() {
  const { t } = useI18n();
  const [store, setStore] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/store').then((r) => setStore(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!store) return <p className="empty">{t('Chargement…')}</p>;
  return (
    <>
      <section className="store-hero card">
        <div>
          <h1>🏪 {t('Boutique officielle')}</h1>
          <p>{t('Promenez-vous comme dans un supermarché : le frais tout autour, l’épicerie dans les allées, et l’aile des marchandises générales pour flâner.')}</p>
        </div>
        <div className="store-hero-actions">
          <Link to="/boutique-officielle/produits" className="btn btn-accent">{t('Voir tous les produits')} ({num(store.total)})</Link>
          <Link to="/panier" className="btn">{t('Aller aux caisses')}</Link>
        </div>
      </section>

      <EndcapList endcaps={store.endcaps} />

      <h2 className="part-title">{t('Plan du magasin')}</h2>
      <StoreMap zones={store.zones} />

      <div className="zone-cards">
        {store.zones.map((z) => (
          <Link key={z.key} to={`/boutique-officielle/${z.key}`} className="card zone-card">
            <span className="zone-icon" aria-hidden="true">{z.icon}</span>
            <strong>{t(z.name)}</strong>
            <span className="mini-tag mini-blue">{z.layout === 'grid' ? t('Allées en grille') : t('Plan libre')}</span>
            <span className="muted">{t(z.description)}</span>
            <span className="part-cta">{t('Entrer dans la zone ›')}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
