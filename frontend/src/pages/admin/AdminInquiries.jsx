import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import { useScope } from '../../context/ScopeContext.jsx';
import InquiryThread from '../../components/InquiryThread.jsx';
import { useDebounce } from '../../hooks.js';
import { fcfa, formatDate, num } from '../../utils.js';

const TONE = { Ouvert: 'tag-amber', Répondu: 'tag-green', Clos: '' };
const STATUSES = ['Ouvert', 'Répondu', 'Clos'];

export default function AdminInquiries() {
  const S = useScope();
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const search = useDebounce(q);

  const loadList = () => api.get(S.inquiriesList, { params: { status, q: search } }).then((r) => setList(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  const open = (id) => api.get(`/inquiries/${id}`).then((r) => { setCurrent(r.data); loadList(); }).catch((e) => setError(errMsg(e)));

  const send = async (text) => {
    try {
      const { data } = await api.post(`/inquiries/${current._id}/messages`, { text });
      setCurrent((c) => ({ ...c, ...data, user: c.user }));
      loadList();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const setState = async (s) => {
    try {
      const { data } = await api.put(`/inquiries/${current._id}`, { status: s });
      setCurrent((c) => ({ ...c, status: data.status }));
      loadList();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <div className="page-head"><div><h1>Devis et messages</h1><p className="muted">Répondez aux demandes de devis et aux questions des clients.</p></div></div>
      <div className="filter-bar">
        <input placeholder="Rechercher un sujet, un produit…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="inbox panel flush">
        <ul className="inbox-list">
          {list.length === 0 && <li className="muted pad">Aucune demande.</li>}
          {list.map((i) => (
            <li key={i._id}>
              <button className={current?._id === i._id ? 'active' : ''} onClick={() => open(i._id)}>
                <strong>{i.subject}{i.unreadByAdmin && <span className="dot-new" aria-label="Non lu" />}</strong>
                <span className="muted small">{i.user?.name} · {{ devis: 'Devis', echantillon: 'Échantillon' }[i.type] || 'Question'}</span>
                <span className="small"><span className={`tag ${TONE[i.status]}`}>{i.status}</span> <span className="muted">{formatDate(i.updatedAt)}</span></span>
              </button>
            </li>
          ))}
        </ul>
        <section className="inbox-main">
          {!current ? <p className="muted pad">Sélectionnez une demande.</p> : (
            <>
              <header>
                <div className="between">
                  <h2>{current.subject}</h2>
                  <select value={current.status} onChange={(e) => setState(e.target.value)} aria-label="Changer le statut">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <p className="muted small">
                  {current.user?.name} · {current.user?.email}{current.user?.phone && ` · ${current.user.phone}`}
                  {current.quantity > 0 && ` · ${num(current.quantity)} unités`}
                  {current.budget > 0 && ` · budget ${fcfa(current.budget)}`}
                  {current.product && <> · <Link to={`${S.base}/produits/${current.product}`}>fiche produit</Link></>}
                </p>
              </header>
              <InquiryThread inquiry={current} viewer="admin" onSend={send} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
