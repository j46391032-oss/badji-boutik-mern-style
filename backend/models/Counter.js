const mongoose = require('mongoose');

// Compteur utilisé pour générer les numéros de commande (#1001, #1002, ...)
module.exports = mongoose.model(
  'Counter',
  new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } })
);
