// Garantit qu'il existe un administrateur du projet (superadmin). Au premier démarrage après la mise à jour :
// le compte indiqué par OWNER_EMAIL, sinon le plus ancien administrateur, devient « administrateur du projet ».
const User = require('../models/User');

module.exports = async function ensureOwner(log = () => {}) {
  if (await User.exists({ role: 'superadmin' })) return null;
  const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
  let owner = email ? await User.findOne({ email, role: 'admin' }) : null;
  if (!owner) owner = await User.findOne({ role: 'admin' }).sort('createdAt');
  if (!owner) return null;
  owner.role = 'superadmin';
  await owner.save();
  log(`Administrateur du projet : ${owner.email}`);
  return owner;
};
