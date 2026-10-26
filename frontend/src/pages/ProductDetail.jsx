import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import ProductImage from '../components/ProductImage.jsx';
import ProductRow from '../components/ProductRow.jsx';
import Countdown from '../components/Countdown.jsx';
import Modal from '../components/Modal.jsx';
import InquiryForm from '../components/InquiryForm.jsx';
import SupplierCard from '../components/SupplierCard.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import Stars from '../components/Stars.jsx';
import CompareButton from '../components/CompareButton.jsx';
import { variantLabel } from '../context/CartContext.jsx';
import { getRecent, pushRecent } from '../hooks.js';
import { fcfa, num, formatDate, unitPriceFor, flashActive } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const shortDate = (offset) => new Date(Date.now() + offset * 86400000).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

export default function ProductDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [reviewMsg, setReviewMsg] = useState({ type: '', text: '' });
  const [photo, setPhoto] = useState(0);
  const [modal, setModal] = useState(null); // 'devis' | 'question' | 'echantillon'
  const [choice, setChoice] = useState({}); // options choisies : { Couleur: 'Noir', Taille: 'M' }
  const [needChoice, setNeedChoice] = useState('');

  const loadAll = () => {
    api.get(`/products/${id}`).then((r) => {
      setProduct(r.data);
      setQty((q) => Math.max(r.data.moq || 1, q));
    }).catch((e) => setError(errMsg(e)));
    api.get(`/products/${id}/reviews`).then((r) => setReviews(r.data)).catch(() => {});
  };

  useEffect(() => {
    setProduct(null);
    setError('');
    setAdded(false);
    setPhoto(0);
    setQty(1);
    setChoice({});
    setNeedChoice('');
    loadAll();
    api.get(`/products/${id}/related`).then((r) => setRelated(r.data)).catch(() => setRelated([]));
    const ids = getRecent().filter((x) => x !== id);
    if (ids.length) api.get('/products', { params: { ids: ids.join(',') } }).then((r) => setRecent(r.data)).catch(() => {});
    else setRecent([]);
    pushRecent(id);
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const photos = useMemo(() => (product ? [product.image, ...(product.images || [])].filter(Boolean) : []), [product]);
  const breakdown = useMemo(() => [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length })), [reviews]);

  const sendReview = async (e) => {
    e.preventDefault();
    setReviewMsg({ type: '', text: '' });
    try {
      await api.post(`/products/${id}/reviews`, form);
      setReviewMsg({ type: 'ok', text: t('Merci, votre avis est publié.') });
      loadAll();
    } catch (err) {
      setReviewMsg({ type: 'error', text: errMsg(err) });
    }
  };

  const removeReview = async (reviewId) => {
    if (!window.confirm(t('Supprimer cet avis ?'))) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      loadAll();
    } catch (err) {
      setReviewMsg({ type: 'error', text: errMsg(err) });
    }
  };

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!product) return <p className="empty">{t('Chargement…')}</p>;

  const out = product.stock <= 0;
  const moq = product.moq || 1;
  const unit = unitPriceFor(product, qty);
  const tiers = [{ minQty: 1, price: product.price }, ...(product.priceTiers || [])].sort((a, b) => a.minQty - b.minQty);
  const flash = flashActive(product);
  const threshold = settings.freeShippingThreshold;
  const shipText = product.freeShipping ? t('Livraison gratuite') : settings.shippingFee > 0 ? `${fcfa(settings.shippingFee)}${threshold > 0 ? ` ${t("— gratuite dès {amount} d'achats", { amount: fcfa(threshold) })}` : ''}` : t('Livraison offerte');
  const setQtyClamped = (v) => setQty(Math.max(moq, Math.min(product.stock, Number(v) || moq)));

  // toutes les options (couleur, taille…) doivent être choisies avant d'ajouter au panier
  const missing = (product.options || []).find((o) => !choice[o.name]);
  const ready = () => {
    if (missing) {
      setNeedChoice(t('Veuillez choisir : {name}', { name: t(missing.name) }));
      return false;
    }
    setNeedChoice('');
    return true;
  };
  const addToCart = () => {
    if (!ready()) return;
    add(product, qty, choice);
    setAdded(true);
  };

  return (
    <>
      <nav className="breadcrumb" aria-label={t('Fil d\'Ariane')}>
        <Link to="/">{t('Accueil')}</Link> › {product.market ? <><Link to="/marches">{t('Les marchés')}</Link> › <Link to={`/marches/${product.market.slug}`}>{product.market.name}</Link></> : <Link to="/boutique-officielle">{t('Boutique officielle')}</Link>} › <Link to={product.market ? `/marches/${product.market.slug}?category=${product.category?._id}` : product.category?.slug ? `/rayon/${product.category.slug}` : `/produits?category=${product.category?._id}`}>{t(product.category?.name || '')}</Link> › <span>{product.name}</span>
      </nav>

      <div className="pd-grid">
        <div className="pd-gallery card">
          {photos.length > 1 && (
            <div className="thumbs">
              {photos.map((src, i) => (
                <button key={src + i} className={i === photo ? 'on' : ''} onClick={() => setPhoto(i)} onMouseEnter={() => setPhoto(i)} aria-label={t('Photo {n}', { n: i + 1 })}>
                  <ProductImage product={product} src={src} />
                </button>
              ))}
            </div>
          )}
          <div className="main-photo">
            <ProductImage product={product} src={photos[photo]} className="detail-img" />
            {product.discountPercent > 0 && <span className="badge-discount">−{product.discountPercent} %</span>}
          </div>
        </div>

        <div className="pd-info card">
          <div className="title-row">
            <h1>{product.name}</h1>
            <FavoriteButton productId={product._id} />
          </div>
          <CompareButton productId={product._id} />
          {product.brand && <p className="muted">{t('Marque :')}{' '}<strong>{product.brand}</strong></p>}
          <p className="rating-line">
            {product.ratingCount > 0 ? (
              <>
                <Stars value={product.ratingAvg} size="1.15rem" />
                <a href="#avis">{product.ratingAvg} / 5 · {t('{n} avis', { n: num(product.ratingCount) })}</a>
              </>
            ) : <span className="muted">{t('Aucun avis pour l\'instant')}</span>}
            {product.sold > 0 && <span className="muted"> | {t('{n} vendus', { n: num(product.sold) })}</span>}
          </p>
          {flash && <p className="flash-banner">{t('⚡ Vente Flash')}{' '}<Countdown until={product.flashSaleEnds} /></p>}

          <div className="pd-price">
            {product.discountPercent > 0 && <span className="badge-discount inline">−{product.discountPercent} %</span>}
            <span className="price big">{fcfa(unit)}</span>
            {product.oldPrice > product.price && <s className="old-price">{fcfa(product.oldPrice)}</s>}
            <span className="muted small">{' '}{t('/ unité')}{tiers.length > 1 ? ' ' + t(qty > 1 ? 'pour {n} unités' : 'pour {n} unité', { n: qty }) : ''}</span>
          </div>

          {tiers.length > 1 && (
            <div className="tier-table" role="table" aria-label={t('Prix selon la quantité')}>
              {tiers.map((tr, i) => {
                const next = tiers[i + 1];
                const active = unit === tr.price && qty >= tr.minQty && (!next || qty < next.minQty);
                return (
                  <div key={tr.minQty} className={`tier ${active ? 'on' : ''}`} role="row">
                    <span className="muted small">{next ? t('{min} – {max} unités', { min: tr.minQty, max: next.minQty - 1 }) : t('≥ {min} unités', { min: tr.minQty })}</span>
                    <strong>{fcfa(tr.price)}</strong>
                  </div>
                );
              })}
            </div>
          )}
          {product.options?.length > 0 && (
            <div className="options">
              {product.options.map((o) => (
                <fieldset key={o.name}>
                  <legend>{t(o.name)}{choice[o.name] ? <> : <strong>{t(choice[o.name])}</strong></> : null}</legend>
                  <div className="option-values">
                    {o.values.map((v) => (
                      <button key={v} type="button" className={`option-btn ${choice[o.name] === v ? 'on' : ''}`} aria-pressed={choice[o.name] === v} onClick={() => { setChoice({ ...choice, [o.name]: v }); setNeedChoice(''); }}>{t(v)}</button>
                    ))}
                  </div>
                </fieldset>
              ))}
              {needChoice && <p className="alert alert-error">{needChoice}</p>}
            </div>
          )}
          {moq > 1 && <p className="alert alert-warn">{t('Commande minimum :')}{' '}<strong>{moq}{' '}{t('unités')}</strong></p>}

          {product.specs?.length > 0 && (
            <>
              <h2 className="h-sm">{t('Caractéristiques')}</h2>
              <dl className="specs">
                {product.specs.map((s) => (
                  <div key={s.label}><dt>{t(s.label)}</dt><dd>{s.value}</dd></div>
                ))}
              </dl>
            </>
          )}
        </div>

        <aside className="pd-buy card">
          <h3>{t('Livraison')}</h3>
          <p className={product.freeShipping ? 'text-green' : ''}><strong>{shipText}</strong></p>
          <p className="small muted">{t('Livraison estimée :')}{' '}{shortDate(2)} – {shortDate(5)}</p>
          <p className={out ? 'text-red' : 'text-green'}><strong>{out ? t('Produit épuisé') : product.stock <= 5 ? t('Plus que {n} en stock', { n: product.stock }) : t('En stock')}</strong></p>

          {!out && !isAdmin && (
            <>
              <label>{t('Quantité')}<div className="qty">
                  <button onClick={() => setQtyClamped(qty - 1)} aria-label={t('Diminuer la quantité')}>−</button>
                  <input type="number" min={moq} max={product.stock} value={qty} onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))} onBlur={(e) => setQtyClamped(e.target.value)} aria-label={t('Quantité')} />
                  <button onClick={() => setQtyClamped(qty + 1)} aria-label={t('Augmenter la quantité')}>+</button>
                </div>
              </label>
              <div className="total-row"><span>{t('Sous-total')}</span><strong>{fcfa(unit * (Number(qty) || moq))}</strong></div>
              <button className="btn btn-primary block" onClick={addToCart}>{t('Ajouter au panier')}</button>
              <button className="btn btn-accent block" onClick={() => { if (!ready()) return; add(product, qty, choice); navigate('/panier'); }}>{t('Acheter maintenant')}</button>
              {added && <p className="alert alert-ok">{t('Ajouté au panier.')}{' '}<Link to="/panier">{t('Voir le panier')}</Link></p>}
            </>
          )}
          {!isAdmin && (
            <div className="contact-btns">
              <button className="btn block" onClick={() => setModal('devis')}>{t('Demander un devis')}</button>
              {product.sampleAvailable && <button className="btn block" onClick={() => setModal('echantillon')}>{t('📦 Demander un échantillon')}</button>}
              <button className="btn block" onClick={() => setModal('question')}>{t('💬 Discuter avec le vendeur')}</button>
            </div>
          )}

          <div className="protect">
            <h3>{t('Protection des commandes')}</h3>
            <p>🔒 <strong>{t('Paiement à la livraison')}</strong><br /><span className="muted small">{t('Espèces, Wave ou Orange Money à la réception.')}</span></p>
            <p>↩️ <strong>{t('Protection de remboursement')}</strong><br /><span className="muted small">{t('Signalez un problème sous {n} jours après la livraison.', { n: settings.returnDays })}</span></p>
            <p>📦 <strong>{t('Suivi de commande')}</strong><br /><span className="muted small">{t('Confirmation, expédition et livraison dans « Mes commandes ».')}</span></p>
          </div>
        </aside>
      </div>

      <SupplierCard supplier={product.supplier} />

      <section className="card pd-desc">
        <h2>{t('Description')}</h2>
        <p>{product.description || 'Aucune description.'}</p>
      </section>

      <section className="reviews card" id="avis">
        <h2>{t('Avis des clients')}</h2>
        {reviews.length > 0 && (
          <div className="rating-breakdown">
            <div className="big-score"><strong>{product.ratingAvg}</strong><Stars value={product.ratingAvg} size="1.3rem" /><span className="muted small">{t('{n} avis', { n: num(product.ratingCount) })}</span></div>
            <div className="bars">
              {breakdown.map(({ n, count }) => (
                <div key={n} className="bar-row"><span>{n} ★</span><div className="bar"><span style={{ width: `${(count / reviews.length) * 100}%` }} /></div><span className="muted small">{Math.round((count / reviews.length) * 100)} %</span></div>
              ))}
            </div>
          </div>
        )}
        {reviews.length === 0 && <p className="muted">{t('Aucun avis pour le moment.')}</p>}
        <div className="stack">
          {reviews.map((r) => (
            <article className="review" key={r._id}>
              <div className="review-head">
                <strong>{r.user?.name || 'Client'}</strong>
                <Stars value={r.rating} />
                <span className="muted small">{formatDate(r.createdAt)}</span>
                <span className="mini-tag mini-orange">{t('Achat vérifié')}</span>
                {(isAdmin || r.user?._id === user?._id) && (
                  <button className="btn btn-ghost btn-small" onClick={() => removeReview(r._id)}>{t('Supprimer')}</button>
                )}
              </div>
              {r.comment && <p>{r.comment}</p>}
            </article>
          ))}
        </div>

        {user && !isAdmin && (
          <form className="form review-form" onSubmit={sendReview}>
            <h3>{t('Donner mon avis')}</h3>
            <Stars value={form.rating} onChange={(n) => setForm({ ...form, rating: n })} size="1.6rem" />
            <label>{t('Commentaire (facultatif)')}<textarea rows="3" maxLength="1000" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </label>
            {reviewMsg.text && <p className={`alert alert-${reviewMsg.type}`}>{reviewMsg.text}</p>}
            <button className="btn btn-primary">{t('Publier')}</button>
            <p className="muted small">{t('Vous pouvez noter un produit une fois votre commande livrée. Un nouvel envoi remplace votre avis.')}</p>
          </form>
        )}
        {!user && <p className="muted"><Link to="/connexion">{t('Connectez-vous')}</Link>{' '}{t('pour donner votre avis.')}</p>}
      </section>

      <ProductRow title={t('Autres recommandations pour vous')} products={related} />
      <ProductRow title={t('Consultés récemment')} products={recent} />

      {modal && (
        <Modal title={modal === 'devis' ? t('Demander un devis — {name}', { name: product.name }) : modal === 'echantillon' ? t('Échantillon — {name}', { name: product.name }) : t('Discuter avec {name}', { name: product.supplier?.name || t('le vendeur') })} onClose={() => setModal(null)}>
          <InquiryForm product={product} type={modal} variant={variantLabel(choice)} defaultQuantity={modal === 'echantillon' ? 1 : qty > 1 ? qty : undefined} onSent={() => {}} />
        </Modal>
      )}
    </>
  );
}
