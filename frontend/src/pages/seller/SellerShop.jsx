import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import ImageUploader from '../../components/admin/ImageUploader.jsx';

// Profil public de la boutique (nom, logo, description, ville, téléphone)
export default function SellerShop() {
  const [form, setForm] = useState(null);
  const [shop, setShop] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/seller/shop').then(({ data }) => {
      setShop(data);
      setForm({ name: data.name, description: data.description || '', city: data.city || '', phone: data.phone || '', logo: data.logo || '', markets: (data.markets || []).join(', ') });
    }).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const { data } = await api.put('/seller/shop', { ...form, markets: form.markets.split(',').map((m) => m.trim()).filter(Boolean) });
      setShop(data);
      setMsg({ type: 'ok', text: 'Boutique mise à jour.' });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return msg.text ? <p className="alert alert-error">{msg.text}</p> : <p className="muted">Chargement…</p>;
  const label = { pending: 'En attente de validation', approved: 'Validée', suspended: 'Suspendue' }[shop.status];
  return (
    <>
      <div className="page-head"><div><h1>🏪 Ma boutique</h1><p className="muted">Statut : <strong>{label}</strong>{shop.verified && ' · ✔ Vendeur vérifié'}</p></div>
        {shop.status === 'approved' && <Link className="btn" to={`/vendeurs/${shop._id}`}>Voir ma boutique en ligne ↗</Link>}</div>
      {shop.market && <p className="alert alert-info">{shop.market.icon} Votre boutique est dans le <strong>{shop.market.name}</strong> : on y vend {shop.market.categories.map((c) => c.name).join(', ')}. Pour changer de marché, contactez l'administrateur (ou videz d'abord vos produits).</p>}
      {msg.text && <p className={`alert ${msg.type === 'ok' ? 'alert-ok' : 'alert-error'}`}>{msg.text}</p>}
      <form className="panel form" onSubmit={save}>
        <label>Nom de la boutique<input name="name" value={form.name} onChange={change} required minLength="3" /></label>
        <ImageUploader label="Logo" value={form.logo} name={form.name} onChange={(url) => setForm({ ...form, logo: url || '' })} />
        <label>Description<textarea name="description" rows="4" maxLength="1000" value={form.description} onChange={change} placeholder="Présentez votre boutique et vos produits…" /></label>
        <label>Ville<input name="city" value={form.city} onChange={change} /></label>
        <label>Téléphone (affiché aux clients)<input name="phone" value={form.phone} onChange={change} /></label>
        <label>Pays ou villes livrés (séparés par des virgules)<input name="markets" value={form.markets} onChange={change} placeholder="Sénégal, Mali…" /></label>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </>
  );
}
