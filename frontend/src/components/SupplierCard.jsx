import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';
import { assetUrl } from '../api.js';

// Fiche vendeur (style Alibaba) : vérifié, ancienneté, note, réactivité, livraison, réachat, marchés
export default function SupplierCard({ supplier }) {
  const { t } = useI18n();
  if (!supplier) return null;
  return (
    <section className="card supplier-card">
      <div className="supplier-head">
        {supplier.logo ? <img className="supplier-logo logo-img" src={assetUrl(supplier.logo)} alt="" /> : <div className="supplier-logo" aria-hidden="true">{supplier.name[0]}</div>}
        <div>
          {supplier._id ? <Link to={`/vendeurs/${supplier._id}`}><strong>{supplier.name}</strong></Link> : <strong>{supplier.name}</strong>}
          <div className="muted small">{[supplier.city, supplier.country].filter(Boolean).join(', ')}{supplier.yearsActive > 0 && <> · {t(supplier.yearsActive > 1 ? '{n} ans' : '{n} an', { n: supplier.yearsActive })}</>}</div>
        </div>
        {supplier.verified && <span className="verified">{t('✔ Vérifié')}</span>}
      </div>
      {supplier.market && <p><Link to={`/marches/${supplier.market.slug}`} className="mini-tag mini-blue">{supplier.market.icon} {supplier.market.name}</Link></p>}
      {supplier.description && <p className="supplier-desc">{supplier.description}</p>}
      {supplier.rating > 0 ? (
      <div className="supplier-stats">
        <div><strong>{supplier.rating?.toFixed(1)}/5</strong><span>{t('Note de la boutique')}</span></div>
        <div><strong>≤ {supplier.responseHours} h</strong><span>{t('Temps de réponse')}</span></div>
        <div><strong>≥ {supplier.onTimeRate} %</strong><span>{t('Livraison dans les délais')}</span></div>
        <div><strong>{supplier.repurchaseRate} %</strong><span>{t('Taux de réachat')}</span></div>
      </div>
      ) : <p className="mini-tag mini-blue">{t('🆕 Nouvelle boutique')}</p>}
      {supplier.markets?.length > 0 && <p className="small muted">{t('Marchés principaux :')}{' '}<strong>{supplier.markets.join(', ')}</strong></p>}
    </section>
  );
}
