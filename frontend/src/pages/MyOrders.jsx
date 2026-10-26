import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import Modal from '../components/Modal.jsx';
import { fcfa, formatDate, parseVariant, RETURN_REASONS } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function MyOrders() {
  const { t } = useI18n();
  const location = useLocation();
  const { add } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [ret, setRet] = useState(null); // commande pour laquelle on demande un retour
  const [retForm, setRetForm] = useState({ reason: RETURN_REASONS[0], details: '' });
  const [retError, setRetError] = useState('');
  const { settings } = useSettings();

  const load = () =>
    api
      .get('/orders/mine')
      .then((r) => setOrders(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id) => {
    if (!window.confirm(t('Annuler cette commande ?'))) return;
    try {
      await api.put(`/orders/${id}`, { status: 'Annulée' });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  // « Acheter à nouveau » : remet dans le panier les produits encore disponibles
  const reorder = async (o) => {
    setMsg('');
    const ids = o.items.map((i) => i.product);
    try {
      const { data } = await api.get('/products', { params: { ids: ids.join(',') } });
      let n = 0;
      o.items.forEach((i) => {
        const p = data.find((x) => x._id === i.product);
        if (p && p.stock > 0) {
          const variant = parseVariant(i.variant);
          // l'option doit toujours exister ; sinon le client la choisit sur la fiche produit
          const valid = (p.options || []).every((o) => o.values.includes(variant[o.name]));
          if (!valid) return;
          add(p, Math.min(i.quantity, p.stock), variant);
          n += 1;
        }
      });
      setMsg(n ? t(n > 1 ? '{n} produits ajoutés au panier.' : '{n} produit ajouté au panier.', { n }) : t('Ces produits ne sont plus disponibles.'));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const sendReturn = async (e) => {
    e.preventDefault();
    setRetError('');
    try {
      await api.post(`/orders/${ret._id}/return`, retForm);
      setRet(null);
      setRetForm({ reason: RETURN_REASONS[0], details: '' });
      setMsg(t('Votre demande de retour est envoyée. Nous vous répondons rapidement.'));
      load();
    } catch (err) {
      setRetError(errMsg(err));
    }
  };

  // retour possible : commande livrée, sans demande en cours, dans le délai des réglages
  const canReturn = (o) => {
    if (o.status !== 'Livrée' || o.returnRequest?.status) return false;
    const delivered = [...o.history].reverse().find((h) => h.status === 'Livrée')?.at || o.updatedAt;
    return Date.now() <= new Date(delivered).getTime() + (settings.returnDays || 0) * 86400000;
  };

  return (
    <>
      <h1>{t('Mes commandes')}</h1>
      {location.state?.created && (
        <p className="alert alert-ok">{t('Commande #{n} enregistrée. Nous vous contacterons pour la livraison.', { n: location.state.created })}</p>
      )}
      {msg && <p className="alert alert-ok">{msg} <Link to="/panier">{t('Voir le panier')}</Link></p>}
      {error && <p className="alert alert-error">{error}</p>}
      {loading ? (
        <p className="empty">{t('Chargement…')}</p>
      ) : orders.length === 0 ? (
        <p className="empty">{t('Vous n\'avez pas encore passé de commande.')}{' '}<Link to="/produits">{t('Voir les produits')}</Link></p>
      ) : (
        <div className="stack">
          {orders.map((o) => (
            <article className="card order" key={o._id}>
              <div className="order-head">
                <div><span className="muted small">{t('Commande passée le')}</span><br />{formatDate(o.createdAt)}</div>
                <div><span className="muted small">{t('Total')}</span><br />{fcfa(o.totalAmount)}</div>
                <div><span className="muted small">{t('Livrer à')}</span><br />{o.shippingAddress.fullName}</div>
                <div className="right"><span className="muted small">{t('Commande n°')}{' '}{o.orderNumber}</span><br /><StatusBadge status={o.status} /></div>
              </div>
              <OrderTimeline order={o} />
              <ul className="order-items">
                {o.items.map((i) => (
                  <li key={i.product + (i.variant || '')}>
                    <span><Link to={`/produits/${i.product}`}>{i.name} × {i.quantity}</Link>{i.variant && <span className="small variant-line"> — {i.variant}</span>}</span>
                    <span>{fcfa(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="order-foot">
                <span className="muted small">
                  {o.shippingAddress.address}, {o.shippingAddress.city}
                  {o.shippingFee > 0 && ` · ${t('livraison')} ${fcfa(o.shippingFee)}`}
                  {o.discount > 0 && ` · ${t('code')} ${o.couponCode} : − ${fcfa(o.discount)}`}
                  {o.paymentMethod && ` · ${o.paymentMethod}`}
                </span>
              </div>
              {o.returnRequest?.status && (
                <div className={`alert ${o.returnRequest.status === 'Refusée' ? 'alert-error' : 'alert-ok'}`}>
                  <strong>{t('Retour :')}{' '}{t(o.returnRequest.status)}</strong> — {t(o.returnRequest.reason)}
                  {o.returnRequest.adminReply && <><br /><span className="small">{t('Réponse du vendeur :')}{' '}{o.returnRequest.adminReply}</span></>}
                </div>
              )}
              <div className="row">
                <button className="btn btn-small btn-primary" onClick={() => reorder(o)}>{t('Acheter à nouveau')}</button>
                <Link className="btn btn-small" to={`/facture/${o._id}`}>{t('Facture')}</Link>
                {canReturn(o) && <button className="btn btn-small" onClick={() => { setRet(o); setRetError(''); }}>{t('Demander un retour')}</button>}
                {o.status === 'En attente' && <button className="btn btn-ghost btn-small" onClick={() => cancel(o._id)}>{t('Annuler la commande')}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
      {ret && (
        <Modal title={t('Retour — commande n° {n}', { n: ret.orderNumber })} onClose={() => setRet(null)}>
          <form className="form" onSubmit={sendReturn}>
            <label>{t('Motif')}<select value={retForm.reason} onChange={(e) => setRetForm({ ...retForm, reason: e.target.value })}>
                {RETURN_REASONS.map((r) => <option key={r} value={r}>{t(r)}</option>)}
              </select>
            </label>
            <label>{t('Détails (facultatif)')}<textarea rows="4" maxLength="1000" value={retForm.details} onChange={(e) => setRetForm({ ...retForm, details: e.target.value })} placeholder={t('Décrivez le problème rencontré…')} />
            </label>
            {retError && <p className="alert alert-error">{retError}</p>}
            <button className="btn btn-primary">{t('Envoyer la demande')}</button>
            <p className="muted small">{t('Retour possible sous {n} jours après la livraison.', { n: settings.returnDays })}</p>
          </form>
        </Modal>
      )}
    </>
  );
}
