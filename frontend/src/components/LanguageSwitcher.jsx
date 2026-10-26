import { useI18n } from '../i18n/I18nContext.jsx';

// Choix de la langue du site
export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, languages, t } = useI18n();
  return (
    <label className={`lang-switch ${className}`}>
      <span aria-hidden="true">🌐</span>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('Langue')}>
        {languages.map((l) => (
          <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
        ))}
      </select>
    </label>
  );
}
