import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { fcfa, formatDate } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Facture imprimable (client et administrateur) — Ctrl+P / « Imprimer » pour l'enregistrer en PDF
export default function Invoice() {
  const { t } = useI18n();
  const { id } = useParams();
  const { settings } = useSettings();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!order) return <p className="empty">{t('Chargement…')}</p>;

  return (
    <div className="invoice card">
      <div className="invoice-actions no-print">
        <button className="btn btn-ghost" onClick={() => window.history.back()}>{t('← Retour')}</button>
        <button className="btn btn-primary" onClick={() => window.print()}>{t('Imprimer / PDF')}</button>
      </div>
      <header>
        <div>
          <h1>{settings.shopName}</h1>
          <p className="muted small">{settings.supportEmail} {settings.supportPhone && `· ${settings.supportPhone}`}</p>
        </div>
        <div className="right">
          <h2>{t('Facture n°')}{' '}{order.orderNumber}</h2>
          <p className="muted">{formatDate(order.createdAt)}</p>
        </div>
      </header>
      <section className="invoice-addr">
        <div>
          <strong>{t('Facturé et livré à')}</strong>
          <p>{order.shippingAddress.fullName}<br />{order.shippingAddress.address}<br />{order.shippingAddress.city}<br />{order.shippingAddress.phone}</p>
        </div>
        <div>
          <strong>{t('Paiement')}</strong>
          <p>{t(order.paymentMethod || 'À la livraison')}<br />{t('Statut :')}{' '}{t(order.status)}</p>
        </div>
      </section>
      <table>
        <thead><tr><th>{t('Article')}</th><th className="right">{t('Prix unitaire')}</th><th className="right">{t('Qté')}</th><th className="right">{t('Total')}</th></tr></thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.product + (i.variant || '')}><td>{i.name}{i.variant && <div className="small muted">{i.variant}</div>}</td><td className="right">{fcfa(i.price)}</td><td className="right">{i.quantity}</td><td className="right">{fcfa(i.price * i.quantity)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="invoice-total">
        <div><span>{t('Sous-total')}</span><span>{fcfa(order.subtotal)}</span></div>
        {order.discount > 0 && <div><span>{t('Remise ({code})', { code: order.couponCode })}</span><span>− {fcfa(order.discount)}</span></div>}
        <div><span>{t('Livraison')}</span><span>{order.shippingFee > 0 ? fcfa(order.shippingFee) : t('Gratuite')}</span></div>
        <div className="grand"><span>{t('Total')}</span><strong>{fcfa(order.totalAmount)}</strong></div>
      </div>
    </div>
  );
}
