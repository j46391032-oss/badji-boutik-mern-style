// Langues proposées. `locale` sert aux nombres et aux dates (Intl) ; `fallback` : langue de repli quand une phrase n'est pas encore traduite.
export const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr', locale: 'fr-FR', fallback: [] },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr', locale: 'en-GB', fallback: ['fr'] },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳', dir: 'ltr', locale: 'fr-FR', fallback: ['fr'] },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl', locale: 'ar-u-nu-latn', fallback: ['fr'] }, // chiffres latins, plus lisibles pour les prix
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr', locale: 'es-ES', fallback: ['fr'] },
  { code: 'zh', name: '中文 (普通话)', flag: '🇨🇳', dir: 'ltr', locale: 'zh-CN', fallback: ['fr'] },
  { code: 'bm', name: 'Bamanankan', flag: '🇲🇱', dir: 'ltr', locale: 'fr-FR', fallback: ['fr'] },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr', locale: 'hi-IN', fallback: ['en', 'fr'] },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬', dir: 'ltr', locale: 'ha-NG', fallback: ['en', 'fr'] },
];

export const DEFAULT_LANG = 'fr';
export const byCode = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

// Locale Intl réellement disponible dans le navigateur (sinon français)
export const safeLocale = (locale) => (Intl.NumberFormat.supportedLocalesOf([locale]).length ? locale : 'fr-FR');
