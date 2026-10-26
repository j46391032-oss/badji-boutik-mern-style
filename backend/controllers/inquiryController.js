const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');
const { isStaff, can } = require('../utils/permissions');
const asyncHandler = require('../utils/asyncHandler');

// L'administrateur répond à tout ; un vendeur seulement aux demandes concernant ses produits
const handles = (user, inquiry) => can(user, 'devis') || Boolean(user.shop && inquiry.supplier && String(inquiry.supplier) === String(user.shop));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/inquiries — demande de devis ou question au vendeur
exports.createInquiry = asyncHandler(async (req, res) => {
  if (isStaff(req.user)) {
    res.status(403);
    throw new Error("L'administrateur ne peut pas envoyer de demande");
  }
  const { type, product, subject, message, quantity, budget } = req.body;
  if (!message || !String(message).trim()) {
    res.status(400);
    throw new Error('Le message est obligatoire');
  }
  let productName = String(req.body.productName || '').trim();
  let productId = null;
  let supplierId = null;
  if (product) {
    const p = await Product.findById(product);
    if (!p) {
      res.status(404);
      throw new Error('Produit introuvable');
    }
    productId = p._id;
    productName = p.name;
    supplierId = p.supplier || null; // c'est le vendeur du produit qui répond
  }
  const inquiry = await Inquiry.create({
    user: req.user._id,
    type: ['question', 'echantillon'].includes(type) ? type : 'devis',
    product: productId,
    supplier: supplierId,
    productName,
    subject: String(subject || productName || 'Demande de devis').trim().slice(0, 140),
    quantity: Number(quantity) > 0 ? Number(quantity) : 0,
    budget: Number(budget) > 0 ? Number(budget) : 0,
    messages: [{ from: 'client', text: String(message).trim() }],
    unreadByAdmin: true,
    unreadByClient: false,
  });
  res.status(201).json(inquiry);
});

// GET /api/inquiries/mine
exports.getMyInquiries = asyncHandler(async (req, res) => {
  res.json(await Inquiry.find({ user: req.user._id }).sort('-updatedAt'));
});

// GET /api/inquiries (admin) — ?status=&q=
exports.getInquiries = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.shop) filter.supplier = req.shop._id; // espace vendeur : seulement les demandes de sa boutique
  if (req.query.status) filter.status = req.query.status;
  const term = String(req.query.q || '').trim();
  if (term) {
    const rx = { $regex: escapeRegex(term), $options: 'i' };
    filter.$or = [{ subject: rx }, { productName: rx }];
  }
  res.json(await Inquiry.find(filter).sort('-updatedAt').populate('user', 'name email phone'));
});

const load = async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id).populate('user', 'name email phone');
  if (!inquiry) {
    res.status(404);
    throw new Error('Demande introuvable');
  }
  if (!handles(req.user, inquiry) && String(inquiry.user._id) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Vous n'avez pas accès à cette demande");
  }
  return inquiry;
};

// GET /api/inquiries/:id — marque la conversation comme lue pour celui qui la consulte
exports.getInquiry = asyncHandler(async (req, res) => {
  const inquiry = await load(req, res);
  if (handles(req.user, inquiry) && inquiry.unreadByAdmin) {
    inquiry.unreadByAdmin = false;
    await inquiry.save();
  } else if (!handles(req.user, inquiry) && inquiry.unreadByClient) {
    inquiry.unreadByClient = false;
    await inquiry.save();
  }
  res.json(inquiry);
});

// POST /api/inquiries/:id/messages
exports.addMessage = asyncHandler(async (req, res) => {
  const inquiry = await load(req, res);
  const text = String(req.body.text || '').trim();
  if (!text) {
    res.status(400);
    throw new Error('Le message est vide');
  }
  if (inquiry.status === 'Clos' && !handles(req.user, inquiry)) {
    res.status(400);
    throw new Error('Cette demande est clôturée');
  }
  const admin = handles(req.user, inquiry);
  inquiry.messages.push({ from: admin ? 'admin' : 'client', text });
  inquiry.status = admin ? 'Répondu' : 'Ouvert';
  inquiry.unreadByAdmin = !admin;
  inquiry.unreadByClient = admin;
  await inquiry.save();
  res.status(201).json(inquiry);
});

// PUT /api/inquiries/:id (admin) — changer le statut
exports.updateInquiry = asyncHandler(async (req, res) => {
  const inquiry = await load(req, res);
  if (!handles(req.user, inquiry)) {
    res.status(403);
    throw new Error("Vous n'avez pas accès à cette demande");
  }
  if (!Inquiry.STATUSES.includes(req.body.status)) {
    res.status(400);
    throw new Error('Statut invalide');
  }
  inquiry.status = req.body.status;
  await inquiry.save();
  res.json(inquiry);
});
