import { useEffect } from 'react';

// Panneau latéral (détail d'une commande, d'un client, formulaire…)
export default function Drawer({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="adm-overlay" onClick={onClose}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header>
          <div><h2>{title}</h2>{subtitle && <div className="muted small">{subtitle}</div>}</div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Fermer">✕</button>
        </header>
        <div className="adm-drawer-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </div>
  );
}
