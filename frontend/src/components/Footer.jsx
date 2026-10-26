import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Footer() {
  const { t } = useI18n();
  const { settings } = useSettings();
  return (
    <footer className="footer">
      <button className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{t('Retour en haut')}</button>
      <div className="container footer-cols">
        <div>
          <h4>{t('Acheter')}</h4>
          <Link to="/boutique-officielle">{t('Boutique officielle')}</Link>
          <Link to="/marches">{t('Les marchés')}</Link>
          <Link to="/produits">{t('Tous les produits')}</Link>
          <Link to="/produits?flash=1">{t('Ventes Flash')}</Link>
          <Link to="/produits?sort=best">{t('Meilleures ventes')}</Link>
          <Link to="/produits?freeShipping=1">{t('Livraison gratuite')}</Link>
        </div>
        <div>
          <h4>{t('Pour les professionnels')}</h4>
          <Link to="/demande-devis">{t('Demander un devis')}</Link>
          <Link to="/mes-devis">{t('Mes demandes')}</Link>
          <Link to="/vendre">{t('Vendre sur Boutik')}</Link>
          <Link to="/vendeurs">{t('Annuaire des vendeurs')}</Link>
          <Link to="/produits?samples=1">{t('Échantillons disponibles')}</Link>
          <Link to="/comparer">{t('Comparer des produits')}</Link>
        </div>
        <div>
          <h4>{t('Aide')}</h4>
          <Link to="/aide">{t('Centre d\'aide')}</Link>
          <Link to="/mes-commandes">{t('Suivre ma commande')}</Link>
          <Link to="/profil">{t('Mon compte')}</Link>
        </div>
        <div>
          <h4>{t('Contact')}</h4>
          {settings.supportPhone && <span>{settings.supportPhone}</span>}
          {settings.supportEmail && <span>{settings.supportEmail}</span>}
          <span>{t('Paiement à la livraison : espèces, Wave, Orange Money')}</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <LanguageSwitcher className="on-dark" />© {new Date().getFullYear()} {settings.shopName}{' '}{t('— Dakar, Sénégal')}</div>
    </footer>
  );
}
