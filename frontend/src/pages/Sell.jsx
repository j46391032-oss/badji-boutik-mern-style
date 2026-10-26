import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// « Vendre sur Boutik » : présentation et ouverture d'une boutique (comme sur Shopify, mais dans une place de marché)
export default function Sell() {
  const { t } = useI18n();
  const { user, refresh, isAdmin } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', market: '', city: user?.city || '', phone: user?.phone || '', description: '' });
  const [markets, setMarkets] = useState([]);
  useEffect(() => {
    api.get('/markets').then((r) => setMarkets(r.data)).catch(() => {});
  }, []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const rate = settings.commissionRate ?? 10;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.market) return setError(t('Choisissez le marché où ouvrir votre boutique'));
    setLoading(true);
    try {
      await api.post('/seller/shop', form);
      await refresh(); // le compte devient « vendeur »
      navigate('/vendeur');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    ['1', t('Créez votre boutique'), t('Donnez-lui un nom, une description et un logo. C’est gratuit.')],
    ['2', t('Ajoutez vos produits'), t('Photos, prix, stock, options (taille, couleur) et prix dégressifs pour les gros clients.')],
    ['3', t('Recevez des commandes'), t('Chaque commande de votre boutique arrive dans votre espace vendeur, avec les coordonnées du client.')],
    ['4', t('Livrez et encaissez'), t('Le client paie à la livraison. Vous ne reversez que la commission sur les ventes livrées.')],
  ];

  return (
    <>
      <section className="sell-hero card">
        <h1>{t('Vendez vos produits sur Boutik')}</h1>
        <p>{t('Ouvrez votre boutique en ligne en quelques minutes et touchez des milliers d’acheteurs au Sénégal et dans la région.')}</p>
        <ul className="sell-points">
          <li>✔ {t('Aucun abonnement, aucun frais d’ouverture')}</li>
          <li>✔ {t('Commission de {rate} % seulement sur les ventes livrées', { rate })}</li>
          <li>✔ {t('Tableau de bord : ventes, stocks, commandes et messages')}</li>
        </ul>
      </section>

      <section className="sell-steps">
        {steps.map(([n, title, text]) => (
          <div key={n} className="card sell-step"><span className="sell-num">{n}</span><strong>{title}</strong><span className="muted">{text}</span></div>
        ))}
      </section>

      <section className="card sell-form">
        {user?.shop ? (
          <>
            <h2>{t('Vous avez déjà une boutique')}</h2>
            <Link to="/vendeur" className="btn btn-primary">{t('Aller à mon espace vendeur')}</Link>
          </>
        ) : isAdmin ? (
          <p className="alert alert-warn">{t('Les comptes administrateur ne peuvent pas ouvrir de boutique.')}</p>
        ) : !user ? (
          <>
            <h2>{t('Prêt à vendre ?')}</h2>
            <p className="muted">{t('Connectez-vous ou créez un compte pour ouvrir votre boutique.')}</p>
            <div className="row">
              <Link to="/inscription" state={{ from: '/vendre' }} className="btn btn-primary">{t('Créer un compte')}</Link>
              <Link to="/connexion" state={{ from: '/vendre' }} className="btn">{t('Se connecter')}</Link>
            </div>
          </>
        ) : (
          <form className="form" onSubmit={submit}>
            <h2>{t('Ouvrir ma boutique')}</h2>
            <fieldset className="market-pick">
              <legend>{t('Dans quel marché ouvrir votre boutique ?')}</legend>
              {markets.map((m) => (
                <label key={m._id} className={`market-option ${form.market === m.slug ? 'on' : ''}`} style={{ '--mk': m.color }}>
                  <input type="radio" name="market" value={m.slug} checked={form.market === m.slug} onChange={change} />
                  <span className="market-icon" aria-hidden="true">{m.icon}</span>
                  <span><strong>{m.name}</strong><br /><span className="muted small">{m.categories.map((c) => t(c.name)).join(' · ')}</span></span>
                </label>
              ))}
            </fieldset>
            <label>{t('Nom de la boutique')}<input name="name" value={form.name} onChange={change} required minLength="3" maxLength="60" placeholder={t('Ex. : Atelier Fatou')} /></label>
            <label>{t('Ville')}<input name="city" value={form.city} onChange={change} /></label>
            <label>{t('Téléphone')}<input name="phone" value={form.phone} onChange={change} /></label>
            <label>{t('Description')}<textarea name="description" rows="3" maxLength="1000" value={form.description} onChange={change} placeholder={t('Que vendez-vous ?')} /></label>
            {error && <p className="alert alert-error">{error}</p>}
            <button className="btn btn-primary" disabled={loading}>{loading ? t('Création…') : t('Ouvrir ma boutique')}</button>
            <p className="muted small">{settings.autoApproveShops ? t('Votre boutique est publiée immédiatement.') : t('L’équipe Boutik valide chaque nouvelle boutique avant sa mise en ligne.')}</p>
          </form>
        )}
      </section>
    </>
  );
}
