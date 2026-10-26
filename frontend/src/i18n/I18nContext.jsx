import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { byCode, DEFAULT_LANG, LANGUAGES, safeLocale } from './languages.js';
import { buildDictionaries } from './dictionary.js';
import { setLocale } from '../utils.js';

const DICTS = buildDictionaries();
const I18nContext = createContext(null);
export const useI18n = () => useContext(I18nContext);

const interpolate = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : s);

// Traduction hors composants React (messages d'erreur du serveur, par exemple)
let activeLang = DEFAULT_LANG;
export function translate(key, vars) {
  const chain = [activeLang, ...byCode(activeLang).fallback];
  for (const code of chain) {
    const hit = DICTS[code]?.[key];
    if (hit) return interpolate(hit, vars);
  }
  return interpolate(key, vars);
}

const initial = () => {
  try {
    const saved = localStorage.getItem('lang');
    return LANGUAGES.some((l) => l.code === saved) ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initial);
  activeLang = lang;
  const meta = byCode(lang);
  setLocale(safeLocale(meta.locale)); // nombres, prix et dates dans la langue choisie

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir; // arabe : lecture de droite à gauche
  }, [lang, meta.dir]);

  const setLang = useCallback((code) => {
    try {
      localStorage.setItem('lang', code);
    } catch {
      /* navigation privée : on ne mémorise pas */
    }
    setLangState(code);
  }, []);

  const t = useCallback((key, vars) => translate(key, vars), [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ lang, setLang, t, dir: meta.dir, languages: LANGUAGES }), [lang, setLang, t, meta.dir]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Recrée l'interface quand la langue change, pour que chaque texte, prix et date soit recalculé
export function LangKey({ children }) {
  const { lang } = useI18n();
  return <div key={lang} className="lang-root">{children}</div>;
}
