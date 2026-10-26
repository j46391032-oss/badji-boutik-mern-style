import { useI18n } from '../i18n/I18nContext.jsx';

// Affichage (value) ou saisie (onChange) d'une note de 1 à 5
export default function Stars({ value = 0, onChange, size = '1rem' }) {
  const { t } = useI18n();
  return (
    <span className="stars" style={{ fontSize: size }} role={onChange ? 'radiogroup' : 'img'} aria-label={t('Note : {n} sur 5', { n: value })}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button type="button" key={n} className={n <= value ? 'on' : ''} onClick={() => onChange(n)} aria-label={t(n > 1 ? '{n} étoiles' : '{n} étoile', { n })}>★</button>
        ) : (
          <span key={n} className={n <= Math.round(value) ? 'on' : ''} aria-hidden="true">★</span>
        )
      )}
    </span>
  );
}
