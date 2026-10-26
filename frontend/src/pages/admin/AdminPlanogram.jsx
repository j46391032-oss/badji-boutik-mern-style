import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import ProductImage from '../../components/ProductImage.jsx';
import { fcfa } from '../../utils.js';

const ZONES = { fresh: 'Périmètre frais', grocery: 'Allées centrales', general: 'Marchandises générales' };

// Planogramme : l'ordre exact des produits dans chaque rayon, et leur travée. Le site l'applique pour tous les visiteurs.
export default function AdminPlanogram() {
  const [cats, setCats] = useState([]);
  const [catId, setCatId] = useState('');
  const [plan, setPlan] = useState(null); // { rayon, items }
  const [items, setItems] = useState([]);
  const [bays, setBays] = useState('');
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => {
      const list = r.data.filter((c) => c.zone);
      setCats(list);
      if (list[0]) setCatId(list[0]._id);
    }).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, []);

  const apply = (data) => {
    setPlan(data);
    setItems(data.items);
    setBays(data.rayon.bays.join(', '));
    setDirty(false);
  };
  useEffect(() => {
    if (!catId) return;
    setPlan(null);
    api.get(`/planogram/${catId}`).then((r) => apply(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, [catId]);

  const bayList = bays.split(',').map((b) => b.trim()).filter(Boolean);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    setDirty(true);
  };
  const setBay = (i, bay) => {
    setItems(items.map((p, k) => (k === i ? { ...p, bay } : p)));
    setDirty(true);
  };
  const run = async (fn, ok) => {
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      apply(await fn());
      setMsg({ type: 'ok', text: ok });
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(async () => (await api.put(`/planogram/${catId}`, { bays: bayList, items: items.map((p) => ({ id: p._id, bay: bayList.includes(p.bay) ? p.bay : '' })) })).data, 'Planogramme enregistré : le rayon est rangé dans cet ordre sur tout le site.');
  const auto = () => run(async () => {
    if (dirty) await api.put(`/planogram/${catId}`, { bays: bayList, items: items.map((p) => ({ id: p._id, bay: bayList.includes(p.bay) ? p.bay : '' })) });
    return (await api.post(`/planogram/${catId}/auto`)).data;
  }, 'Rayon rangé automatiquement : par travée, puis meilleures ventes.');

  return (
    <>
      <div className="page-head"><div><h1>🗂️ Planogramme</h1><p className="muted">Comme au siège d'un supermarché : vous décidez, rayon par rayon, de l'ordre exact des produits et de leur travée. Le site affiche ensuite chaque rayon dans cet ordre, pour tous les visiteurs.</p></div></div>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}
      <div className="filter-bar">
        <select value={catId} onChange={(e) => { if (!dirty || window.confirm('Abandonner les changements non enregistrés ?')) setCatId(e.target.value); }} aria-label="Rayon">
          {Object.entries(ZONES).map(([z, label]) => (
            <optgroup key={z} label={label}>
              {cats.filter((c) => c.zone === z).sort((a, b) => a.aisle - b.aisle).map((c) => <option key={c._id} value={c._id}>{{ fresh: 'F', grocery: 'E', general: 'G' }[z]}{c.aisle} · {c.icon} {c.name}</option>)}
            </optgroup>
          ))}
        </select>
        {plan && <Link className="btn btn-small" to={`/rayon/${plan.rayon.slug}`} target="_blank">Voir le rayon ↗</Link>}
      </div>

      {plan && (
        <>
          <section className="panel form">
            <label>Travées du rayon (séparées par des virgules, dans l'ordre d'affichage)
              <input value={bays} onChange={(e) => { setBays(e.target.value); setDirty(true); }} placeholder="Ex. : Riz & céréales, Conserves…" />
            </label>
            <p className="muted small">Une travée est une section d'étagère. Les rayons de la zone « marchandises générales » n'en ont généralement pas.</p>
          </section>
          <div className="panel flush table-wrap">
            <table className="plano-table">
              <thead><tr><th>Place</th><th>Produit</th><th>Prix</th><th>Stock</th><th>Travée</th><th>Ordre</th></tr></thead>
              <tbody>
                {items.map((p, i) => (
                  <tr key={p._id} className={p.published === false ? 'row-muted' : ''}>
                    <td><strong>{i + 1}</strong></td>
                    <td><span className="plano-prod"><ProductImage product={p} className="plano-img" /><span>{p.name}{p.published === false && <span className="mini-tag mini-orange">Masqué</span>}</span></span></td>
                    <td>{fcfa(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <select value={bayList.includes(p.bay) ? p.bay : ''} onChange={(e) => setBay(i, e.target.value)} aria-label="Travée" disabled={bayList.length === 0}>
                        <option value="">—</option>
                        {bayList.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
                      <button className="btn btn-small" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descendre">↓</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={save} disabled={busy || !dirty}>Enregistrer le planogramme</button>
            <button className="btn" onClick={auto} disabled={busy}>Ranger automatiquement (par travée puis ventes)</button>
          </div>
        </>
      )}
    </>
  );
}
