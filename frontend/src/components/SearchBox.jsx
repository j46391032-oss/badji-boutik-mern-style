import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useDebounce } from '../hooks.js';
import { fcfa } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Recherche avec suggestions (produits, catégories, marques), navigation au clavier
export default function SearchBox({ categories }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sugg, setSugg] = useState({ products: [], categories: [], brands: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef(null);
  const term = useDebounce(q.trim(), 250);

  useEffect(() => {
    if (term.length < 2) {
      setSugg({ products: [], categories: [], brands: [] });
      return undefined;
    }
    let cancelled = false;
    api.get('/products/suggest', { params: { q: term } }).then((r) => !cancelled && setSugg(r.data)).catch(() => {});
    return () => { cancelled = true; };
  }, [term]);

  useEffect(() => {
    const close = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Liste à plat des suggestions, pour le clavier
  const options = [
    ...sugg.products.map((p) => ({ type: 'product', label: p.name, extra: fcfa(p.price), to: `/produits/${p._id}` })),
    ...sugg.categories.map((c) => ({ type: 'cat', label: `${c.icon || '📦'} ${t(c.name)}`, extra: t('Catégorie'), to: `/produits?category=${c._id}` })),
    ...sugg.brands.map((b) => ({ type: 'brand', label: b, extra: t('Marque'), to: `/produits?brand=${encodeURIComponent(b)}` })),
  ];

  const go = (to) => {
    setOpen(false);
    setActive(-1);
    navigate(to);
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].to);
    const p = new URLSearchParams();
    if (q.trim()) p.set('search', q.trim());
    if (cat) p.set('category', cat);
    go(`/produits?${p.toString()}`);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <form className="nav-search" onSubmit={submit} role="search" ref={box}>
      <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('Catégorie')}>
        <option value="">{t('Toutes')}</option>
        {categories.map((c) => <option key={c._id} value={c._id}>{t(c.name)}</option>)}
      </select>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={t('Rechercher un produit, une marque…')}
        aria-label={t('Rechercher')}
        aria-autocomplete="list"
        autoComplete="off"
      />
      <button aria-label={t('Rechercher')}>🔍</button>
      {open && term.length >= 2 && options.length > 0 && (
        <ul className="suggest" role="listbox">
          {options.map((o, i) => (
            <li key={o.type + o.label} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(o.to)} onMouseEnter={() => setActive(i)}>
                <span>{o.label}</span><span className="muted small">{o.extra}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
