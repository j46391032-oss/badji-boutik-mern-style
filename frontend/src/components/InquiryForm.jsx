import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

// Formulaire de demande : devis (RFQ) ou question au vendeur. Utilisé sur la fiche produit et sur /demande-devis.
export default function InquiryForm({ product, type = 'devis', onSent, defaultQuantity, supplierName, variant }) {
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    productName: product?.name || '',
    quantity: defaultQuantity || (product?.moq > 1 ? product.moq : ''),
    budget: '',
    message: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  if (!user) {
    return (
      <p className="muted">
        <Link to="/connexion" state={{ from: window.location.pathname }}>{t('Connectez-vous')}</Link>{' '}{t('ou')}{' '}<Link to="/inscription">{t('créez un compte')}</Link>{' '}{t('pour contacter le vendeur.')}</p>
    );
  }
  if (isAdmin) return <p className="muted">{t('Connectez-vous avec un compte client pour envoyer une demande.')}</p>;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/inquiries', {
        type,
        product: product?._id,
        productName: form.productName,
        subject: product
          ? type === 'question' ? `${product.name} — question` : type === 'echantillon' ? `Échantillon : ${product.name}` : `Devis : ${product.name}`
          : supplierName ? `Devis : ${form.productName} (${supplierName})` : `Devis : ${form.productName}`,
        quantity: Number(form.quantity) || 0,
        budget: Number(form.budget) || 0,
        message: variant ? `[Option souhaitée : ${variant}]\n${form.message}` : form.message,
      });
      setSent(true);
      onSent?.(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="alert alert-ok">{t('Votre demande est envoyée. Le vendeur vous répond dans « Mes demandes ».')}{' '}<Link to="/mes-devis">{t('Voir mes demandes')}</Link>
        <button className="btn btn-ghost btn-small" onClick={() => navigate('/mes-devis')}>{t('Voir mes demandes')}</button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      {!product && (
        <label>{t('Produit recherché')}<input name="productName" value={form.productName} onChange={change} placeholder={t('Ex. : 200 T-shirts floqués')} required />
        </label>
      )}
      <div className="two-cols">
        <label>{t('Quantité souhaitée')}<input name="quantity" type="number" min="1" value={form.quantity} onChange={change} /></label>
        {type !== 'question' && type !== 'echantillon' && <label>{t('Budget (FCFA, facultatif)')}<input name="budget" type="number" min="0" value={form.budget} onChange={change} /></label>}
      </div>
      <label>{type === 'question' ? t('Votre question') : type === 'echantillon' ? t('Adresse de livraison et remarques') : t('Détails de votre demande')}
        <textarea name="message" rows="4" maxLength="2000" value={form.message} onChange={change} required
          placeholder={type === 'question' ? t('Posez votre question au vendeur…') : type === 'echantillon' ? t('Où souhaitez-vous recevoir l’échantillon ? Précisez la taille, la couleur, etc.') : t('Décrivez ce dont vous avez besoin : personnalisation, délai, lieu de livraison…')} />
      </label>
      {error && <p className="alert alert-error">{error}</p>}
      <button className="btn btn-primary" disabled={loading}>{loading ? t('Envoi…') : type === 'question' ? t('Envoyer la question') : type === 'echantillon' ? t('Demander un échantillon') : t('Envoyer la demande')}</button>
    </form>
  );
}
