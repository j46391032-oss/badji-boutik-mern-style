// Catalogue de démonstration : catégories, vendeurs et produits.
// Utilisé par `npm run seed:catalog` (ajout sans rien effacer) et par `npm run seed`.
// Pour ajouter vos propres produits : complétez simplement la liste PRODUCTS ci-dessous.
//
// Clés abrégées d'un produit :
//   o = ancien prix (promo)   st = stock          so = nombre de ventes   moq = quantité minimum
//   t = prix dégressifs [[qté, prix], ...]        fr = livraison gratuite  ft = produit « sélection »
//   by = travée du rayon (planogramme)
//   fl = vente flash (nombre de jours)            sp = caractéristiques [[libellé, valeur], ...]
//   op = options au choix { Couleur: [...], Taille: [...] }   sm = échantillon disponible   d = description

const CATEGORIES = [
  ['Électronique', '🎧'],
  ['Téléphones & Tablettes', '📱'],
  ['Informatique', '💻'],
  ['Énergie solaire', '☀️'],
  ['Maison', '🏠'],
  ['Vêtements', '👕'],
  ['Chaussures', '👟'],
  ['Accessoires', '👜'],
  ['Beauté & Soins', '💄'],
  ['Alimentation & Boissons', '🥭'],
  ['Sport & Fitness', '⚽'],
  ['Bébé & Enfants', '🧸'],
  ['Bureau & Papeterie', '📎'],
  ['Artisanat & Déco', '🎨'],
];

const TECH = 'Dakar Tech Distribution';
const MODE = 'Teranga Mode';
const SAHEL = 'Sahel Import';
const MOBILE = 'Mobile Hub Dakar';
const SOLAR = 'Solaire Sénégal';
const BAO = 'Baobab Naturel';
const CASA = 'Casamance Saveurs';
const DECO = 'Teranga Déco & Artisanat';
const KIDS = 'Kids Corner Dakar';
const SPORT = 'Sport Zone Sénégal';
const BUREAU = 'Bureau Plus Dakar';
const MAISON = 'Maison Confort';
const BOUTIK = 'Boutik Distribution';

const SUPPLIERS = [
  { name: TECH, verified: true, city: 'Dakar', yearsActive: 6, rating: 4.9, responseHours: 2, onTimeRate: 98, repurchaseRate: 34, markets: ['Sénégal', 'Mali', 'Guinée'] },
  { name: MODE, verified: true, city: 'Thiès', yearsActive: 4, rating: 4.7, responseHours: 4, onTimeRate: 94, repurchaseRate: 27, markets: ['Sénégal', "Côte d'Ivoire"] },
  { name: SAHEL, verified: false, city: 'Saint-Louis', yearsActive: 1, rating: 4.5, responseHours: 8, onTimeRate: 88, repurchaseRate: 15, markets: ['Sénégal'] },
  { name: MOBILE, verified: true, city: 'Dakar', yearsActive: 5, rating: 4.8, responseHours: 1, onTimeRate: 97, repurchaseRate: 41, markets: ['Sénégal', 'Gambie', 'Mauritanie'] },
  { name: SOLAR, verified: true, city: 'Dakar', yearsActive: 8, rating: 4.9, responseHours: 3, onTimeRate: 96, repurchaseRate: 38, markets: ['Sénégal', 'Mali', 'Burkina Faso'] },
  { name: BAO, verified: true, city: 'Thiès', yearsActive: 7, rating: 4.8, responseHours: 5, onTimeRate: 95, repurchaseRate: 45, markets: ['Sénégal', 'France'] },
  { name: CASA, verified: true, city: 'Ziguinchor', yearsActive: 9, rating: 4.9, responseHours: 6, onTimeRate: 93, repurchaseRate: 52, markets: ['Sénégal', 'Gambie', 'Guinée-Bissau'] },
  { name: DECO, verified: true, city: 'Dakar', yearsActive: 12, rating: 4.7, responseHours: 6, onTimeRate: 92, repurchaseRate: 30, markets: ['Sénégal', 'France', 'Belgique'] },
  { name: KIDS, verified: false, city: 'Dakar', yearsActive: 2, rating: 4.6, responseHours: 5, onTimeRate: 90, repurchaseRate: 22, markets: ['Sénégal'] },
  { name: SPORT, verified: true, city: 'Mbour', yearsActive: 3, rating: 4.6, responseHours: 4, onTimeRate: 93, repurchaseRate: 25, markets: ['Sénégal'] },
  { name: BUREAU, verified: true, city: 'Dakar', yearsActive: 10, rating: 4.8, responseHours: 2, onTimeRate: 97, repurchaseRate: 48, markets: ['Sénégal', 'Mali'] },
  { name: BOUTIK, verified: true, city: 'Dakar', yearsActive: 10, rating: 4.9, responseHours: 1, onTimeRate: 99, repurchaseRate: 61, markets: ['Sénégal'] },
  { name: MAISON, verified: true, city: 'Rufisque', yearsActive: 6, rating: 4.7, responseHours: 4, onTimeRate: 95, repurchaseRate: 33, markets: ['Sénégal'] },
];

const P = (category, supplier, name, brand, price, o = {}) => ({ category, supplier, name, brand, price, ...o });
const COL = ['Noir', 'Blanc', 'Bleu'];
const TAILLES = ['S', 'M', 'L', 'XL', 'XXL'];
const POINTURES_H = ['39', '40', '41', '42', '43', '44', '45'];
const POINTURES_F = ['36', '37', '38', '39', '40', '41'];

