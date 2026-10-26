import { useCompare } from '../context/CompareContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// Case « Comparer » affichée sur les cartes produit et les fiches
export default function CompareButton({ productId, className = '' }) {
  const { t } = useI18n();
  const { has, toggle } = useCompare();
  const on = has(productId);
  return (
    <label className={`compare-check ${on ? 'on' : ''} ${className}`}>
      <input type="checkbox" checked={on} onChange={() => toggle(productId)} />{' '}{t('Comparer')}</label>
  );
}
