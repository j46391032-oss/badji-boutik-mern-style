// Options choisies par le client (couleur, taille…) : vérifiées côté serveur puis converties en libellé
// ex. { Couleur: 'Noir', Taille: 'M' } -> « Couleur : Noir / Taille : M »
function buildVariant(product, selection) {
  const options = product.options || [];
  const sel = selection && typeof selection === 'object' ? selection : {};
  if (options.length === 0) return '';
  const parts = [];
  for (const opt of options) {
    const value = sel[opt.name];
    if (!value) throw new Error(`Veuillez choisir : ${opt.name} (« ${product.name} »)`);
    if (!opt.values.includes(String(value))) throw new Error(`Valeur invalide pour ${opt.name} (« ${product.name} »)`);
    parts.push(`${opt.name} : ${value}`);
  }
  return parts.join(' / ');
}

module.exports = { buildVariant };
