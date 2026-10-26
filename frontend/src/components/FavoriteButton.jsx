import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function FavoriteButton({ productId }) {
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();
  if (isAdmin) return null;
  const on = isFavorite(productId);

  return (
    <button
      className={`fav-btn ${on ? 'on' : ''}`}
      aria-pressed={on}
      aria-label={on ? t('Retirer des favoris') : t('Ajouter aux favoris')}
      onClick={(e) => {
        e.preventDefault();
        if (!user) return navigate('/connexion', { state: { from: '/favoris' } });
        toggle(productId);
      }}
    >
      {on ? '♥' : '♡'}
    </button>
  );
}
