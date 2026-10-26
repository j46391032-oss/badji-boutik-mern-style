import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import Pagination from '../../components/Pagination.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import Stars from '../../components/Stars.jsx';
import { formatDate } from '../../utils.js';

export default function AdminReviews() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = () => api.get('/reviews', { params: { rating, page, limit: 10 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rating, page]);

  const remove = async (r) => {
    if (!window.confirm('Supprimer cet avis ?')) return;
    try {
      await api.delete(`/reviews/${r._id}`);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <div className="page-head"><div><h1>Avis clients</h1><p className="muted">{data.total} avis — modérez les contenus inappropriés.</p></div></div>
      <div className="filter-bar">
        <select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} aria-label="Note">
          <option value="">Toutes les notes</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>)}
        </select>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="stack">
        {data.items.length === 0 && <p className="empty">Aucun avis.</p>}
        {data.items.map((r) => (
          <article className="panel review-admin" key={r._id}>
            {r.product && <ProductImage product={r.product} className="thumb" />}
            <div className="grow">
              <div className="review-head">
                <strong>{r.user?.name || 'Client supprimé'}</strong><Stars value={r.rating} /><span className="muted small">{formatDate(r.createdAt)}</span>
              </div>
              <p className="small muted">Sur {r.product ? <Link to={`/produits/${r.product._id}`}>{r.product.name}</Link> : 'un produit supprimé'}</p>
              {r.comment ? <p>{r.comment}</p> : <p className="muted">Sans commentaire.</p>}
            </div>
            <button className="btn btn-small btn-danger" onClick={() => remove(r)}>Supprimer</button>
          </article>
        ))}
      </div>
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />
    </>
  );
}
