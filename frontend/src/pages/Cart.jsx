import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import ProductImage from '../components/ProductImage.jsx';
import { useCart, variantLabel } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { fcfa, PAYMENTS, shippingFor } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import ImpulseRow from '../components/ImpulseRow.jsx';

export default function Cart() {
  const { t } = useI18n();
  const { items, remove, setQuantity, clear, total, unitPrice, productQty } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponMsg, setCouponMsg] = useState('');
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
  });

  const applyCoupon = async (e) => {
    e.preventDefault();
    setCouponMsg('');
    try {
      const { data } = await api.post('/coupons/validate', { code: codeInput, subtotal: total });
      setCoupon({ code: data.code, discount: data.discount });
      setCodeInput('');
    } catch (err) {
      setCoupon(null);
      setCouponMsg(errMsg(err));
    }
  };

  // le panier change : on revérifie le code (minimum de commande, montant de la remise)
  useEffect(() => {
    if (!coupon) return;
    api
      .post('/coupons/validate', { code: coupon.code, subtotal: total })
      .then(({ data }) => setCoupon({ code: data.code, discount: data.discount }))
      .catch((err) => {
        setCoupon(null);
        setCouponMsg(errMsg(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const discount = coupon?.discount || 0;
  const shipping = shippingFor(settings, items, total);
  const threshold = settings.freeShippingThreshold;
  const missing = threshold > 0 && shipping > 0 ? threshold - total : 0;
  const grand = total - discount + shipping;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const order = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ product: i._id, quantity: i.quantity, variant: i.variant })),
        shippingAddress: form,
        couponCode: coupon?.code,
        paymentMethod: payment,
      });
      clear();
      // un panier avec plusieurs boutiques donne une commande par boutique
      navigate('/mes-commandes', { state: { created: data.orders?.length > 1 ? data.orders.map((o) => o.orderNumber).join(', #') : data.orderNumber } });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <h1>{t('Mon panier')}</h1>
        <p className="empty">{t('Votre panier est vide.')}{' '}<Link to="/produits">{t('Parcourir les produits')}</Link></p>
      </>
    );
  }

  // Indication du prochain palier de prix dégressif
  const nextTier = (i) => (i.priceTiers || []).filter((t) => t.minQty > productQty(i._id)).sort((a, b) => a.minQty - b.minQty)[0];

  return (
    <>
      <h1>{t('Mon panier')}</h1>
      {threshold > 0 && !(items.length && items.every((i) => i.freeShipping)) && (
        <div className="card ship-progress">
          {missing > 0 ? <p>{t('Plus que {amount} pour profiter de la livraison gratuite.', { amount: fcfa(missing) })}</p> : <p className="text-green"><strong>{t('✔ Votre commande bénéficie de la livraison gratuite.')}</strong></p>}
          <div className="bar"><span style={{ width: `${Math.min((total / threshold) * 100, 100)}%` }} /></div>
        </div>
      )}
      <div className="cart-layout">
        <div className="card cart-list">
          {items.map((i) => {
            const nt = nextTier(i);
            return (
              <div className="cart-row" key={i.key}>
                <ProductImage product={i} className="thumb" />
                <div className="cart-info">
                  <Link to={`/produits/${i._id}`}><strong>{i.name}</strong></Link>
                  {variantLabel(i.variant) && <span className="small variant-line">{variantLabel(i.variant)}</span>}
                  <span className="muted">{fcfa(unitPrice(i))} × {i.quantity}{i.priceTiers?.length > 0 && unitPrice(i) < i.price ? ' ' + t('(prix dégressif)') : ''}</span>
                  {i.moq > 1 && <span className="small muted">{t('Quantité minimum :')}{' '}{i.moq}</span>}
                  {nt && <span className="small text-green">{t("Dès {n} unités : {price} l'unité", { n: nt.minQty, price: fcfa(nt.price) })}</span>}
                  {i.freeShipping && <span className="small text-green">{t('Livraison gratuite')}</span>}
                </div>
                <div className="qty">
                  <button onClick={() => setQuantity(i.key, i.quantity - 1)} aria-label={t('Diminuer la quantité')}>−</button>
                  <span>{i.quantity}</span>
                  <button onClick={() => setQuantity(i.key, i.quantity + 1)} aria-label={t('Augmenter la quantité')}>+</button>
                </div>
                <strong className="line-total">{fcfa(unitPrice(i) * i.quantity)}</strong>
                <button className="btn btn-ghost btn-small" onClick={() => remove(i.key)}>{t('Supprimer')}</button>
              </div>
            );
          })}
        </div>

        <aside className="card summary">
          <h2>{t('Récapitulatif')}</h2>
          {user && (
            coupon ? (
              <p className="alert alert-ok coupon-applied">{t('Code {code} appliqué', { code: coupon.code })}<button className="btn btn-ghost btn-small" onClick={() => setCoupon(null)}>{t('Retirer')}</button>
              </p>
            ) : (
              <form className="coupon-form" onSubmit={applyCoupon}>
                <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder={t('Code promo')} aria-label={t('Code promo')} />
                <button className="btn btn-small" disabled={!codeInput.trim()}>{t('Appliquer')}</button>
              </form>
            )
          )}
          {couponMsg && <p className="alert alert-error">{couponMsg}</p>}
          <div className="sum-row"><span>{t('Sous-total')}</span><span>{fcfa(total)}</span></div>
          {discount > 0 && <div className="sum-row text-green"><span>{t('Remise')}</span><span>− {fcfa(discount)}</span></div>}
          <div className="sum-row"><span>{t('Livraison')}</span><span>{shipping > 0 ? fcfa(shipping) : t('Gratuite')}</span></div>
          <div className="total-row"><span>{t('Total')}</span><strong>{fcfa(grand)}</strong></div>

          {!checkout ? (
            user ? (
              <button className="btn btn-primary block" onClick={() => setCheckout(true)}>{t('Passer la commande')}</button>
            ) : (
              <button className="btn btn-primary block" onClick={() => navigate('/connexion', { state: { from: '/panier' } })}>{t('Se connecter pour commander')}</button>
            )
          ) : (
            <form onSubmit={order} className="form">
              <h3>{t('Adresse de livraison')}</h3>
              <label>{t('Nom complet')}<input name="fullName" value={form.fullName} onChange={change} required /></label>
              <label>{t('Téléphone')}<input name="phone" value={form.phone} onChange={change} required /></label>
              <label>{t('Adresse')}<input name="address" value={form.address} onChange={change} required /></label>
              <label>{t('Ville')}<input name="city" value={form.city} onChange={change} required /></label>
              <h3>{t('Mode de paiement')}</h3>
              {PAYMENTS.map((p) => (
                <label key={p} className="check radio"><input type="radio" name="payment" checked={payment === p} onChange={() => setPayment(p)} /> {t(p)}</label>
              ))}
              {error && <p className="alert alert-error">{error}</p>}
              <button className="btn btn-primary block" disabled={loading}>{loading ? t('Envoi…') : t('Confirmer la commande · {amount}', { amount: fcfa(grand) })}</button>
            </form>
          )}
          <button className="btn btn-ghost block" onClick={clear}>{t('Vider le panier')}</button>
          <p className="small muted">{t('🔒 Vous payez à la réception. Retours sous {n} jours.', { n: settings.returnDays })}</p>
        </aside>
      </div>
      <ImpulseRow />
    </>
  );
}
