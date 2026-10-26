import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '../api.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const FALLBACK = [
  { _id: 'f1', title: "Trouvez ce qu'il vous faut", subtitle: 'Payez en FCFA, recevez chez vous', cta: 'Parcourir le catalogue', link: '/produits', color: '#232f3e' },
];

// Carrousel de bannières de l'accueil (gérées dans l'administration)
export default function HeroCarousel({ banners }) {
  const { t } = useI18n();
  const slides = banners.length ? banners : FALLBACK;
  const [i, setI] = useState(0);
  const index = i % slides.length;

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setI((x) => x + 1), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  const go = (d) => setI((x) => (x + d + slides.length) % slides.length);
  const s = slides[index];

  return (
    <section className="hero-carousel" aria-roledescription="carrousel">
      <div
        className="hero-slide"
        style={{
          background: s.image
            ? `linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.1)), url(${assetUrl(s.image)}) center/cover`
            : `linear-gradient(120deg, ${s.color || '#0a4733'}, #04170f 140%)`,
        }}
      >
        <div className="hero-copy">
          <h1>{t(s.title)}</h1>
          {s.subtitle && <p>{t(s.subtitle)}</p>}
          <Link to={s.link || '/produits'} className="btn btn-accent">{t(s.cta || 'Découvrir')}</Link>
        </div>
      </div>
      {slides.length > 1 && (
        <>
          <button className="hero-arrow left" onClick={() => go(-1)} aria-label={t('Bannière précédente')}>‹</button>
          <button className="hero-arrow right" onClick={() => go(1)} aria-label={t('Bannière suivante')}>›</button>
          <div className="hero-dots">
            {slides.map((b, k) => <button key={b._id} className={k === index ? 'on' : ''} onClick={() => setI(k)} aria-label={t('Bannière {n}', { n: k + 1 })} />)}
          </div>
        </>
      )}
    </section>
  );
}
