import { useI18n } from '../i18n/I18nContext.jsx';

const COLORS = {
  'En attente': 'tag-amber',
  'Confirmée': 'tag-blue',
  'Expédiée': 'tag-violet',
  'Livrée': 'tag-green',
  'Annulée': 'tag-red',
};

export default function StatusBadge({ status }) {
  const { t } = useI18n();
  return <span className={`tag ${COLORS[status] || ''}`}>{t(status)}</span>;
}
