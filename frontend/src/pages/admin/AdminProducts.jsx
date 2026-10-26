import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../../api.js';
import ProductImage from '../../components/ProductImage.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useDebounce } from '../../hooks.js';
import { fcfa, num } from '../../utils.js';
import { useScope } from '../../context/ScopeContext.jsx';

export default function AdminProducts() {
  const navigate = useNavigate();
  const S = useScope();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', stockFilter: '', published: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const search = useDebounce(filters.search);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const load = () =>
    api
      .get(S.productsList, { params: { all: 1, page, limit: 10, sort: 'new', search, category: filters.category, stockFilter: filters.stockFilter, published: filters.published } })
      .then((r) => setData(r.data))
      .catch((e) => setMsg({ type: 'error', text: errMsg(e) }))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filters.category, filters.stockFilter, filters.published]);

  const set = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const toggle = async (p) => {
    try {
      await api.put(`${S.productApi}/${p._id}`, { published: !p.published });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    }
  };

  const duplicate = async (p) => {
    try {
      const { data: copy } = await api.post(`/products/${p._id}/duplicate`);
      navigate(`${S.base}/produits/${copy._id}`);
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer « ${p.name} » ? Cette action est définitive.`)) return;
    try {
      await api.delete(`${S.productApi}/${p._id}`);
      setMsg({ type: 'ok', text: 'Produit supprimé.' });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Produits</h1><p className="muted">{num(data.total)} produit{data.total > 1 ? 's' : ''}</p></div>
        <Link to={`${S.base}/produits/nouveau`} className="btn btn-primary">+ Ajouter un produit</Link>
      </div>

      <div className="filter-bar">
        <input placeholder="Rechercher (nom, marque…)" value={filters.search} onChange={(e) => set('search', e.target.value)} aria-label="Rechercher" />
        <select value={filters.category} onChange={(e) => set('category', e.target.value)} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filters.stockFilter} onChange={(e) => set('stockFilter', e.target.value)} aria-label="Stock">
          <option value="">Tout le stock</option>
          <option value="low">Stock bas</option>
          <option value="out">Épuisés</option>
        </select>
        <select value={filters.published} onChange={(e) => set('published', e.target.value)} aria-label="Visibilité">
          <option value="">Visibles et masqués</option>
          <option value="0">Masqués</option>
        </select>
      </div>
      {msg.text && <p className={`alert alert-${msg.type}`}>{msg.text}</p>}

      <div className="panel flush table-wrap">
        <table>
          <thead>
            <tr><th></th><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Ventes</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="muted">Chargement…</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan="8" className="muted">Aucun produit trouvé.</td></tr>
            ) : data.items.map((p) => (
              <tr key={p._id}>
                <td><ProductImage product={p} className="thumb" /></td>
                <td>
                  <Link to={`${S.base}/produits/${p._id}`}><strong>{p.name}</strong></Link>
                  <div className="muted small">{p.brand}{p.supplier?.name && ` · ${p.supplier.name}`}</div>
                  <div className="chip-line">
                    {p.discountPercent > 0 && <span className="mini-tag mini-red">−{p.discountPercent} %</span>}
                    {p.flashSaleEnds && new Date(p.flashSaleEnds) > new Date() && <span className="mini-tag mini-orange">⚡ Flash</span>}
                    {p.featured && <span className="mini-tag mini-blue">Sélection</span>}
                    {p.priceTiers?.length > 0 && <span className="mini-tag">Prix dégressifs</span>}
                  </div>
                </td>
                <td>{p.category?.name}</td>
                <td>{fcfa(p.price)}{p.oldPrice > p.price && <div className="muted small"><s>{fcfa(p.oldPrice)}</s></div>}</td>
                <td><span className={`tag ${p.stock === 0 ? 'tag-red' : p.stock <= 5 ? 'tag-amber' : 'tag-green'}`}>{p.stock}</span></td>
                <td>{num(p.sold)}</td>
                <td>
                  <button className={`switch ${p.published ? 'on' : ''}`} role="switch" aria-checked={p.published} onClick={() => toggle(p)} title={p.published ? 'Visible dans la boutique' : 'Masqué'}>
                    <span />
                  </button>
                </td>
                <td className="actions">
                  <Link className="btn btn-small" to={`${S.base}/produits/${p._id}`}>Modifier</Link>
                  {!S.seller && <button className="btn btn-small" onClick={() => duplicate(p)}>Dupliquer</button>}
                  <button className="btn btn-small btn-danger" onClick={() => remove(p)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />
    </>
  );
}
