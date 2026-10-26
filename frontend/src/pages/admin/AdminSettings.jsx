import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import { useSettings } from '../../context/SettingsContext.jsx';

export default function AdminSettings() {
  const { reload } = useSettings();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/settings').then((r) => setForm(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, []);

  if (!form) return msg.text ? <p className={`alert alert-${msg.type}`}>{msg.text}</p> : <p className="empty">Chargement…</p>;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const n = (v) => Number(v) || 0;
    try {
      await api.put('/settings', { ...form, shippingFee: n(form.shippingFee), freeShippingThreshold: n(form.freeShippingThreshold), returnDays: n(form.returnDays), commissionRate: n(form.commissionRate), lowStockThreshold: n(form.lowStockThreshold) });
      reload();
      setMsg({ type: 'ok', text: 'Paramètres enregistrés.' });
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    }
  };

  return (
    <>
      <div className="page-head"><div><h1>Paramètres</h1><p className="muted">Réglages généraux de la boutique.</p></div></div>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}
      <form className="form" onSubmit={save}>
        <section className="panel form">
          <h2>Boutique</h2>
          <label>Nom de la boutique<input name="shopName" value={form.shopName} onChange={change} required /></label>
          <label>Bandeau d'annonce (en haut du site, vide = masqué)<input name="announcement" value={form.announcement} onChange={change} /></label>
          <div className="two-cols">
            <label>Téléphone du support<input name="supportPhone" value={form.supportPhone} onChange={change} /></label>
            <label>Email du support<input type="email" name="supportEmail" value={form.supportEmail} onChange={change} /></label>
          </div>
        </section>
        <section className="panel form">
          <h2>Livraison et retours</h2>
          <div className="two-cols">
            <label>Frais de livraison (FCFA, 0 = offerte)<input type="number" min="0" name="shippingFee" value={form.shippingFee} onChange={change} /></label>
            <label>Livraison gratuite dès (FCFA, 0 = pas de seuil)<input type="number" min="0" name="freeShippingThreshold" value={form.freeShippingThreshold} onChange={change} /></label>
          </div>
          <label>Délai de retour affiché (jours)<input type="number" min="0" name="returnDays" value={form.returnDays} onChange={change} /></label>
        </section>
        <section className="panel form">
          <h2>Stock</h2>
          <label>Commission de la plateforme sur les ventes des vendeurs (%)<input type="number" min="0" max="50" name="commissionRate" value={form.commissionRate ?? 10} onChange={change} /></label>
          <label className="check"><input type="checkbox" name="autoApproveShops" checked={Boolean(form.autoApproveShops)} onChange={change} /> Valider automatiquement les nouvelles boutiques (sinon : validation manuelle)</label>
          <label>Seuil de stock bas (alertes du tableau de bord)<input type="number" min="0" name="lowStockThreshold" value={form.lowStockThreshold} onChange={change} /></label>
        </section>
        <div><button className="btn btn-primary">Enregistrer les paramètres</button></div>
      </form>
    </>
  );
}
