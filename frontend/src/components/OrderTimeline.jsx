import { formatDateTime } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const FLOW = ['En attente', 'Confirmée', 'Expédiée', 'Livrée'];

// Suivi de commande : étapes franchies, avec la date quand elle est connue
export default function OrderTimeline({ order }) {
  const { t } = useI18n();
  if (order.status === 'Annulée') {
    const at = order.history?.find((h) => h.status === 'Annulée')?.at;
    return <p className="tag tag-red">{t('Commande annulée')}{at ? ` le ${formatDateTime(at)}` : ''}</p>;
  }
  const reached = FLOW.indexOf(order.status);
  return (
    <ol className="timeline" aria-label={t('Suivi de commande')}>
      {FLOW.map((s, i) => {
        const at = order.history?.find((h) => h.status === s)?.at || (i === 0 ? order.createdAt : null);
        return (
          <li key={s} className={i <= reached ? 'done' : ''}>
            <span className="dot" />
            <strong>{t(s)}</strong>
            {i <= reached && at && <span className="muted small">{formatDateTime(at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
