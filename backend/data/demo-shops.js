// Boutiques de démonstration réparties dans les cinq marchés (créées par `npm run seed`).
// Chaque boutique appartient à un compte vendeur : boutiqueN@boutik.sn / Vendeur123!
const P = (name, price, stock, category, emoji, description, extra = {}) => ({ name, price, stock, category, emoji, description, ...extra });

module.exports = [
  { name: 'Maison Teranga Plus', market: 'sandaga', city: 'Dakar', verified: true, description: 'Tout pour la maison : cuisine, salon, décoration d\'intérieur.', products: [
    P('Set de cuisine antiadhésif 5 pièces', 28000, 14, 'Maison', '🍳', 'Poêles et casseroles antiadhésives, compatibles gaz.'),
    P('Tapis de salon 160 × 230', 35000, 9, 'Maison', '🛋️', 'Tapis épais et doux, motifs géométriques.'),
    P('Rideaux occultants (la paire)', 18000, 22, 'Maison', '🪟', 'Occultants, faciles à entretenir.', { tiers: [{ minQty: 4, price: 16000 }] }),
  ] },
  { name: 'Petits Futés Kids', market: 'sandaga', city: 'Dakar', description: 'Jouets, puériculture et fournitures pour les enfants.', products: [
    P('Trotteur bébé 2 en 1', 22000, 10, 'Bébé & Enfants', '👶', 'Trotteur évolutif avec plateau de jeux.'),
    P('Peluche géante 80 cm', 9500, 25, 'Bébé & Enfants', '🧸', 'Peluche douce, lavable en machine.'),
    P('Kit de dessin enfant 120 pièces', 6500, 40, 'Bébé & Enfants', '🖍️', 'Crayons, feutres, peintures et valisette.'),
  ] },
  { name: 'Tissus & Couture Aïda', market: 'hlm', city: 'Dakar', verified: true, description: 'Bazin, wax et tenues sur mesure par une couturière de HLM.', products: [
    P('Coupon bazin riche 5 mètres', 24000, 18, 'Vêtements', '🧵', 'Bazin riche de qualité, plusieurs coloris.', { tiers: [{ minQty: 5, price: 22000 }] }),
    P('Robe de soirée brodée', 38000, 7, 'Vêtements', '👗', 'Robe longue brodée main, taille ajustable.'),
    P('Chemise homme en wax', 13500, 30, 'Vêtements', '👔', 'Chemise manches longues, coupe droite.'),
  ] },
  { name: 'Pointure d\'Or', market: 'hlm', city: 'Thiès', description: 'Chaussures en cuir et de ville pour toute la famille.', products: [
    P('Sandales en cuir pour homme', 14500, 24, 'Chaussures', '🩴', 'Cuir véritable, semelle souple.'),
    P('Escarpins femme', 21000, 12, 'Chaussures', '👠', 'Talon de 7 cm, finition satinée.'),
    P('Baskets enfant', 12000, 35, 'Chaussures', '👟', 'Légères et résistantes, fermeture scratch.'),
  ] },
  { name: 'Le Panier de Kermel', market: 'kermel', city: 'Dakar', verified: true, description: 'Fruits et produits du terroir, directement des producteurs.', products: [
    P('Mangues de Casamance (cageot 5 kg)', 7500, 40, 'Alimentation & Boissons', '🥭', 'Mangues mûres à point, cueillies à la main.'),
    P('Huile de palme rouge 1 L', 3000, 60, 'Alimentation & Boissons', '🌴', 'Huile artisanale non raffinée.', { tiers: [{ minQty: 12, price: 2600 }] }),
    P('Épices pour thiéboudienne (set de 6)', 4500, 50, 'Alimentation & Boissons', '🌶️', 'Le mélange traditionnel, prêt à l\'emploi.'),
  ] },
  { name: 'Beauté Naturelle Mame', market: 'kermel', city: 'Thiès', description: 'Soins naturels à base de karité, baobab et argile.', products: [
    P('Huile de ricin noire 100 ml', 4000, 45, 'Beauté & Soins', '💧', 'Pour la repousse des cheveux et des cils.'),
    P('Gommage au sucre et karité', 5500, 30, 'Beauté & Soins', '🧴', 'Gommage doux pour le corps.'),
    P('Masque à l\'argile verte', 3500, 38, 'Beauté & Soins', '🌿', 'Purifie et matifie la peau.'),
  ] },
  { name: 'Colobane Solaire & Cie', market: 'colobane', city: 'Dakar', verified: true, description: 'Équipements solaires et dépannage pour maisons et boutiques.', products: [
    P('Lampadaire solaire 60 W', 32000, 11, 'Énergie solaire', '🔆', 'Détecteur de mouvement, télécommande.'),
    P('Kit de 3 lampes solaires USB', 14000, 30, 'Énergie solaire', '🔦', 'Trois lampes rechargeables avec panneau.'),
    P('Chargeur solaire pliable 20 W', 26000, 15, 'Énergie solaire', '☀️', 'Charge deux téléphones en plein soleil.'),
  ] },
  { name: 'Mobile Express Colobane', market: 'colobane', city: 'Dakar', description: 'Smartphones reconditionnés garantis et accessoires.', products: [
    P('Smartphone reconditionné 64 Go', 52000, 9, 'Téléphones & Tablettes', '📱', 'Garanti 6 mois, batterie neuve.'),
    P('Coque antichoc + verre trempé', 3500, 80, 'Téléphones & Tablettes', '🛡️', 'Lot protection pour la plupart des modèles.', { tiers: [{ minQty: 10, price: 3000 }] }),
    P('Écouteurs filaires (lot de 5)', 5000, 60, 'Téléphones & Tablettes', '🎧', 'Jack 3,5 mm, micro intégré.'),
  ] },
  { name: 'Artisans de Soumbé', market: 'soumbedioune', city: 'Dakar', verified: true, description: 'Sculptures, bijoux et tissus faits main par les artisans de Soumbédioune.', products: [
    P('Sculpture d\'éléphant en ébène', 26000, 8, 'Artisanat & Déco', '🐘', 'Sculpture sculptée à la main, 25 cm.'),
    P('Collier en perles de verre', 9000, 26, 'Artisanat & Déco', '📿', 'Perles de verre recyclé, fermoir argenté.'),
    P('Nappe en batik 150 × 220', 12500, 14, 'Artisanat & Déco', '🧶', 'Batik teint à la main.'),
  ] },
];
