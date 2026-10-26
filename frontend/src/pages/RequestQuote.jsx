import { Link } from 'react-router-dom';
import InquiryForm from '../components/InquiryForm.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// « Demander un devis » (style Alibaba) : décrire un besoin sans produit précis
export default function RequestQuote() {
  const { t } = useI18n();
  return (
    <div className="rfq">
      <section className="card rfq-main">
        <h1>{t('Demander un devis')}</h1>
        <p className="muted">{t('Dites-nous ce que vous cherchez : nos vendeurs vous répondent avec un prix, un délai et les options de livraison.')}</p>
        <InquiryForm type="devis" />
      </section>
      <aside className="card rfq-side">
        <h2>{t('Comment ça marche ?')}</h2>
        <ol>
          <li><strong>{t('Décrivez votre besoin')}</strong>{' '}{t(': produit, quantité, budget.')}</li>
          <li><strong>{t('Recevez une réponse')}</strong>{' '}{t('du vendeur dans « Mes demandes ».')}</li>
          <li><strong>{t('Commandez')}</strong>{' '}{t('au prix convenu avec livraison suivie.')}</li>
        </ol>
        <p className="small muted">{t('Pour un produit du catalogue, utilisez plutôt le bouton « Demander un devis » de sa fiche.')}{' '}<Link to="/mes-devis">{t('Voir mes demandes')}</Link></p>
      </aside>
    </div>
  );
}
