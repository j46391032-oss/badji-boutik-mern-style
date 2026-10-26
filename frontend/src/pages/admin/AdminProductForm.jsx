import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import { useScope } from '../../context/ScopeContext.jsx';
import ImageUploader from '../../components/admin/ImageUploader.jsx';
import ProductCard from '../../components/ProductCard.jsx';
import { fcfa } from '../../utils.js';

const EMPTY = {
  name: '', brand: '', description: '', price: '', oldPrice: '', stock: '', moq: 1, category: '', supplier: '',
  freeShipping: false, featured: false, published: true, flashSaleEnds: '',
  images: [], specs: [], priceTiers: [], options: [], sampleAvailable: false,
};

// datetime-local attend « AAAA-MM-JJThh:mm » en heure locale
const toLocal = (d) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export default function AdminProductForm() {
  const { id } = useParams();
  const S = useScope();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    if (!S.seller) api.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => {}); // le vendeur n'a que sa boutique
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .get(`${S.productApi}/${id}`)
      .then(({ data: p }) =>
        setForm({
          name: p.name, brand: p.brand || '', description: p.description || '', price: p.price, oldPrice: p.oldPrice || '', stock: p.stock, moq: p.moq || 1,
          category: p.category?._id || '', supplier: p.supplier?._id || '', freeShipping: p.freeShipping, featured: p.featured, published: p.published,
          flashSaleEnds: toLocal(p.flashSaleEnds), images: [p.image, ...(p.images || [])].filter(Boolean),
          specs: p.specs || [], priceTiers: p.priceTiers || [], sampleAvailable: Boolean(p.sampleAvailable),
          options: (p.options || []).map((o) => ({ name: o.name, values: o.values.join(', ') })), // valeurs séparées par des virgules
        })
      )
      .catch((e) => setMsg({ type: 'error', text: errMsg(e) }))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const change = (e) => set(e.target.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  const editRow = (key, i, patch) => set(key, form[key].map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const delRow = (key, i) => set(key, form[key].filter((_, k) => k !== i));

  // Aperçu en direct de la carte produit
  const preview = useMemo(() => {
    const price = Number(form.price) || 0;
    const old = Number(form.oldPrice) || 0;
    return {
      _id: 'preview', name: form.name || 'Nom du produit', brand: form.brand, price, oldPrice: old, image: form.images[0] || '', stock: Number(form.stock) || 0,
      moq: Number(form.moq) || 1, sold: 0, ratingAvg: 0, ratingCount: 0, freeShipping: form.freeShipping,
      priceTiers: form.priceTiers.map((t) => ({ minQty: Number(t.minQty), price: Number(t.price) })).filter((t) => t.minQty >= 2 && t.price >= 0),
      flashSaleEnds: form.flashSaleEnds ? new Date(form.flashSaleEnds).toISOString() : null,
      discountPercent: old > price && price >= 0 ? Math.round(((old - price) / old) * 100) : 0,
      category: categories.find((c) => c._id === form.category),
      supplier: suppliers.find((s) => s._id === form.supplier),
    };
  }, [form, categories, suppliers]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSaving(true);
    const body = {
      name: form.name, brand: form.brand, description: form.description, category: form.category, supplier: form.supplier || null,
      price: Number(form.price), oldPrice: Number(form.oldPrice) || 0, stock: Number(form.stock), moq: Number(form.moq) || 1,
      freeShipping: form.freeShipping, featured: form.featured, published: form.published,
      flashSaleEnds: form.flashSaleEnds ? new Date(form.flashSaleEnds).toISOString() : null,
      image: form.images[0] || '', images: form.images.slice(1),
      sampleAvailable: form.sampleAvailable,
      options: form.options.map((o) => ({ name: o.name, values: String(o.values).split(',').map((v) => v.trim()).filter(Boolean) })),
      specs: form.specs, priceTiers: form.priceTiers.map((t) => ({ minQty: Number(t.minQty), price: Number(t.price) })),
    };
    try {
      if (id) {
        await api.put(`${S.productApi}/${id}`, body);
        setMsg({ type: 'ok', text: 'Modifications enregistrées.' });
      } else {
        await api.post(S.productApi, body);
        navigate(`${S.base}/produits`);
      }
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="empty">Chargement…</p>;

  return (
    <form onSubmit={submit}>
      <div className="page-head">
        <div>
          <Link to={`${S.base}/produits`} className="back">← Produits</Link>
          <h1>{id ? 'Modifier le produit' : 'Nouveau produit'}</h1>
        </div>
        <div className="row no-margin">
          <Link to={`${S.base}/produits`} className="btn">Annuler</Link>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}

      <div className="form-layout">
        <div className="form-col">
          <section className="panel form">
            <h2>Informations</h2>
            <label>Nom du produit<input name="name" value={form.name} onChange={change} required /></label>
            <div className="two-cols">
              <label>Marque<input name="brand" value={form.brand} onChange={change} /></label>
              <label>Catégorie
                <select name="category" value={form.category} onChange={change} required>
                  <option value="">Choisir…</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                </select>
              </label>
            </div>
            <label>Description<textarea name="description" rows="4" value={form.description} onChange={change} /></label>
          </section>

          <section className="panel form">
            <h2>Images</h2>
            <p className="muted small">La première image est l'image principale ; les autres forment la galerie de la fiche produit (8 maximum).</p>
            {form.images.map((src, i) => (
              <div key={i} className="gallery-row">
                <ImageUploader label={i === 0 ? 'Image principale' : `Image ${i + 1}`} value={src} name={form.name} onChange={(url) => (url ? set('images', form.images.map((s, k) => (k === i ? url : s))) : delRow('images', i))} />
                {i > 0 && <button type="button" className="btn btn-small" onClick={() => set('images', [src, ...form.images.filter((_, k) => k !== i)])}>Définir comme principale</button>}
              </div>
            ))}
            {form.images.length < 8 && (
              <ImageUploader key={form.images.length} label="Ajouter une image" value="" name={form.name} onChange={(url) => url && set('images', [...form.images, url])} />
            )}
          </section>

          <section className="panel form">
            <h2>Prix et promotions</h2>
            <div className="two-cols">
              <label>Prix de vente (FCFA)<input type="number" min="0" name="price" value={form.price} onChange={change} required /></label>
              <label>Ancien prix barré (FCFA)<input type="number" min="0" name="oldPrice" value={form.oldPrice} onChange={change} placeholder="Laisser vide : pas de promo" /></label>
            </div>
            {preview.discountPercent > 0 && <p className="text-green small">Remise affichée : −{preview.discountPercent} % (économie de {fcfa(preview.oldPrice - preview.price)})</p>}
            <label>Vente flash jusqu'au<input type="datetime-local" name="flashSaleEnds" value={form.flashSaleEnds} onChange={change} /></label>
            <p className="muted small">Pendant la vente flash, le produit apparaît dans « Ventes Flash » avec un compte à rebours. Videz le champ pour l'arrêter.</p>
          </section>

          <section className="panel form">
            <h2>Prix dégressifs et quantité minimum</h2>
            <label>Quantité minimum de commande (MOQ)<input type="number" min="1" name="moq" value={form.moq} onChange={change} /></label>
            {form.priceTiers.length > 0 && (
              <div className="rows">
                {form.priceTiers.map((t, i) => (
                  <div key={i} className="row-inputs">
                    <label>À partir de (unités)<input type="number" min="2" value={t.minQty} onChange={(e) => editRow('priceTiers', i, { minQty: e.target.value })} /></label>
                    <label>Prix unitaire (FCFA)<input type="number" min="0" value={t.price} onChange={(e) => editRow('priceTiers', i, { price: e.target.value })} /></label>
                    <button type="button" className="btn btn-small btn-danger" onClick={() => delRow('priceTiers', i)} aria-label="Supprimer le palier">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div><button type="button" className="btn btn-small" onClick={() => set('priceTiers', [...form.priceTiers, { minQty: '', price: '' }])}>+ Ajouter un palier</button></div>
            <p className="muted small">Exemple : à partir de 10 unités, 9 000 FCFA l'unité. Le serveur applique le bon prix à la commande.</p>
          </section>

          <section className="panel form">
            <h2>Options au choix (couleur, taille…)</h2>
            {form.options.length > 0 && (
              <div className="rows">
                {form.options.map((o, i) => (
                  <div key={i} className="row-inputs">
                    <label>Option<input value={o.name} onChange={(e) => editRow('options', i, { name: e.target.value })} placeholder="Taille" /></label>
                    <label>Valeurs (séparées par des virgules)<input value={o.values} onChange={(e) => editRow('options', i, { values: e.target.value })} placeholder="S, M, L, XL" /></label>
                    <button type="button" className="btn btn-small btn-danger" onClick={() => delRow('options', i)} aria-label="Supprimer l'option">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div><button type="button" className="btn btn-small" onClick={() => set('options', [...form.options, { name: '', values: '' }])}>+ Ajouter une option</button></div>
            <p className="muted small">Le client doit choisir chaque option avant d'ajouter au panier. Le stock reste commun à toutes les variantes.</p>
          </section>

          <section className="panel form">
            <h2>Caractéristiques</h2>
            {form.specs.length > 0 && (
              <div className="rows">
                {form.specs.map((s, i) => (
                  <div key={i} className="row-inputs">
                    <label>Caractéristique<input value={s.label} onChange={(e) => editRow('specs', i, { label: e.target.value })} placeholder="Matière" /></label>
                    <label>Valeur<input value={s.value} onChange={(e) => editRow('specs', i, { value: e.target.value })} placeholder="100 % coton" /></label>
                    <button type="button" className="btn btn-small btn-danger" onClick={() => delRow('specs', i)} aria-label="Supprimer la ligne">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div><button type="button" className="btn btn-small" onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}>+ Ajouter une caractéristique</button></div>
          </section>
        </div>

        <div className="form-col side">
          <section className="panel form">
            <h2>Publication</h2>
            <label className="check"><input type="checkbox" name="published" checked={form.published} onChange={change} /> Visible dans la boutique</label>
            {!S.seller && <label className="check"><input type="checkbox" name="featured" checked={form.featured} onChange={change} /> Dans la « Sélection de la boutique »</label>}
            <label className="check"><input type="checkbox" name="sampleAvailable" checked={form.sampleAvailable} onChange={change} /> Échantillon disponible</label>
            <label className="check"><input type="checkbox" name="freeShipping" checked={form.freeShipping} onChange={change} /> Livraison gratuite</label>
          </section>
          <section className="panel form">
            <h2>Stock et vendeur</h2>
            <label>Stock<input type="number" min="0" name="stock" value={form.stock} onChange={change} required /></label>
            {!S.seller && (
              <>
            <label>Vendeur
                  <select name="supplier" value={form.supplier} onChange={change}>
                    <option value="">Aucun</option>
                    {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </label>
                <Link to="/admin/vendeurs" className="small">Gérer les vendeurs</Link>
                        </>
            )}
          </section>
          <section className="panel preview">
            <h2>Aperçu</h2>
            <div className="preview-card" aria-hidden="true"><ProductCard product={preview} /></div>
          </section>
        </div>
      </div>
    </form>
  );
}
