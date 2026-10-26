import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SupplierCard from '../components/SupplierCard.jsx';
import Modal from '../components/Modal.jsx';
import InquiryForm from '../components/InquiryForm.jsx';
import { num } from '../utils.js';
import { useI18n } from '../i18n/I18nContext.jsx';

// Boutique d'un vendeur : fiche, statistiques et tous ses produits
export default function SupplierStore() {
  const { t } = useI18n();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') || 'best';
  const category = params.get('category') || '';
  const page = Number(params.get('page')) || 1;
  const [supplier, setSupplier] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contact, setContact] = useState(false);

  useEffect(() => {
    setSupplier(null);
    api.get(`/suppliers/${id}/profile`).then((r) => setSupplier(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/products', { params: { supplier: id, sort, category: category || undefined, page, limit: 12 } })
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id, sort, category, page]);

  const update = (next) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p);
  };

  if (error && !supplier) return <p className="alert alert-error">{error}</p>;
  if (!supplier) return <p className="empty">{t('Chargement…')}</p>;

  return (
    <>
      <nav className="breadcrumb"><Link to="/">{t('Accueil')}</Link> › {supplier.market ? <><Link to="/marches">{t('Les marchés')}</Link> › <Link to={`/marches/${supplier.market.slug}`}>{supplier.market.name}</Link></> : <Link to="/vendeurs">{t('Vendeurs')}</Link>} › <span>{supplier.name}</span></nav>
      <SupplierCard supplier={supplier} />
      <div className="card store-bar">
        <span>{t('{n} produits · {m} vendus', { n: num(supplier.products), m: num(supplier.sold) })}</span>
        <button className="btn btn-small" onClick={() => setContact(true)}>{t('💬 Contacter ce vendeur')}</button>
      </div>

      <div className="results-head card">
        <div className="chip-line">
          <button className={`mini-tag ${!category ? 'mini-on' : ''}`} onClick={() => update({ category: '' })}>{t('Tous')}</button>
          {supplier.categories.map((c) => (
            <button key={c._id} className={`mini-tag ${category === c._id ? 'mini-on' : ''}`} onClick={() => update({ category: c._id })}>{c.icon} {t(c.name)}</button>
          ))}
        </div>
        <label className="inline">{t('Trier par')}<select value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="best">{t('Meilleures ventes')}</option>
            <option value="new">{t('Nouveautés')}</option>
            <option value="rating">{t('Mieux notés')}</option>
            <option value="price_asc">{t('Prix croissant')}</option>
            <option value="price_desc">{t('Prix décroissant')}</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" />)}</div>
      ) : data.items.length === 0 ? (
        <p className="empty">{t('Aucun produit dans cette sélection.')}</p>
      ) : (
        <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
      )}
      <Pagination page={data.page || 1} pages={data.pages || 1} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

      {contact && (
        <Modal title={t('Contacter {name}', { name: supplier.name })} onClose={() => setContact(false)}>
          <InquiryForm type="devis" supplierName={supplier.name} onSent={() => {}} />
        </Modal>
      )}
    </>
  );
}
