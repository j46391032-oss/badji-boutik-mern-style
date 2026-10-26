import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';

const pad = (n) => String(n).padStart(2, '0');

// Compte à rebours d'une vente flash
export default function Countdown({ until, compact = false }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(new Date(until).getTime() - now, 0);
  if (left <= 0) return null;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className={`countdown ${compact ? 'compact' : ''}`} aria-label={t('Temps restant')}>
      ⏱ {d > 0 && `${d} j `}{pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
