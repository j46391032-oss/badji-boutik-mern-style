import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api.js';
import Modal from '../../components/Modal.jsx';
import { formatDate } from '../../utils.js';

const EMPTY = { name: '', email: '', phone: '', password: '', permissions: [] };

// Sous-espace réservé à l'administrateur du projet : créer des sous-administrateurs et choisir leurs droits
export default function AdminTeam() {
  const [data, setData] = useState({ members: [], modules: {} });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | membre
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');

  const load = () => api.get('/team').then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
  }, []);

  const openNew = () => { setForm(EMPTY); setFormError(''); setEditing('new'); };
  const openEdit = (m) => { setForm({ name: m.name, email: m.email, phone: m.phone || '', password: '', permissions: m.permissions || [] }); setFormError(''); setEditing(m); };
  const toggle = (mod) => setForm((f) => ({ ...f, permissions: f.permissions.includes(mod) ? f.permissions.filter((x) => x !== mod) : [...f.permissions, mod] }));
  const all = Object.keys(data.modules);

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editing === 'new') await api.post('/team', form);
      else await api.put(`/team/${editing._id}`, { name: form.name, phone: form.phone, permissions: form.permissions, ...(form.password ? { password: form.password } : {}) });
      setMsg(editing === 'new' ? 'Sous-administrateur créé.' : 'Modifications enregistrées.');
      setEditing(null);
      load();
    } catch (err) {
      setFormError(errMsg(err));
    }
  };

  const suspend = async (m) => {
    if (!m.blocked && !window.confirm(`Suspendre ${m.name} ? Il ne pourra plus se connecter.`)) return;
    await api.put(`/team/${m._id}`, { blocked: !m.blocked }).then(load).catch((e) => setError(errMsg(e)));
  };
  const remove = async (m) => {
    if (!window.confirm(`Retirer ${m.name} de l'équipe ? Son compte deviendra un simple compte client.`)) return;
    await api.delete(`/team/${m._id}`).then(() => { setMsg('Membre retiré.'); load(); }).catch((e) => setError(errMsg(e)));
  };

  return (
    <>
      <div className="page-head">
        <div><h1>🛡️ Équipe et droits</h1><p className="muted">Réservé à l'administrateur du projet : vous seul voyez cette page.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouveau sous-administrateur</button>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-ok">{msg}</p>}

      <div className="panel flush table-wrap">
        <table>
          <thead><tr><th>Membre</th><th>Rôle</th><th>Droits accordés</th><th>Créé le</th><th></th></tr></thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m._id} className={m.blocked ? 'row-muted' : ''}>
                <td><strong>{m.name}</strong><br /><span className="muted small">{m.email}</span></td>
                <td>
                  {m.role === 'superadmin' ? <span className="role-pill owner">Administrateur du projet</span> : <span className="role-pill">Sous-administrateur</span>}
                  {m.blocked && <span className="mini-tag mini-orange">Suspendu</span>}
                </td>
                <td>
                  {m.role === 'superadmin' ? <span className="muted small">Tous les droits</span> : m.permissions.length === 0 ? <span className="muted small">Aucun</span> : (
                    <div className="chip-line">{m.permissions.map((p) => <span key={p} className="mini-tag mini-blue">{data.modules[p]?.split(' : ')[0].split(' et ')[0] || p}</span>)}</div>
                  )}
                </td>
                <td>{formatDate(m.createdAt)}</td>
                <td className="row-actions">
                  {m.role !== 'superadmin' && (
                    <>
                      <button className="btn btn-small" onClick={() => openEdit(m)}>Droits</button>
                      <button className="btn btn-small btn-ghost" onClick={() => suspend(m)}>{m.blocked ? 'Réactiver' : 'Suspendre'}</button>
                      <button className="btn btn-small btn-danger" onClick={() => remove(m)}>Retirer</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Un sous-administrateur ne voit dans le menu que les rubriques que vous lui accordez, et ne peut jamais accéder à cette page ni au journal d'activité.</p>

      {editing && (
        <Modal title={editing === 'new' ? 'Nouveau sous-administrateur' : `Droits de ${editing.name}`} onClose={() => setEditing(null)}>
          <form className="form" onSubmit={save}>
            <label>Nom<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={editing !== 'new'} /></label>
            <label>Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>{editing === 'new' ? 'Mot de passe (6 caractères minimum)' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}
              <input type="password" minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={editing === 'new'} autoComplete="new-password" />
            </label>
            <fieldset className="perm-list">
              <legend>Rubriques accessibles</legend>
              {all.map((mod) => (
                <label key={mod} className="check"><input type="checkbox" checked={form.permissions.includes(mod)} onChange={() => toggle(mod)} /> {data.modules[mod]}</label>
              ))}
              <div className="row">
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setForm({ ...form, permissions: all })}>Tout cocher</button>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setForm({ ...form, permissions: [] })}>Tout décocher</button>
              </div>
            </fieldset>
            {formError && <p className="alert alert-error">{formError}</p>}
            <button className="btn btn-primary">{editing === 'new' ? 'Créer le compte' : 'Enregistrer'}</button>
          </form>
        </Modal>
      )}
    </>
  );
}
