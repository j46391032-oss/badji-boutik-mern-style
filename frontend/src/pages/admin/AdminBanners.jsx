import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Drawer from '../../components/admin/Drawer.jsx';
import ImageUploader from '../../components/admin/ImageUploader.jsx';
import { assetUrl } from '../../api.js';

const EMPTY = { title: '', subtitle: '', cta: 'Découvrir', link: '/produits', image: '', color: '#0a4733', order: 0, active: true };

const bg = (b) => (b.image ? `linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,.1)), url(${assetUrl(b.image)}) center/cover` : `linear-gradient(120deg, ${b.color}, #0f1111 140%)`);

export default function AdminBanners() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => api.get('/banners', { params: { all: 1 } }).then((r) => setList(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  useEffect(() => {
    load();
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, order: Number(form.order) || 0 };
    try {
      if (editId) await api.put(`/banners/${editId}`, body);
      else await api.post('/banners', body);
      setForm(null);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: errMsg(err) });
    }
  };

  const toggle = (b) => api.put(`/banners/${b._id}`, { active: !b.active }).then(load).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  const remove = (b) => window.confirm(`Supprimer la bannière « ${b.title} » ?`) && api.delete(`/banners/${b._id}`).then(load).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));

  return (
    <>
      <div className="page-head">
        <div><h1>Bannières</h1><p className="muted">Carrousel de la page d'accueil, dans l'ordre indiqué.</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm(EMPTY); }}>+ Ajouter une bannière</button>
      </div>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}
      <div className="stack">
        {list.length === 0 && <p className="empty">Aucune bannière : un message par défaut s'affiche sur l'accueil.</p>}
        {list.map((b) => (
          <article key={b._id} className="panel banner-row">
            <div className="banner-preview" style={{ background: bg(b) }}><strong>{b.title}</strong><span>{b.subtitle}</span></div>
            <div className="banner-meta">
              <span className="muted small">Ordre {b.order} · lien {b.link}</span>
              <span className={`tag ${b.active ? 'tag-green' : ''}`}>{b.active ? 'Active' : 'Masquée'}</span>
              <div className="row no-margin">
                <button className="btn btn-small" onClick={() => { setEditId(b._id); setForm({ ...EMPTY, ...b }); }}>Modifier</button>
                <button className="btn btn-small" onClick={() => toggle(b)}>{b.active ? 'Masquer' : 'Activer'}</button>
                <button className="btn btn-small btn-danger" onClick={() => remove(b)}>Supprimer</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {form && (
        <Drawer title={editId ? 'Modifier la bannière' : 'Nouvelle bannière'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <div className="banner-preview" style={{ background: bg(form) }}><strong>{form.title || 'Titre'}</strong><span>{form.subtitle}</span></div>
            <label>Titre<input name="title" value={form.title} onChange={change} required /></label>
            <label>Sous-titre<input name="subtitle" value={form.subtitle} onChange={change} /></label>
            <div className="two-cols">
              <label>Texte du bouton<input name="cta" value={form.cta} onChange={change} /></label>
              <label>Lien<input name="link" value={form.link} onChange={change} placeholder="/produits?flash=1" /></label>
            </div>
            <div className="two-cols">
              <label>Couleur de fond<input type="color" name="color" value={form.color} onChange={change} /></label>
              <label>Ordre<input type="number" name="order" value={form.order} onChange={change} /></label>
            </div>
            <ImageUploader label="Image de fond (facultative)" value={form.image} onChange={(url) => setForm({ ...form, image: url })} name={form.title} />
            <label className="check"><input type="checkbox" name="active" checked={form.active} onChange={change} /> Bannière active</label>
            <button className="btn btn-primary">Enregistrer</button>
          </form>
        </Drawer>
      )}
    </>
  );
}
