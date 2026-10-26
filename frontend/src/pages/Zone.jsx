import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import EndcapList from '../components/Endcap.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { fcfa } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const PREFIX = { fresh: 'F', grocery: 'E', general: 'G' };

// Une zone du magasin. Alimentaire : allées numérotées en lignes régulières. Marchandises générales : mosaïque libre.
export default function Zone() {
  const { t } = useI18n();
  const { zone } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    api.get(`/store/zone/${zone}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [zone]);

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!data) return <p className="empty">{t('Chargement…')}</p>;
  const { zone: z, rayons, endcaps } = data;
  const grid = z.layout === 'grid';

  return (
    <>
      <nav className="breadcrumb"><Link to="/">{t('Accueil')}</Link> › <Link to="/boutique-officielle">{t('Boutique officielle')}</Link> › <span>{t(z.name)}</span></nav>
      <section className="store-hero card">
        <div>
          <h1>{z.icon} {t(z.name)}</h1>
          <p>{t(z.description)}</p>
          <span className="mini-tag">{grid ? t('Allées en grille : un parcours droit, rayon après rayon') : t('Plan libre : flânez, découvrez')}</span>
        </div>
      </section>

      {grid ? (
        <div className="aisle-rows">
          {rayons.map((r) => (
            <section key={r._id} className="card aisle-row">
              <Link to={`/rayon/${r.slug}`} className="aisle-sign"><small>{t('Allée')}</small><strong>{PREFIX[z.key]}{r.aisle}</strong></Link>
              <div className="aisle-body">
                <div className="section-head"><h2>{r.icon} {t(r.name)}</h2><Link to={`/rayon/${r.slug}`}>{t('Parcourir l’allée ›')}</Link></div>
                {r.bays.length > 0 && <div className="chip-line">{r.bays.map((b) => <span key={b} className="mini-tag">{t(b)}</span>)}</div>}
                <div className="mini-strip">
                  {r.preview.map((p) => (
                    <Link key={p._id} to={`/produits/${p._id}`} className="mini-product"><ProductImage product={p} /><span>{p.name}</span><strong>{fcfa(p.price)}</strong></Link>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="free-tiles">
          {rayons.map((r, i) => (
            <Link key={r._id} to={`/rayon/${r.slug}`} className={`card free-tile ${i % 5 === 0 ? 'wide' : ''} ${i % 7 === 3 ? 'tall' : ''}`}>
              <div className="free-collage">{r.preview.slice(0, i % 5 === 0 ? 4 : 2).map((p) => <ProductImage key={p._id} product={p} />)}</div>
              <strong>{r.icon} {t(r.name)}</strong>
              <span className="muted small">{t(r.products === 1 ? '{n} produit' : '{n} produits', { n: r.products })}</span>
            </Link>
          ))}
        </div>
      )}
      <EndcapList endcaps={endcaps} />
    </>
  );
}