const PRODUCTS = [
  // ───────── Électronique
  P('Électronique', TECH, 'Écouteurs sans fil', 'SonicWave', 15000, { o: 19000, st: 35, so: 640, t: [[10, 13500], [50, 12000]], op: { Couleur: ['Noir', 'Blanc'] }, sp: [['Bluetooth', '5.3'], ['Autonomie', '24 h avec boîtier']], d: "Écouteurs Bluetooth 5.3 avec boîtier de charge, 24 h d'autonomie." }),
  P('Électronique', TECH, 'Clavier sans fil', 'ClickPro', 14000, { st: 28, so: 180, t: [[10, 12500]], sp: [['Disposition', 'AZERTY'], ['Connexion', '2,4 GHz']], d: 'Clavier compact AZERTY, touches silencieuses.' }),
  P('Électronique', TECH, 'Power bank 20 000 mAh', 'VoltUp', 17500, { o: 22000, st: 45, so: 910, fr: true, fl: 4, t: [[10, 15500], [50, 14000]], sp: [['Capacité', '20 000 mAh'], ['Ports', '2 USB + 1 USB-C']], d: 'Batterie externe avec deux ports USB et un port USB-C.' }),
  P('Électronique', TECH, 'Webcam Full HD', 'ClickPro', 19000, { st: 18, so: 75, sp: [['Résolution', '1080p'], ['Micro', 'Intégré']], d: 'Webcam 1080p avec microphone intégré, idéale pour les cours en ligne.' }),
  P('Électronique', TECH, 'Clé USB 64 Go', 'DataPlus', 5500, { st: 100, so: 1320, moq: 2, t: [[10, 4800], [50, 4200]], sm: true, sp: [['Capacité', '64 Go'], ['Norme', 'USB 3.0']], d: 'Clé USB 3.0 compacte et rapide.' }),
  P('Électronique', TECH, 'Montre connectée', 'Chronos', 38000, { o: 49000, st: 14, so: 210, ft: true, op: { Couleur: ['Noir', 'Argent', 'Rose'] }, sp: [['Écran', 'AMOLED 1,4"'], ['Étanchéité', 'IP68']], d: "Suivi d'activité, notifications et écran AMOLED." }),
  P('Électronique', TECH, 'Lampe de bureau LED', 'LumiPlus', 11000, { st: 26, so: 140, sp: [['Niveaux', '3'], ['Port', 'USB']], d: 'Lampe réglable avec 3 niveaux de luminosité.' }),
  P('Électronique', TECH, 'Câble USB-C 2 m', 'VoltUp', 3000, { st: 120, so: 2100, moq: 5, t: [[20, 2500], [100, 2000]], sm: true, sp: [['Longueur', '2 m'], ['Charge', 'Rapide 60 W']], d: 'Câble renforcé, charge rapide et transfert de données.' }),
  P('Électronique', TECH, 'Smart TV LED 43 pouces', 'VisionHD', 165000, { o: 189000, st: 9, so: 58, ft: true, sp: [['Écran', '43" Full HD'], ['Système', 'Android TV'], ['Garantie', '12 mois']], d: 'Téléviseur connecté Full HD avec Wi-Fi, YouTube et Netflix intégrés.' }),
  P('Électronique', TECH, 'Barre de son Bluetooth', 'SonicWave', 42000, { st: 16, so: 47, sp: [['Puissance', '60 W'], ['Connexion', 'Bluetooth / HDMI ARC']], d: 'Barre de son 2.1 avec caisson, idéale sous un téléviseur.' }),
  P('Électronique', TECH, 'Routeur Wi-Fi 4G LTE', 'NetLink', 38000, { st: 22, so: 133, ft: true, sp: [['Réseau', '4G LTE'], ['Wi-Fi', '300 Mbps'], ['SIM', 'Tous opérateurs']], d: 'Routeur avec emplacement SIM : un Wi-Fi partout, sans ligne fixe.' }),
  P('Électronique', TECH, 'Caméra de surveillance Wi-Fi', 'SecureEye', 24000, { o: 29000, st: 30, so: 264, t: [[5, 21500], [20, 19000]], sp: [['Résolution', '2 MP'], ['Vision nocturne', 'Oui'], ['Stockage', 'Carte microSD']], d: "Caméra intérieure avec vision nocturne et alerte sur téléphone." }),

  // ───────── Téléphones & Tablettes
  P('Téléphones & Tablettes', MOBILE, 'Smartphone Android 128 Go', 'Novatel', 98000, { o: 115000, st: 24, so: 380, ft: true, fl: 3, op: { Couleur: ['Noir', 'Bleu', 'Vert'] }, sp: [['Mémoire', '128 Go / 6 Go RAM'], ['Écran', '6,6" 90 Hz'], ['Batterie', '5 000 mAh']], d: 'Smartphone double SIM, appareil photo 50 MP, grande batterie.' }),
  P('Téléphones & Tablettes', MOBILE, 'Smartphone Android 64 Go', 'Novatel', 62000, { st: 40, so: 520, t: [[5, 58000], [20, 54000]], op: { Couleur: ['Noir', 'Bleu'] }, sp: [['Mémoire', '64 Go / 4 Go RAM'], ['Écran', '6,5"']], d: "Smartphone d'entrée de gamme fiable, double SIM." }),
  P('Téléphones & Tablettes', MOBILE, 'Téléphone à touches double SIM', 'Tecna', 9500, { st: 90, so: 1450, moq: 2, t: [[10, 8500], [50, 7800]], sm: true, op: { Couleur: ['Noir', 'Rouge'] }, sp: [['SIM', '2'], ['Autonomie', '10 jours en veille'], ['Lampe', 'LED intégrée']], d: 'Téléphone robuste, longue autonomie, lampe torche intégrée.' }),
  P('Téléphones & Tablettes', MOBILE, 'Tablette 10 pouces', 'Novatel', 85000, { st: 15, so: 92, sp: [['Écran', '10,1" HD'], ['Mémoire', '64 Go / 4 Go RAM'], ['Connexion', 'Wi-Fi + 4G']], d: 'Tablette familiale pour lire, étudier et regarder des vidéos.' }),
  P('Téléphones & Tablettes', MOBILE, 'Carte mémoire microSD 128 Go', 'DataPlus', 8500, { st: 80, so: 760, moq: 2, t: [[10, 7500]], sp: [['Capacité', '128 Go'], ['Classe', 'U3 / A1']], d: 'Carte microSD rapide pour téléphone, caméra ou tablette.' }),
  P('Téléphones & Tablettes', MOBILE, 'Chargeur sans fil 15 W', 'VoltUp', 9000, { st: 44, so: 112, op: { Couleur: ['Noir', 'Blanc'] }, sp: [['Puissance', '15 W'], ['Norme', 'Qi']], d: 'Station de charge sans fil compatible avec la plupart des smartphones.' }),
  P('Téléphones & Tablettes', MOBILE, 'Verre trempé (lot de 10)', 'ShieldPro', 6000, { st: 200, so: 880, moq: 1, t: [[5, 5200], [20, 4500]], sm: true, sp: [['Dureté', '9H'], ['Lot', '10 pièces']], d: "Protections d'écran en verre trempé, pose facile." }),
  P('Téléphones & Tablettes', MOBILE, 'Support téléphone pour voiture', 'AutoGrip', 4500, { st: 70, so: 410, t: [[10, 3800]], sp: [['Fixation', 'Grille de ventilation'], ['Rotation', '360°']], d: 'Support réglable et stable, compatible avec tous les smartphones.' }),

  // ───────── Informatique
  P('Informatique', TECH, 'Ordinateur portable 15,6" 8 Go / 256 Go', 'Lumina', 245000, { o: 275000, st: 11, so: 64, ft: true, fr: true, sp: [['Processeur', 'Intel Core i3'], ['Mémoire', '8 Go RAM'], ['Stockage', 'SSD 256 Go'], ['Garantie', '12 mois']], d: 'Portable léger pour le travail et les études, Windows préinstallé.' }),
  P('Informatique', TECH, 'Disque dur externe 1 To', 'DataPlus', 36000, { st: 30, so: 240, t: [[5, 33500]], sp: [['Capacité', '1 To'], ['Interface', 'USB 3.0']], d: 'Disque portable pour sauvegarder photos, documents et vidéos.' }),
  P('Informatique', TECH, 'SSD 512 Go', 'DataPlus', 42000, { st: 25, so: 130, sp: [['Capacité', '512 Go'], ['Format', '2,5" SATA']], d: "Remplacez votre disque dur et rendez votre ordinateur beaucoup plus rapide." }),
  P('Informatique', TECH, 'Imprimante multifonction jet d\'encre', 'PrintJet', 78000, { st: 13, so: 52, sp: [['Fonctions', 'Impression, copie, scan'], ['Connexion', 'USB + Wi-Fi']], d: 'Imprimante couleur 3-en-1 pour la maison et le petit bureau.' }),
  P('Informatique', TECH, 'Onduleur 650 VA', 'PowerSafe', 35000, { o: 42000, st: 28, so: 305, fl: 5, t: [[5, 32000]], sp: [['Puissance', '650 VA'], ['Prises', '4'], ['Autonomie', '≈ 15 min']], d: 'Protège votre ordinateur des coupures et des variations de courant.' }),
  P('Informatique', TECH, 'Hub USB-C 7 en 1', 'ClickPro', 16500, { st: 36, so: 98, sp: [['Ports', 'HDMI, USB 3.0 ×3, SD, microSD, USB-C PD']], d: 'Un seul adaptateur pour connecter écran, clé USB et cartes mémoire.' }),
  P('Informatique', TECH, 'Souris gaming RGB', 'ClickPro', 12500, { st: 32, so: 144, sp: [['Résolution', 'Jusqu\'à 7200 DPI'], ['Boutons', '7']], d: 'Souris filaire précise avec éclairage RGB.' }),
  P('Informatique', TECH, 'Sac à dos pour ordinateur 15,6"', 'TrekGo', 15500, { st: 40, so: 275, t: [[5, 14000], [20, 12500]], op: { Couleur: ['Noir', 'Gris'] }, sp: [['Compartiment', 'PC jusqu\'à 15,6"'], ['Port', 'USB de charge']], d: 'Sac résistant à l\'eau avec compartiment rembourré pour ordinateur.' }),

  // ───────── Énergie solaire
  P('Énergie solaire', SOLAR, 'Panneau solaire 100 W', 'SunPower', 48000, { st: 20, so: 190, ft: true, t: [[5, 44000], [20, 40000]], sp: [['Puissance', '100 W'], ['Type', 'Monocristallin'], ['Garantie', '2 ans']], d: 'Panneau monocristallin haut rendement pour kit solaire.' }),
  P('Énergie solaire', SOLAR, 'Kit solaire domestique 300 W', 'SunPower', 295000, { o: 340000, st: 7, so: 41, ft: true, fr: true, sp: [['Panneaux', '3 × 100 W'], ['Batterie', 'Gel 100 Ah'], ['Onduleur', '1000 W'], ['Installation', 'Possible sur devis']], d: 'Kit complet : panneaux, batterie, régulateur, onduleur et câbles.' }),
  P('Énergie solaire', SOLAR, 'Lampe solaire LED extérieure', 'SunPower', 9500, { st: 85, so: 1180, fl: 2, o: 12500, t: [[10, 8200], [50, 7200]], sm: true, sp: [['Éclairage', 'Détecteur de mouvement'], ['Autonomie', '10 h']], d: 'Lampe murale rechargeable au soleil, idéale pour cour et portail.' }),
  P('Énergie solaire', SOLAR, 'Batterie gel 12 V 100 Ah', 'PowerSafe', 115000, { st: 12, so: 66, sp: [['Tension', '12 V'], ['Capacité', '100 Ah'], ['Type', 'Gel sans entretien']], d: 'Batterie à cycle profond pour installations solaires.' }),
  P('Énergie solaire', SOLAR, 'Régulateur de charge MPPT 30 A', 'SunPower', 28500, { st: 25, so: 83, sp: [['Courant', '30 A'], ['Tension', '12 / 24 V auto']], d: 'Optimise la charge de vos batteries et les protège.' }),
  P('Énergie solaire', SOLAR, 'Ampoule LED rechargeable 12 W (lot de 5)', 'LumiPlus', 7500, { st: 150, so: 1650, t: [[10, 6500], [50, 5800]], sp: [['Puissance', '12 W'], ['Autonomie', '4 à 6 h sans courant']], d: 'Continuez à vous éclairer pendant les coupures.' }),
  P('Énergie solaire', SOLAR, 'Lampe torche solaire rechargeable', 'SunPower', 5500, { st: 110, so: 940, sp: [['Recharge', 'Solaire + USB'], ['Fonction', 'Powerbank 2000 mAh']], d: 'Torche puissante qui peut aussi recharger votre téléphone.' }),

  // ───────── Maison
  P('Maison', MAISON, 'Bouilloire électrique', 'HomeEase', 13500, { st: 24, so: 230, sp: [['Capacité', '1,7 L'], ['Sécurité', 'Arrêt automatique']], d: 'Bouilloire 1,7 L avec arrêt automatique.' }),
  P('Maison', MAISON, 'Ventilateur sur pied', 'HomeEase', 28000, { st: 12, so: 410, ft: true, fl: 3, o: 34000, sp: [['Vitesses', '3'], ['Hauteur', 'Réglable']], d: 'Ventilateur 3 vitesses, hauteur réglable.' }),
  P('Maison', MAISON, 'Set de 6 verres', 'Cristalia', 6500, { st: 50, so: 330, t: [[10, 5800]], d: 'Verres en verre trempé, passent au lave-vaisselle.' }),
  P('Maison', MAISON, 'Oreiller ergonomique', 'ConfortPlus', 9000, { st: 27, so: 150, d: 'Oreiller à mémoire de forme, housse lavable.' }),
  P('Maison', MAISON, 'Thermos 1 L', 'ThermoKeep', 8500, { st: 31, so: 205, op: { Couleur: ['Noir', 'Bleu', 'Rouge'] }, d: 'Garde les boissons chaudes 12 h et froides 24 h.' }),
  P('Maison', MAISON, 'Blender 1,5 L', 'HomeEase', 18500, { st: 22, so: 175, sp: [['Puissance', '600 W'], ['Bol', '1,5 L']], d: 'Pour jus, smoothies et sauces, lames en inox.' }),
  P('Maison', MAISON, 'Cuiseur à riz 1,8 L', 'HomeEase', 21000, { st: 18, so: 120, t: [[5, 19000]], sp: [['Capacité', '1,8 L'], ['Fonction', 'Maintien au chaud']], d: 'Un riz parfait sans surveillance.' }),
  P('Maison', MAISON, 'Fer à repasser vapeur', 'HomeEase', 12000, { st: 36, so: 190, sp: [['Puissance', '2200 W'], ['Semelle', 'Céramique']], d: 'Fer à vapeur puissant, semelle antiadhésive.' }),
  P('Maison', MAISON, 'Set de casseroles inox 10 pièces', 'ChefLine', 39000, { o: 48000, st: 14, so: 85, ft: true, sp: [['Pièces', '10'], ['Matière', 'Inox 18/10']], d: 'Batterie de cuisine complète, compatible gaz et induction.' }),
  P('Maison', MAISON, 'Moustiquaire de lit', 'ConfortPlus', 6500, { st: 90, so: 1250, moq: 1, t: [[10, 5500], [50, 4800]], op: { Taille: ['1 place', '2 places'] }, sm: true, d: 'Moustiquaire légère à suspendre, protection efficace toute la nuit.' }),
  P('Maison', MAISON, 'Réfrigérateur table top 120 L', 'CoolHome', 135000, { o: 149000, st: 8, so: 39, ft: true, sp: [['Capacité', '120 L'], ['Classe', 'A+'], ['Garantie', '12 mois']], d: 'Compact et économique, parfait pour une chambre ou un bureau.' }),

  // ───────── Vêtements
  P('Vêtements', MODE, 'Chemise en lin', 'Teranga', 14500, { st: 30, so: 130, op: { Taille: ['S', 'M', 'L', 'XL'], Couleur: ['Blanc', 'Bleu ciel', 'Beige'] }, d: 'Chemise légère et respirante, parfaite pour la chaleur.' }),
  P('Vêtements', MODE, 'Robe wax', 'Teranga', 25000, { st: 16, so: 98, ft: true, op: { Taille: ['S', 'M', 'L', 'XL'] }, d: 'Robe en tissu wax aux motifs colorés, coupe évasée.' }),
  P('Vêtements', MODE, 'Pantalon chino', 'UrbanDak', 16000, { st: 34, so: 160, op: { Taille: ['38', '40', '42', '44'], Couleur: ['Beige', 'Noir', 'Kaki'] }, d: 'Pantalon droit en coton, plusieurs coloris.' }),
  P('Vêtements', MODE, 'Sweat à capuche', 'UrbanDak', 19500, { st: 40, so: 240, op: { Taille: TAILLES, Couleur: ['Noir', 'Gris'] }, d: 'Sweat molletonné avec poche kangourou.' }),
  P('Vêtements', MODE, 'Polo piqué', 'Teranga', 9500, { st: 55, so: 410, moq: 2, t: [[10, 8500], [50, 7500]], op: { Taille: TAILLES, Couleur: ['Blanc', 'Marine', 'Rouge'] }, d: 'Polo en coton piqué, col classique.' }),
  P('Vêtements', MODE, 'Ensemble sportif', 'UrbanDak', 21000, { st: 22, so: 118, op: { Taille: TAILLES }, d: 'Veste et pantalon de jogging respirants.' }),
  P('Vêtements', MODE, 'Jupe longue', 'Teranga', 12500, { st: 19, so: 76, op: { Taille: ['S', 'M', 'L', 'XL'] }, d: 'Jupe fluide taille élastique.' }),
  P('Vêtements', MODE, 'Grand boubou femme brodé', 'Teranga', 55000, { o: 65000, st: 10, so: 54, ft: true, op: { Couleur: ['Bleu roi', 'Bordeaux', 'Vert émeraude'] }, sp: [['Matière', 'Bazin riche'], ['Pièces', 'Boubou + foulard']], d: 'Grand boubou élégant avec foulard assorti, parfait pour les fêtes.' }),
  P('Vêtements', MODE, 'Ensemble bazin homme', 'Teranga', 48000, { st: 12, so: 71, op: { Taille: ['M', 'L', 'XL', 'XXL'], Couleur: ['Blanc', 'Bleu nuit', 'Marron'] }, sp: [['Matière', 'Bazin'], ['Pièces', 'Tunique + pantalon']], d: 'Tenue traditionnelle pour la prière et les cérémonies.' }),
  P('Vêtements', MODE, 'Pagne wax 6 yards', 'WaxStyle', 12000, { st: 120, so: 1540, moq: 2, t: [[10, 10500], [50, 9000]], sm: true, d: 'Tissu wax 100 % coton aux motifs africains, lot de 6 yards.' }),
  P('Vêtements', MODE, 'T-shirt personnalisable (flocage)', 'Teranga', 4500, { st: 400, so: 880, moq: 20, t: [[50, 3800], [200, 3200]], sm: true, op: { Taille: TAILLES, Couleur: ['Blanc', 'Noir', 'Rouge', 'Bleu'] }, sp: [['Personnalisation', 'Logo ou texte'], ['Matière', '100 % coton 180 g']], d: 'Idéal pour associations, entreprises et événements. Demandez un devis pour votre logo.' }),

  // ───────── Chaussures
  P('Chaussures', SAHEL, 'Chaussures de running', 'FastStep', 32000, { st: 20, so: 160, op: { Pointure: POINTURES_H }, d: 'Semelle amortissante et tige respirante.' }),
  P('Chaussures', MODE, 'Mocassins en cuir', 'Artisan Teranga', 26000, { st: 15, so: 88, op: { Pointure: POINTURES_H, Couleur: ['Noir', 'Marron'] }, d: 'Mocassins élégants, cuir souple.' }),
  P('Chaussures', SAHEL, 'Tongs de plage', 'FastStep', 3500, { st: 90, so: 1320, moq: 2, t: [[12, 3000], [60, 2500]], op: { Pointure: ['38', '40', '42', '44'] }, d: 'Tongs légères et antidérapantes.' }),
  P('Chaussures', MODE, 'Bottines en cuir', 'Artisan Teranga', 34000, { st: 9, so: 44, op: { Pointure: POINTURES_H }, d: 'Bottines robustes avec semelle crantée.' }),
  P('Chaussures', SAHEL, 'Sandales à talon', 'FastStep', 18000, { st: 17, so: 92, op: { Pointure: POINTURES_F, Couleur: ['Noir', 'Beige'] }, d: 'Sandales confortables avec talon de 5 cm.' }),
  P('Chaussures', SAHEL, 'Baskets montantes', 'UrbanDak', 30000, { st: 21, so: 133, op: { Pointure: POINTURES_H }, d: 'Baskets hautes style streetwear.' }),
  P('Chaussures', SAHEL, 'Claquettes de sport', 'FastStep', 6500, { st: 140, so: 1760, moq: 2, t: [[12, 5500], [60, 4800]], op: { Pointure: ['39', '40', '41', '42', '43', '44'], Couleur: ['Noir', 'Bleu'] }, d: 'Claquettes confortables à semelle moulée.' }),
  P('Chaussures', MODE, 'Babouches artisanales en cuir', 'Artisan Teranga', 11000, { st: 45, so: 390, op: { Pointure: ['39', '40', '41', '42', '43', '44'], Couleur: ['Jaune', 'Blanc', 'Marron'] }, d: 'Babouches cousues main, cuir souple.' }),
  P('Chaussures', SAHEL, 'Chaussures de sécurité', 'WorkGuard', 24000, { st: 26, so: 74, t: [[10, 21500], [50, 19500]], op: { Pointure: POINTURES_H }, sp: [['Embout', 'Acier'], ['Semelle', 'Antidérapante']], d: 'Chaussures de chantier, protections renforcées. Tarifs spéciaux pour entreprises.' }),

  // ───────── Accessoires
  P('Accessoires', MODE, 'Ceinture en cuir', 'Artisan Teranga', 8000, { st: 40, so: 150, op: { Couleur: ['Noir', 'Marron'] }, d: 'Ceinture réversible noir et marron.' }),
  P('Accessoires', MODE, 'Portefeuille homme', 'Artisan Teranga', 7500, { st: 33, so: 128, d: 'Portefeuille en cuir avec 6 emplacements pour cartes.' }),
  P('Accessoires', MODE, 'Sac à main', 'Artisan Teranga', 24000, { st: 13, so: 66, op: { Couleur: ['Noir', 'Camel', 'Rouge'] }, d: 'Sac à main élégant avec bandoulière amovible.' }),
  P('Accessoires', MODE, 'Casquette', 'UrbanDak', 5000, { st: 60, so: 300, moq: 2, t: [[12, 4200], [60, 3600]], op: { Couleur: COL }, d: 'Casquette réglable en coton.' }),
  P('Accessoires', DECO, 'Bracelet en perles', 'Artisan Teranga', 4500, { st: 48, so: 260, moq: 3, t: [[12, 3800]], d: 'Bracelet artisanal fait à la main.' }),
  P('Accessoires', MODE, 'Foulard en soie', 'Teranga', 9500, { st: 25, so: 111, d: 'Foulard léger aux motifs africains.' }),
  P('Accessoires', MODE, 'Parapluie pliant', 'ShieldPro', 6000, { st: 38, so: 220, t: [[10, 5200]], d: 'Parapluie compact résistant au vent.' }),
  P('Accessoires', SAHEL, 'Valise cabine 20 pouces', 'TrekGo', 32000, { o: 39000, st: 15, so: 58, op: { Couleur: ['Noir', 'Bleu', 'Rouge'] }, sp: [['Taille', '20" cabine'], ['Roues', '4 roues pivotantes']], d: 'Valise rigide légère avec cadenas intégré.' }),
  P('Accessoires', MODE, 'Lunettes anti-lumière bleue', 'Sunset', 8500, { st: 60, so: 190, d: 'Réduit la fatigue visuelle devant les écrans.' }),
  P('Accessoires', SAHEL, 'Sac banane sport', 'TrekGo', 6500, { st: 70, so: 340, moq: 2, t: [[12, 5500]], op: { Couleur: ['Noir', 'Gris'] }, d: 'Sac de ceinture avec poches zippées.' }),

  // ───────── Beauté & Soins
  P('Beauté & Soins', BAO, 'Beurre de karité pur 250 g', 'Baobab Naturel', 4500, { st: 120, so: 1480, moq: 2, t: [[12, 3900], [60, 3300]], sm: true, ft: true, sp: [['Origine', 'Sénégal / Mali'], ['Poids', '250 g']], d: 'Beurre de karité brut, idéal pour la peau et les cheveux.' }),
  P('Beauté & Soins', BAO, 'Huile de baobab 100 ml', 'Baobab Naturel', 7500, { st: 60, so: 520, sm: true, sp: [['Pression', 'À froid'], ['Contenance', '100 ml']], d: 'Huile nourrissante pour peau, cheveux et ongles.' }),
  P('Beauté & Soins', BAO, 'Savon noir africain (lot de 6)', 'Baobab Naturel', 6000, { st: 90, so: 760, t: [[5, 5200]], sm: true, d: 'Savon traditionnel à la cendre et au karité, pour peaux sensibles.' }),
  P('Beauté & Soins', BAO, 'Huile de coco vierge 500 ml', 'Baobab Naturel', 6500, { st: 70, so: 340, d: 'Huile polyvalente pour la peau, les cheveux et la cuisine.' }),
  P('Beauté & Soins', BAO, 'Thiouraye (encens traditionnel) 100 g', 'Baobab Naturel', 3500, { st: 150, so: 970, moq: 2, t: [[12, 3000]], d: "Mélange parfumé traditionnel sénégalais, pour parfumer la maison et les vêtements." }),
  P('Beauté & Soins', BAO, 'Henné naturel en poudre 100 g', 'Baobab Naturel', 2500, { st: 130, so: 610, moq: 3, t: [[12, 2100]], d: 'Henné pur pour tatouages temporaires et soins capillaires.' }),
  P('Beauté & Soins', BAO, 'Coffret soin cheveux naturels', 'Baobab Naturel', 18500, { o: 22000, st: 25, so: 112, ft: true, d: 'Shampoing, masque et huile aux ingrédients naturels.' }),
  P('Beauté & Soins', BAO, 'Parfum oriental 100 ml', 'Cristalia', 14000, { st: 34, so: 205, op: { Parfum: ['Ambre', 'Oud', 'Musc blanc'] }, d: 'Parfum intense et longue tenue.' }),

  // ───────── Alimentation & Boissons
  P('Alimentation & Boissons', CASA, 'Bissap séché 500 g', 'Casamance Saveurs', 3000, { by: 'Boissons du terroir', st: 200, so: 1850, moq: 2, t: [[12, 2600], [60, 2200]], sm: true, sp: [['Origine', 'Casamance'], ['Poids', '500 g']], d: "Fleurs d'hibiscus séchées pour un jus de bissap frais et naturel." }),
  P('Alimentation & Boissons', CASA, 'Jus de bouye 1 L', 'Casamance Saveurs', 2500, { by: 'Boissons du terroir', st: 150, so: 1320, moq: 2, t: [[12, 2100]], d: 'Jus de fruit du baobab, sans conservateur ajouté.' }),
  P('Alimentation & Boissons', CASA, 'Café Touba moulu 500 g', 'Casamance Saveurs', 4500, { by: 'Boissons du terroir', st: 140, so: 2250, moq: 2, t: [[12, 3900], [60, 3400]], sm: true, ft: true, sp: [['Épices', 'Poivre de Guinée (djar)'], ['Poids', '500 g']], d: 'Le café épicé traditionnel du Sénégal, prêt à infuser.' }),
  P('Alimentation & Boissons', CASA, 'Arachides grillées 1 kg', 'Casamance Saveurs', 2800, { by: 'Fruits secs & douceurs', st: 160, so: 1640, moq: 2, t: [[12, 2400]], d: 'Arachides croquantes grillées au sel.' }),
  P('Alimentation & Boissons', CASA, 'Miel de Casamance 500 g', 'Casamance Saveurs', 5500, { by: 'Fruits secs & douceurs', st: 55, so: 430, sm: true, d: 'Miel de fleurs 100 % naturel, récolté en Casamance.' }),
  P('Alimentation & Boissons', CASA, 'Noix de cajou 1 kg', 'Casamance Saveurs', 9500, { by: 'Fruits secs & douceurs', st: 80, so: 570, t: [[5, 8700], [25, 7900]], sm: true, d: 'Noix de cajou nature de Casamance, calibre premium.' }),
  P('Alimentation & Boissons', CASA, 'Poudre de baobab 250 g', 'Baobab Naturel', 3500, { by: 'Boissons du terroir', st: 90, so: 380, d: 'Pulpe de baobab en poudre, riche en vitamine C.' }),
  P('Alimentation & Boissons', CASA, 'Riz brisé parfumé 25 kg', 'Casamance Saveurs', 14500, { by: 'Grandes quantités', st: 60, so: 920, moq: 1, t: [[10, 13700], [40, 13000]], fr: true, d: 'Sac de riz brisé parfumé, pour le thiéboudienne et les repas du quotidien.' }),

  // ───────── Sport & Fitness
  P('Sport & Fitness', SPORT, 'Ballon de football taille 5', 'FastStep', 7500, { st: 60, so: 540, t: [[10, 6500]], d: 'Ballon cousu main, pour terrain et entraînement.' }),
  P('Sport & Fitness', SPORT, 'Haltères réglables 20 kg', 'FitMax', 24000, { st: 14, so: 70, sp: [['Poids total', '20 kg'], ['Fixation', 'Colliers à vis']], d: 'Paire d’haltères avec disques réglables.' }),
  P('Sport & Fitness', SPORT, 'Tapis de yoga', 'FitMax', 7000, { st: 55, so: 260, op: { Couleur: ['Violet', 'Bleu', 'Vert'] }, d: 'Tapis antidérapant de 6 mm.' }),
  P('Sport & Fitness', SPORT, 'Corde à sauter', 'FitMax', 2500, { st: 100, so: 430, moq: 2, t: [[12, 2100]], d: 'Corde réglable avec roulements.' }),
  P('Sport & Fitness', SPORT, 'Gants de boxe', 'FitMax', 16500, { st: 20, so: 61, op: { Taille: ['10 oz', '12 oz', '14 oz'] }, d: "Gants rembourrés pour l'entraînement." }),
  P('Sport & Fitness', SPORT, 'Sac de sport 40 L', 'TrekGo', 12500, { st: 35, so: 150, t: [[6, 11000]], op: { Couleur: ['Noir', 'Bleu'] }, d: 'Grand sac avec compartiment à chaussures.' }),

  // ───────── Bébé & Enfants
  P('Bébé & Enfants', KIDS, 'Poussette pliable', 'BabyCare', 58000, { st: 8, so: 33, ft: true, op: { Couleur: ['Gris', 'Bleu', 'Rose'] }, d: 'Poussette légère, pliage rapide, capote ajustable.' }),
  P('Bébé & Enfants', KIDS, 'Couches bébé (paquet de 60)', 'BabyCare', 9500, { st: 90, so: 1210, moq: 1, t: [[6, 8800], [24, 8200]], op: { Taille: ['2 (3-6 kg)', '3 (5-9 kg)', '4 (8-14 kg)', '5 (11-18 kg)'] }, d: 'Couches ultra-absorbantes, douces pour la peau.' }),
  P('Bébé & Enfants', KIDS, 'Biberons anti-colique (lot de 3)', 'BabyCare', 7500, { st: 45, so: 310, d: 'Biberons 250 ml sans BPA avec valve anti-colique.' }),
  P('Bébé & Enfants', KIDS, 'Puzzle éducatif en bois', 'Kiddo', 5000, { st: 60, so: 195, t: [[10, 4300]], d: 'Puzzle coloré qui développe la motricité des enfants.' }),
  P('Bébé & Enfants', KIDS, 'Cartable scolaire', 'Kiddo', 11500, { st: 50, so: 640, t: [[10, 10000], [50, 9000]], op: { Couleur: ['Bleu', 'Rose', 'Vert'] }, d: 'Cartable ergonomique avec bretelles rembourrées.' }),
  P('Bébé & Enfants', KIDS, 'Lit parapluie pliant', 'BabyCare', 36000, { st: 6, so: 21, d: 'Lit de voyage léger avec matelas et sac de transport.' }),

  // ───────── Bureau & Papeterie
  P('Bureau & Papeterie', BUREAU, 'Ramette papier A4 (carton de 5)', 'OfficePro', 14500, { st: 150, so: 1480, moq: 1, t: [[10, 13500], [50, 12800]], fr: true, sm: true, sp: [['Format', 'A4'], ['Grammage', '80 g/m²'], ['Feuilles', '5 × 500']], d: 'Papier blanc pour imprimantes et photocopieurs, idéal pour les bureaux.' }),
  P('Bureau & Papeterie', BUREAU, 'Cahiers 96 pages (lot de 20)', 'OfficePro', 6000, { st: 220, so: 1960, t: [[10, 5300], [50, 4700]], sm: true, d: 'Cahiers à grands carreaux, couverture rigide. Parfait pour la rentrée.' }),
  P('Bureau & Papeterie', BUREAU, 'Stylos à bille (boîte de 50)', 'OfficePro', 4000, { st: 240, so: 1720, t: [[10, 3500], [50, 3100]], op: { Couleur: ['Bleu', 'Noir', 'Rouge'] }, sm: true, d: 'Écriture fluide, pointe moyenne.' }),
  P('Bureau & Papeterie', BUREAU, 'Chaise de bureau ergonomique', 'OfficePro', 52000, { o: 62000, st: 14, so: 88, ft: true, sp: [['Dossier', 'Résille respirante'], ['Réglages', 'Hauteur + inclinaison']], d: 'Chaise confortable pour de longues heures de travail.' }),
  P('Bureau & Papeterie', BUREAU, "Bureau d'ordinateur 120 cm", 'OfficePro', 45000, { st: 10, so: 54, sp: [['Dimensions', '120 × 60 cm'], ['Matière', 'Panneau mélaminé']], d: 'Bureau solide avec passe-câbles et pieds métalliques.' }),
  P('Bureau & Papeterie', BUREAU, 'Tableau blanc magnétique 90 × 60', 'OfficePro', 18500, { st: 18, so: 71, d: 'Tableau effaçable avec cadre aluminium et marqueurs.' }),

  // ───────── Artisanat & Déco
  P('Artisanat & Déco', DECO, 'Masque africain sculpté', 'Artisan Teranga', 22000, { st: 12, so: 41, ft: true, d: "Masque en bois d'ébène sculpté à la main." }),
  P('Artisanat & Déco', DECO, 'Tableau en batik 60 × 80', 'Artisan Teranga', 28000, { st: 9, so: 33, d: 'Peinture sur tissu aux couleurs vives, pièce unique.' }),
  P('Artisanat & Déco', DECO, 'Panier en raphia tressé', 'Artisan Teranga', 7500, { st: 40, so: 210, t: [[6, 6500]], op: { Taille: ['Petit', 'Moyen', 'Grand'] }, d: 'Panier tressé à la main, idéal pour courses et rangement.' }),
  P('Artisanat & Déco', DECO, 'Djembé artisanal', 'Artisan Teranga', 45000, { st: 7, so: 29, ft: true, sp: [['Hauteur', '55 cm'], ['Peau', 'Chèvre']], d: 'Djembé traditionnel au son profond, fabriqué à Dakar.' }),
  P('Artisanat & Déco', DECO, 'Statuette en bois (lot de 3)', 'Artisan Teranga', 12000, { st: 25, so: 77, d: 'Trois statuettes sculptées, pour décorer salon ou bureau.' }),
  P('Artisanat & Déco', DECO, 'Cadre photo en bois 20 × 30', 'Cristalia', 4500, { st: 80, so: 290, t: [[10, 3900]], d: 'Cadre simple et élégant en bois clair.' }),
  // ───────── Périmètre frais (alimentation fraîche)
  P('Fruits & légumes', BOUTIK, 'Mangues Kent (1 kg)', 'Boutik Frais', 1500, { st: 120, so: 520, by: 'Fruits', fl: 2, o: 1800, d: 'Mangues mûres à point, livrées du jour.' }),
  P('Fruits & légumes', BOUTIK, 'Bananes (1 kg)', 'Boutik Frais', 800, { st: 160, so: 480, by: 'Fruits', d: 'Bananes douces, idéales pour le petit-déjeuner.' }),
  P('Fruits & légumes', BOUTIK, 'Oranges (1 kg)', 'Boutik Frais', 1000, { st: 140, so: 360, by: 'Fruits', d: 'Oranges juteuses, à presser ou à croquer.' }),
  P('Fruits & légumes', BOUTIK, 'Pastèque (pièce de 5 kg)', 'Boutik Frais', 2500, { st: 40, so: 210, by: 'Fruits', d: 'Pastèque sucrée, parfaite pour la chaleur.' }),
  P('Fruits & légumes', BOUTIK, 'Tomates fraîches (1 kg)', 'Boutik Frais', 900, { st: 200, so: 640, by: 'Légumes', t: [[5, 800]], d: 'Tomates fermes pour sauces et salades.' }),
  P('Fruits & légumes', BOUTIK, 'Oignons (1 kg)', 'Boutik Frais', 700, { st: 220, so: 700, by: 'Légumes', t: [[10, 600]], d: 'Oignons du pays, bonne conservation.' }),
  P('Fruits & légumes', BOUTIK, 'Carottes (1 kg)', 'Boutik Frais', 800, { st: 150, so: 330, by: 'Légumes', d: 'Carottes croquantes.' }),
  P('Fruits & légumes', BOUTIK, 'Piment frais (250 g)', 'Boutik Frais', 500, { st: 90, so: 260, by: 'Légumes', d: 'Piment frais pour relever vos plats.' }),
  P('Fruits & légumes', BOUTIK, 'Pommes de terre (1 kg)', 'Boutik Frais', 900, { st: 180, so: 410, by: 'Tubercules & racines', d: 'Pommes de terre à frire, à bouillir ou en purée.' }),
  P('Fruits & légumes', BOUTIK, 'Patates douces (1 kg)', 'Boutik Frais', 700, { st: 100, so: 190, by: 'Tubercules & racines', d: 'Patates douces à chair orange.' }),
  P('Boulangerie & pâtisserie', BOUTIK, 'Baguette tradition', 'Boulangerie Boutik', 150, { st: 400, so: 1500, by: 'Pains', t: [[10, 135]], d: 'Baguette croustillante, cuite ce matin.' }),
  P('Boulangerie & pâtisserie', BOUTIK, 'Pain complet aux céréales', 'Boulangerie Boutik', 450, { st: 120, so: 380, by: 'Pains', d: 'Pain complet aux graines.' }),
  P('Boulangerie & pâtisserie', BOUTIK, 'Pain de mie (500 g)', 'Boulangerie Boutik', 900, { st: 90, so: 300, by: 'Pains', d: 'Pain de mie moelleux pour les tartines.' }),
  P('Boulangerie & pâtisserie', BOUTIK, 'Croissants au beurre (lot de 4)', 'Boulangerie Boutik', 1200, { st: 80, so: 420, by: 'Viennoiseries', d: 'Croissants pur beurre.' }),
  P('Boulangerie & pâtisserie', BOUTIK, 'Chaussons aux pommes (lot de 4)', 'Boulangerie Boutik', 1400, { st: 60, so: 190, by: 'Viennoiseries', d: 'Pâte feuilletée et pommes fondantes.' }),
  P('Boulangerie & pâtisserie', BOUTIK, 'Gâteau au chocolat (6 parts)', 'Boulangerie Boutik', 3500, { st: 25, so: 120, by: 'Pâtisserie', ft: true, d: 'Gâteau fondant au chocolat noir, pour les fêtes.' }),
  P('Boucherie & poissonnerie', BOUTIK, 'Viande de bœuf à griller (1 kg)', 'Boutik Frais', 5500, { st: 60, so: 340, by: 'Bœuf & mouton', d: 'Morceaux tendres, découpés du jour.' }),
  P('Boucherie & poissonnerie', BOUTIK, 'Gigot de mouton (1 kg)', 'Boutik Frais', 6500, { st: 45, so: 280, by: 'Bœuf & mouton', ft: true, d: 'Gigot de mouton, idéal pour les fêtes.' }),
  P('Boucherie & poissonnerie', BOUTIK, 'Poulet fermier entier (1,5 kg)', 'Boutik Frais', 4500, { st: 70, so: 390, by: 'Volaille', d: 'Poulet élevé en plein air.' }),
  P('Boucherie & poissonnerie', BOUTIK, 'Cuisses de poulet (1 kg)', 'Boutik Frais', 3000, { st: 90, so: 310, by: 'Volaille', d: 'Cuisses de poulet fraîches.' }),
  P('Boucherie & poissonnerie', BOUTIK, 'Thiof frais (1 kg)', 'Boutik Frais', 6000, { st: 40, so: 260, by: 'Poissons & fruits de mer', d: 'Thiof pêché du jour, vidé et écaillé.' }),
  P('Boucherie & poissonnerie', BOUTIK, 'Crevettes décortiquées (500 g)', 'Boutik Frais', 5000, { st: 35, so: 150, by: 'Poissons & fruits de mer', d: 'Crevettes décortiquées surgelées.' }),
  P('Boucherie & poissonnerie', BOUTIK, 'Sardines fraîches (1 kg)', 'Boutik Frais', 1800, { st: 100, so: 330, by: 'Poissons & fruits de mer', d: 'Sardines fraîches du jour.' }),
  P('Produits laitiers & œufs', BOUTIK, 'Lait frais pasteurisé (1 L)', 'Laiterie Boutik', 1000, { st: 150, so: 520, by: 'Lait', t: [[6, 920]], d: 'Lait entier pasteurisé.' }),
  P('Produits laitiers & œufs', BOUTIK, 'Lait en poudre (400 g)', 'Laiterie Boutik', 2800, { st: 110, so: 440, by: 'Lait', t: [[6, 2600]], d: 'Lait en poudre entier, boîte de 400 g.' }),
  P('Produits laitiers & œufs', BOUTIK, 'Yaourts nature (pack de 6)', 'Laiterie Boutik', 1800, { st: 80, so: 290, by: 'Yaourts & fromages', d: 'Yaourts nature onctueux.' }),
  P('Produits laitiers & œufs', BOUTIK, 'Fromage fondu en portions (x16)', 'Laiterie Boutik', 1500, { st: 100, so: 270, by: 'Yaourts & fromages', d: 'Portions individuelles de fromage fondu.' }),
  P('Produits laitiers & œufs', BOUTIK, 'Beurre doux (250 g)', 'Laiterie Boutik', 1800, { st: 70, so: 230, by: 'Œufs & beurre', d: 'Beurre doux de qualité.' }),
  P('Produits laitiers & œufs', BOUTIK, 'Œufs frais (plateau de 30)', 'Boutik Frais', 3500, { st: 90, so: 610, by: 'Œufs & beurre', t: [[4, 3300]], d: 'Œufs frais, calibre moyen.' }),

  // ───────── Allées centrales (épicerie sèche)
  P('Épicerie sèche', BOUTIK, 'Riz brisé parfumé (5 kg)', 'Boutik Épicerie', 3200, { st: 200, so: 880, by: 'Riz & céréales', t: [[4, 3000]], d: 'Riz brisé parfumé pour le thiéboudienne.' }),
  P('Épicerie sèche', BOUTIK, 'Mil en grains (1 kg)', 'Boutik Épicerie', 700, { st: 150, so: 270, by: 'Riz & céréales', d: 'Mil en grains pour couscous et bouillie.' }),
  P('Épicerie sèche', BOUTIK, 'Maïs concassé (1 kg)', 'Boutik Épicerie', 600, { st: 140, so: 210, by: 'Riz & céréales', d: 'Maïs concassé.' }),
  P('Épicerie sèche', BOUTIK, 'Huile végétale (1 L)', 'Boutik Épicerie', 1700, { st: 260, so: 940, by: 'Huiles & condiments', d: 'Huile végétale raffinée.' }),
  P('Épicerie sèche', BOUTIK, 'Huile végétale (5 L)', 'Boutik Épicerie', 7800, { st: 120, so: 520, by: 'Huiles & condiments', t: [[4, 7400]], d: 'Bidon de 5 litres, format famille.' }),
  P('Épicerie sèche', BOUTIK, 'Sel fin (1 kg)', 'Boutik Épicerie', 300, { st: 300, so: 480, by: 'Huiles & condiments', d: 'Sel fin iodé.' }),
  P('Épicerie sèche', BOUTIK, 'Concentré de tomate (400 g)', 'Boutik Épicerie', 700, { st: 220, so: 760, by: 'Conserves', t: [[12, 620]], d: 'Concentré de tomate double.' }),
  P('Épicerie sèche', BOUTIK, 'Sardines à l\'huile (lot de 3)', 'Boutik Épicerie', 1500, { st: 180, so: 640, by: 'Conserves', d: 'Trois boîtes de sardines à l\'huile.' }),
  P('Épicerie sèche', BOUTIK, 'Haricots rouges en boîte', 'Boutik Épicerie', 900, { st: 130, so: 240, by: 'Conserves', d: 'Haricots rouges cuits, prêts à l\'emploi.' }),
  P('Épicerie sèche', BOUTIK, 'Sucre en poudre (1 kg)', 'Boutik Épicerie', 800, { st: 260, so: 820, by: 'Sucre, farine & pâtes', t: [[10, 740]], d: 'Sucre blanc en poudre.' }),
  P('Épicerie sèche', BOUTIK, 'Farine de blé (1 kg)', 'Boutik Épicerie', 800, { st: 180, so: 350, by: 'Sucre, farine & pâtes', d: 'Farine de blé pour pains et pâtisseries.' }),
  P('Épicerie sèche', BOUTIK, 'Spaghetti (500 g)', 'Boutik Épicerie', 600, { st: 240, so: 560, by: 'Sucre, farine & pâtes', t: [[10, 540]], d: 'Spaghetti de blé dur.' }),
  P('Boissons', BOUTIK, 'Eau minérale (pack de 6 × 1,5 L)', 'Boutik Boissons', 1800, { st: 160, so: 900, by: 'Eaux', t: [[4, 1700]], d: 'Eau minérale naturelle.' }),
  P('Boissons', BOUTIK, 'Eau gazeuse (1 L)', 'Boutik Boissons', 600, { st: 90, so: 180, by: 'Eaux', d: 'Eau gazeuse bien fraîche.' }),
  P('Boissons', BOUTIK, 'Soda cola (1,5 L)', 'Boutik Boissons', 700, { st: 200, so: 710, by: 'Jus & sodas', d: 'Soda cola en grande bouteille.' }),
  P('Boissons', BOUTIK, 'Jus d\'orange (1 L)', 'Boutik Boissons', 1200, { st: 110, so: 330, by: 'Jus & sodas', d: 'Jus d\'orange sans sucres ajoutés.' }),
  P('Boissons', BOUTIK, 'Jus de gingembre (1 L)', 'Boutik Boissons', 1500, { st: 70, so: 260, by: 'Jus & sodas', d: 'Jus de gingembre maison, bien relevé.' }),
  P('Boissons', BOUTIK, 'Thé vert (boîte de 25 sachets)', 'Boutik Boissons', 1200, { st: 120, so: 340, by: 'Thés & cafés', d: 'Thé vert en sachets.' }),
  P('Boissons', BOUTIK, 'Café soluble (200 g)', 'Boutik Boissons', 2800, { st: 80, so: 220, by: 'Thés & cafés', d: 'Café soluble au goût intense.' }),
  P('Entretien & ménage', BOUTIK, 'Lessive en poudre (2 kg)', 'Boutik Maison', 3500, { st: 140, so: 620, by: 'Lessive & linge', t: [[4, 3300]], d: 'Lessive en poudre, main et machine.' }),
  P('Entretien & ménage', BOUTIK, 'Savon de Marseille (lot de 3)', 'Boutik Maison', 1500, { st: 120, so: 350, by: 'Lessive & linge', d: 'Savon de Marseille en cubes.' }),
  P('Entretien & ménage', BOUTIK, 'Liquide vaisselle (750 ml)', 'Boutik Maison', 1100, { st: 150, so: 430, by: 'Vaisselle', d: 'Dégraissant, doux pour les mains.' }),
  P('Entretien & ménage', BOUTIK, 'Éponges de cuisine (lot de 10)', 'Boutik Maison', 1000, { st: 130, so: 280, by: 'Vaisselle', d: 'Éponges double face.' }),
  P('Entretien & ménage', BOUTIK, 'Eau de Javel (1 L)', 'Boutik Maison', 700, { st: 200, so: 540, by: 'Sols & surfaces', d: 'Désinfecte sols et surfaces.' }),
  P('Entretien & ménage', BOUTIK, 'Insecticide en spray (400 ml)', 'Boutik Maison', 1800, { st: 90, so: 310, by: 'Sols & surfaces', d: 'Moustiques, mouches et cafards.' }),

  // ───────── Marchandises générales (nouveaux rayons)
  P('Pharmacie & santé', BOUTIK, 'Thermomètre digital', 'Boutik Santé', 3500, { st: 60, so: 240, d: 'Mesure rapide, affichage clair.' }),
  P('Pharmacie & santé', BOUTIK, 'Tensiomètre électronique au bras', 'Boutik Santé', 22000, { st: 20, so: 70, ft: true, sp: [['Mesure', 'Au bras'], ['Mémoire', '2 × 90 mesures']], d: 'Tensiomètre automatique, grand écran.' }),
  P('Pharmacie & santé', BOUTIK, 'Pansements assortis (x40)', 'Boutik Santé', 1200, { st: 150, so: 380, d: 'Pansements de plusieurs tailles.' }),
  P('Pharmacie & santé', BOUTIK, 'Gel hydroalcoolique (500 ml)', 'Boutik Santé', 2000, { st: 100, so: 290, d: 'Gel désinfectant pour les mains.' }),
  P('Pharmacie & santé', BOUTIK, 'Masques chirurgicaux (boîte de 50)', 'Boutik Santé', 2500, { st: 120, so: 330, t: [[10, 2200]], d: 'Masques à 3 couches.' }),
  P('Bricolage & jardin', BOUTIK, 'Perceuse sans fil 18 V', 'Boutik Outils', 38000, { st: 14, so: 85, ft: true, sp: [['Tension', '18 V'], ['Batteries', '2 incluses']], d: 'Perceuse-visseuse avec deux batteries et chargeur.' }),
  P('Bricolage & jardin', BOUTIK, 'Boîte à outils 40 pièces', 'Boutik Outils', 22000, { st: 25, so: 110, d: 'Clés, tournevis et pinces rangés dans une valise.' }),
  P('Bricolage & jardin', BOUTIK, 'Arrosoir 10 L', 'Boutik Outils', 3500, { st: 50, so: 140, d: 'Arrosoir en plastique renforcé.' }),
  P('Bricolage & jardin', BOUTIK, 'Tuyau d\'arrosage 15 m', 'Boutik Outils', 9000, { st: 30, so: 95, d: 'Tuyau souple avec raccords.' }),
  P('Bricolage & jardin', BOUTIK, 'Peinture murale blanche (10 L)', 'Boutik Outils', 18000, { st: 22, so: 75, d: 'Peinture lessivable pour intérieur.' }),
  P('Bricolage & jardin', BOUTIK, 'Cadenas haute sécurité', 'Boutik Outils', 4500, { st: 70, so: 210, d: 'Cadenas en acier trempé.' }),
  P('Jouets & loisirs', BOUTIK, 'Poupée articulée 40 cm', 'Boutik Jeux', 6500, { st: 30, so: 120, d: 'Poupée aux membres articulés, avec tenues.' }),
  P('Jouets & loisirs', BOUTIK, 'Voiture télécommandée', 'Boutik Jeux', 12500, { st: 18, so: 90, ft: true, d: 'Voiture tout-terrain rechargeable.' }),
  P('Jouets & loisirs', BOUTIK, 'Jeu de construction 200 pièces', 'Boutik Jeux', 9500, { st: 25, so: 105, d: 'Briques colorées compatibles entre elles.' }),
  P('Jouets & loisirs', BOUTIK, 'Jeu d\'awalé en bois', 'Boutik Jeux', 6000, { st: 40, so: 160, d: 'Le jeu de société traditionnel, plateau en bois sculpté.' }),
  P('Jouets & loisirs', BOUTIK, 'Cerf-volant', 'Boutik Jeux', 2500, { st: 60, so: 130, d: 'Cerf-volant coloré avec ficelle.' }),
  P('Auto & moto', BOUTIK, 'Casque de moto intégral', 'Boutik Auto', 28000, { st: 16, so: 80, op: { Taille: ['M', 'L', 'XL'] }, d: 'Casque homologué avec visière anti-rayures.' }),
  P('Auto & moto', BOUTIK, 'Batterie auto 12 V 60 Ah', 'Boutik Auto', 65000, { st: 10, so: 55, sp: [['Tension', '12 V'], ['Capacité', '60 Ah']], d: 'Batterie sans entretien, garantie 12 mois.' }),
  P('Auto & moto', BOUTIK, 'Huile moteur 5W30 (5 L)', 'Boutik Auto', 24000, { st: 24, so: 95, d: 'Huile synthétique pour moteurs essence et diesel.' }),
  P('Auto & moto', BOUTIK, 'Tapis de voiture universels', 'Boutik Auto', 12000, { st: 28, so: 70, d: 'Jeu de 4 tapis antidérapants.' }),
  P('Auto & moto', BOUTIK, 'Compresseur portable 12 V', 'Boutik Auto', 15000, { st: 22, so: 85, d: 'Gonfle un pneu en quelques minutes.' }),
  P('Auto & moto', BOUTIK, 'Gilet de sécurité', 'Boutik Auto', 2500, { st: 90, so: 150, d: 'Gilet fluorescent obligatoire en voiture.' }),
];

module.exports = { CATEGORIES, SUPPLIERS, PRODUCTS };
