# Boutik — Application e-commerce MERN

> 🚀 **Mettre le site en ligne : voir [DEPLOIEMENT.md](DEPLOIEMENT.md)** (Render, serveur Docker ou Vercel, étape par étape).

Application web de vente en ligne (MongoDB, Express, React, Node.js) réalisée d'après le cahier des charges.

## Prérequis
- Node.js 18 ou plus
- MongoDB en local (`mongodb://127.0.0.1:27017`) ou une base MongoDB Atlas

## Installation

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env        # puis adaptez MONGO_URI et JWT_SECRET
npm run seed                # crée l'admin, 5 clients, catégories, vendeurs, 12 produits, bannières, commandes et devis
npm run dev                 # API sur http://localhost:5000
```

### 2. Frontend (dans un second terminal)
```bash
cd frontend
npm install
npm run dev                 # site sur http://localhost:5173
```

## Comptes de test (créés par `npm run seed`)
| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur du projet | admin@boutik.sn | Admin123! |
| Sous-administrateur (produits, commandes, devis) | equipe@boutik.sn | Equipe123! |
| Client | client@boutik.sn | Client123! |

Codes promo de démonstration : `BIENVENUE10` (−10 %) et `TABASKI5000` (−5 000 FCFA dès 20 000 FCFA). Le seed crée aussi 18 commandes sur 30 jours (pour les graphiques) et quelques avis.

## Fonctionnalités
**Client** : inscription, connexion, catalogue, recherche par nom, filtre par catégorie, détail produit, panier (ajout, suppression, quantité, total), commande avec adresse de livraison, suivi de « Mes commandes » (annulation tant que la commande est en attente), modification du profil.

**Administrateur** : tableau de bord (produits, clients, commandes, ventes), ajout / modification / suppression de produits (avec envoi d'image), création de catégories, consultation de toutes les commandes et changement de statut (En attente → Confirmée → Expédiée → Livrée, ou Annulée).

**Codes promo** : le client saisit un code dans le panier (aperçu de la remise) ; l'admin crée des codes en pourcentage ou en montant fixe, avec minimum de commande, nombre d'utilisations maximum et date d'expiration, et peut les activer / désactiver (page *Codes promo*). La remise est recalculée et l'utilisation du code réservée côté serveur ; une commande annulée rend l'utilisation du code.

**Avis et favoris** : un client peut noter un produit (1 à 5 étoiles + commentaire) une fois sa commande livrée, un seul avis par produit (un nouvel envoi le remplace) ; la note moyenne s'affiche sur les cartes et la fiche produit. Le cœur ajoute un produit aux favoris (page *Favoris*).

**Tableau de bord** : voir la section « Espace administrateur » ci-dessous.

**Sécurité** : mots de passe hachés avec bcrypt, authentification JWT, routes protégées côté API et côté React, gestion des rôles (le rôle admin ne peut pas être choisi à l'inscription).

**Règles métier** : le prix et le total d'une commande sont recalculés côté serveur ; le stock est décrémenté à la commande et remis en vente si la commande est annulée ; numéros de commande #1001, #1002…


## Nouveautés inspirées d'Alibaba et d'Amazon

**Boutique**
- En-tête à deux étages : adresse de livraison, recherche par catégorie, « Compte et listes », panier avec compteur, barre de liens (Ventes Flash, Meilleures ventes, Nouveautés, Livraison gratuite, Demander un devis) et menu « Toutes » avec les catégories.
- Accueil : carrousel de bannières, tuiles de catégories, rangées défilantes (Ventes Flash avec compte à rebours, Meilleures ventes classées, Nouveautés, Livraison gratuite, Sélection, Consultés récemment), bloc « Demander un devis », bandeau de confiance.
- Catalogue : filtres latéraux (catégorie, avis, prix, livraison gratuite, ventes flash, promotions, en stock), tris, pagination, filtres actifs dans l'URL.
- Carte produit : remise en %, ancien prix barré, note, quantité minimum (MOQ), nombre de ventes, livraison gratuite, vendeur vérifié.
- Fiche produit : galerie d'images, prix dégressifs par quantité, quantité minimum, caractéristiques, bloc livraison et protection des commandes, fiche vendeur (note, temps de réponse, livraison à l'heure, taux de réachat), répartition des avis, « Acheter maintenant », recommandations.
- Devis (RFQ) et « Discuter avec le vendeur » : messagerie client ↔ administrateur (`/mes-devis`, `/demande-devis`).
- Panier : prix dégressifs, indication du palier suivant, barre de progression vers la livraison gratuite, frais de livraison, mode de paiement à la livraison (espèces, Wave, Orange Money).
- Commandes : suivi par étapes, « Acheter à nouveau », facture imprimable.
- Centre d'aide, bandeau de cookies, pied de page complet.

## Nouveautés de la dernière version

**Catalogue élargi** : ~150 produits au total, 14 catégories (Téléphones & Tablettes, Informatique, Énergie solaire, Maison, Beauté & Soins, Alimentation & Boissons, Sport, Bébé, Bureau, Artisanat…) et 12 vendeurs. Les données sont dans `backend/data/catalog.js` ; ajoutez vos produits à la liste `PRODUCTS`.
```bash
cd backend
npm run seed:catalog   # ajoute / complète le catalogue SANS rien effacer (peut être relancé sans doublons)
npm run seed           # réinitialise tout (démo) puis charge aussi le catalogue
```
Les produits n'ont pas encore d'image (pastille colorée avec l'icône de la catégorie) : ajoutez-les depuis *Admin → Produits*.

**Boutique**
- **Options au choix** (couleur, taille, pointure…) : le client doit choisir avant d'ajouter au panier ; un même produit peut figurer plusieurs fois avec des variantes différentes. Les prix dégressifs s'appliquent à la quantité totale du produit, le stock est partagé entre variantes. Vérification côté serveur.
- **Comparateur** (`/comparer`) : jusqu'à 4 produits côte à côte (prix, paliers, MOQ, vendeur, caractéristiques…), barre flottante de sélection.
- **Recherche avec suggestions** (produits, catégories, marques), navigation au clavier.
- **Annuaire des vendeurs** (`/vendeurs`) et **boutique de chaque vendeur** (`/vendeurs/:id`) : statistiques, catégories, produits triables, contact.
- **Échantillons** : bouton « Demander un échantillon » sur les produits concernés (messagerie existante).
- **Nouveaux filtres** : vendeurs vérifiés, échantillon disponible, MOQ maximum, marque.
- **Retours et remboursements** : le client demande un retour sur une commande livrée (dans le délai des réglages) ; suivi de la réponse dans *Mes commandes*.
- Accueil : bandeau de catégories, 8 tuiles, rangée « Échantillons », « Vendeurs vérifiés ».

**Administration** : éditeur d'options et case « Échantillon disponible » dans le formulaire produit ; filtre « Demandes de retour » et traitement (accepter / refuser / remboursée, avec réponse) dans *Commandes* ; options visibles dans les commandes, factures et exports CSV.

**Sécurité** : limitation des tentatives de connexion / inscription (30 par 15 min et par IP) ; correction du CORS (`CLIENT_URL` accepte plusieurs adresses séparées par des virgules).

## La boutique officielle organisée comme un supermarché

Votre partie « Boutique officielle » reprend l'organisation d'un supermarché de type Walmart (`/boutique-officielle`) :

| Principe d'un supermarché | Sur le site |
|---|---|
| **Aménagement en grille** (allées droites) pour l'épicerie | Rayons alimentaires en **allées numérotées** (F1, E2…), grille régulière rangée par **travées**, et mode **« Liste de courses »** (quantité réglable en un clic, total du panier en bas de l'écran) |
| **Plan libre** pour le non-alimentaire | Rayons mode, high-tech, maison, jouets, auto… en **mosaïque** (grandes et petites tuiles, bouton « Continuez la balade » vers l'allée suivante) |
| **Planogrammes centralisés** | *Admin → Planogramme* : vous fixez l'ordre exact des produits et leur travée pour chaque rayon ; tous les visiteurs voient le même rangement. Bouton de **rangement automatique** (par travée puis meilleures ventes) |
| **Périmètre = produits frais** | Zone « Périmètre frais » (fruits et légumes, boulangerie, boucherie et poissonnerie, produits laitiers et œufs) autour du plan, mise en avant dès l'accueil |
| **Allées centrales = épicerie sèche** | Zone « Allées centrales » (épicerie sèche, boissons, terroir, entretien et ménage) |
| **Marchandises générales** | Zone « Marchandises générales » (17 rayons : vêtements, électronique, téléphones, maison, jouets, pharmacie, bricolage, auto…) |
| **Têtes de gondole** | *Admin → Têtes de gondole* : emplacements de bout d'allée (promotion, marque partenaire, produits de saison) programmables par **dates**, et affichables en bout d'allée, de zone, sur le plan du magasin et l'accueil |
| Achats d'impulsion à la caisse | Rangée « Avant de passer en caisse » dans le panier (petits produits à moins de 2 000 FCFA) |
| Produits livrés déjà triés | *Admin → Commandes → Bon de préparation* : les articles d'une commande classés dans l'ordre du magasin (zone → allée → place du planogramme), à imprimer |

- **Plan du magasin** (`/boutique-officielle`) : le frais encadre les allées centrales, l'aile des marchandises générales est à côté, les caisses en bas. Chaque rayon, chaque zone (`/boutique-officielle/fresh|grocery|general`) et chaque allée (`/rayon/<nom>`) a sa page ; on passe d'une allée à la suivante comme en magasin.
- **Rayons** : *Admin → Rayons* (anciennes « Catégories ») : zone, numéro d'allée, affichage (grille ou plan libre) et travées. 25 rayons sont installés ; vos réglages ne sont jamais écrasés.
- **Mise à jour d'une base existante** : au démarrage, les rayons manquants sont créés et les rayons existants rangés dans une zone. Pour ajouter les ~75 produits frais, épicerie, pharmacie, bricolage, jouets et auto avec leurs images : `cd backend && npm run seed:catalog` (sans rien effacer ; le planogramme que vous avez réglé n'est pas modifié).
- **Marchés** : les nouveaux rayons alimentaires (fruits et légumes, boulangerie…) sont aussi ouverts aux vendeurs du marché Kermel, etc. ; ceux que vous retirez d'un marché n'y reviennent pas.

**Limites** : la livraison de nuit « déjà triée » des supermarchés n'a pas d'équivalent en ligne ; le bon de préparation s'en approche pour votre équipe. Les têtes de gondole et le planogramme concernent la boutique officielle (pas les marchés des vendeurs).

## Sécurité

**Ce qui est en place**
- **Connexion** : 5 mots de passe faux de suite (même adresse IP + même email) = pause de 15 minutes ; l'email inconnu est traité à l'identique (on ne peut pas deviner quels comptes existent) ; limite de débit sur la connexion, l'inscription, les codes promo, les messages, les avis, les commandes et les envois de fichiers ; limite générale de 300 requêtes/minute par IP.
- **Mots de passe** : 8 caractères minimum avec une lettre et un chiffre, mots de passe trop courants refusés, hachage bcrypt (coût 12). Changer son **email ou son mot de passe demande le mot de passe actuel**.
- **Sessions** : jetons à algorithme imposé, **12 h pour le personnel** (7 jours pour les clients) ; après un changement de mot de passe ou « Me déconnecter partout » (page *Mon profil → Sécurité du compte*), tous les anciens appareils sont déconnectés ; un compte suspendu perd l'accès immédiatement.
- **Double authentification (TOTP)** : Google Authenticator, Microsoft Authenticator, Authy… Activable par tout le monde dans *Mon profil → Sécurité du compte*, **fortement recommandée pour les administrateurs** (un bandeau le rappelle). Codes de secours à usage unique ; secret chiffré en base (AES-256-GCM). Le personnel ne peut jamais se connecter via Google / Facebook / GitHub : il garde mot de passe + double authentification.
- **Fichiers envoyés** : le contenu réel est vérifié (JPG, PNG, WEBP, GIF uniquement), le nom et l'extension choisis par l'utilisateur sont ignorés, nom aléatoire, 3 Mo maximum, servis sans pouvoir être exécutés.
- **Entrées** : opérateurs MongoDB (`$ne`, `$where`…) et paramètres répétés neutralisés, JSON limité à 300 Ko, recherches échappées.
- **En-têtes** : anti-clickjacking, `nosniff`, politique de contenu (CSP), HSTS en production, pas de `X-Powered-By`, pas de cache pour les données personnelles. nginx / Vercel / Render envoient les mêmes protections pour le site.
- **Erreurs** : en production, une erreur interne ne montre jamais ses détails au visiteur (ils restent dans les journaux du serveur).
- **Démarrage** : en production, le serveur **refuse de démarrer** si `JWT_SECRET` fait moins de 32 caractères ou garde la valeur d'exemple ; `node seed.js` refuse de tourner en production sans `--force` (il efface la base et crée des comptes aux mots de passe publics).
- **Traçabilité** : *Admin → Journal et sécurité* (administrateur du projet) : actions du personnel, connexions, échecs, verrouillages, changements de mot de passe, double authentification, avec les adresses IP ; conservés 90 jours.

**À faire avant de mettre en ligne**
1. **Changez les secrets** : générez un `JWT_SECRET` (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). Si votre `.env` (ou son mot de passe MongoDB Atlas) a déjà été partagé ou publié, **changez aussi le mot de passe de la base** dans Atlas.
2. N'exécutez **jamais** `npm run seed` sur la vraie base de production (comptes de démonstration connus de tous). Créez votre administrateur autrement, puis changez son mot de passe.
3. Mettez `NODE_ENV=production`, `CLIENT_URL` et `API_URL` aux vraies adresses, et servez le site **en HTTPS uniquement**.
4. Activez la **double authentification** sur votre compte administrateur (et sur ceux de votre équipe).
5. MongoDB Atlas : n'autorisez que l'adresse IP de votre serveur (pas `0.0.0.0/0`), utilisez un utilisateur à droits limités, et activez les sauvegardes.
6. Dans `vercel.json` / `render.yaml`, remplacez `connect-src 'self' https:` par l'adresse exacte de votre API.
7. Mettez à jour les dépendances : `cd backend && npm install multer@2 && npm audit fix` (multer 1.x a des vulnérabilités connues), puis `cd ../frontend && npm audit fix`.
8. Derrière nginx, un proxy ou Render, gardez `X-Forwarded-For` (déjà configuré dans `nginx.conf`) : sinon les limites de débit voient tout le monde comme une seule adresse.

**Limites actuelles** : les limites de débit sont en mémoire (une seule instance du serveur ; avec plusieurs instances, utilisez Redis) ; le jeton de session est gardé dans le navigateur (`localStorage`), d'où la politique de contenu stricte et l'absence de HTML injecté ; pas de vérification de l'email à l'inscription ni de « mot de passe oublié » par email (à ajouter avec un service d'envoi d'emails) ; un pare-feu applicatif (Cloudflare…) reste conseillé pour les attaques à grande échelle.

## Couleurs du site (vert diamant)

La couleur principale est un **vert diamant** (`#08855c`), avec un éclat plus vif (`#19c58b`) sur les fonds sombres, une barre du haut vert profond (`#052e22`) et un petit diamant ◆ devant le nom de la boutique. Toutes les couleurs sont regroupées en haut de `frontend/src/styles.css` (bloc `:root`, variables `--brand`, `--brand-bright`, `--nav`, `--accent`…) : changez-les à cet endroit pour modifier l'ensemble du site. Les étoiles de notation restent dorées et les avertissements ambrés, pour rester lisibles. Les contrastes texte/fond respectent le seuil d'accessibilité recommandé (4,5:1). Les bannières et marchés déjà enregistrés gardent leur propre couleur : modifiez-les dans *Admin → Bannières / Marchés*.

## Un site en deux parties : boutique officielle et cinq marchés

- **🏪 Boutique officielle** (`/boutique-officielle`) : vos propres produits. C'est tout ce que vous ajoutez depuis *Admin → Produits* (sans vendeur propriétaire).
- **🏬 Les marchés** (`/marches`) : cinq grands marchés, comme dans la vraie vie. Chacun regroupe des **boutiques** de vendeurs d'un même univers :

| Marché | On y vend |
|---|---|
| Marché Sandaga | Maison, bébé et enfants, bureau et papeterie, sport |
| Marché HLM | Vêtements, chaussures, accessoires (tissus et couture) |
| Marché Kermel | Alimentation et boissons, beauté et soins |
| Marché Colobane | Électronique, téléphones, informatique, énergie solaire |
| Marché de Soumbédioune | Artisanat et décoration |

- **Ouvrir une boutique** : le vendeur choisit son marché sur `/vendre`, puis y publie ses produits. Il ne peut y vendre que les catégories de ce marché (comme les étals d'un vrai marché). Il change de marché tant qu'il n'a pas de produits ; ensuite, c'est l'administrateur qui déplace la boutique (*Admin → Boutiques des vendeurs*).
- **Page d'un marché** : présentation, vitrine de chaque boutique (les « étals »), puis tous les produits du marché, filtrables par catégorie.
- **Accueil** : deux grandes portes (boutique officielle / marchés), puis les produits de la boutique officielle et un aperçu de chaque marché. Dans la recherche, le filtre « Où chercher ? » sépare tout le site, la boutique officielle et chaque marché. Chaque produit indique d'où il vient.
- **Administration** : *Admin → Marchés* pour renommer un marché, changer sa couleur et ses catégories, en ajouter ou en masquer un (droit « boutiques » pour les sous-administrateurs).
- Les cinq marchés sont installés automatiquement au démarrage du serveur ; les boutiques et produits déjà existants sont rangés (boutiques dans le marché Sandaga, produits des vendeurs en « marché », les vôtres en « boutique officielle »).

## Connexion avec Google, Facebook et GitHub

Les boutons « Continuer avec … » sont sur les pages *Connexion* et *Créer un compte*. Un fournisseur ne fonctionne que si vous avez créé l'application correspondante et renseigné ses identifiants dans `backend/.env` ; sinon le visiteur voit « La connexion avec … n'est pas encore activée ».

**Adresse de retour à déclarer chez chaque fournisseur** : `<adresse publique du backend>/api/auth/oauth/<google|facebook|github>/callback`
(en local : `http://localhost:5000/api/auth/oauth/google/callback`, etc.). Renseignez aussi `API_URL` (adresse publique du backend) et `CLIENT_URL` (adresse du site) dans `.env`.

| Fournisseur | Où créer l'application | Variables `.env` |
|---|---|---|
| Google | console.cloud.google.com → API et services → Identifiants → *ID client OAuth* (application Web) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Facebook | developers.facebook.com → Mes applications → *Connexion avec Facebook* ; ajouter l'adresse de retour dans « URI de redirection OAuth valides » | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| GitHub | github.com → Settings → Developer settings → OAuth Apps → New OAuth App | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

Règles de sécurité : le compte est créé au premier passage (rôle client) ; si l'email correspond à un client existant **et vérifié par le fournisseur**, les comptes sont liés ; un compte **administrateur ou sous-administrateur n'est jamais lié automatiquement** (il garde son mot de passe) ; un compte suspendu ne peut pas se connecter ; le retour est protégé (état signé, cookie, adresses autorisées uniquement). Facebook n'étant utilisable en production qu'après la « mise en ligne » de l'application chez Facebook, testez-le avec un compte testeur au début.

## Place de marché : des vendeurs ouvrent leur boutique

Comme sur Shopify, mais au sein de votre site : n'importe qui peut **ouvrir sa boutique**, publier ses produits et recevoir ses commandes. La plateforme prend une **commission** sur les ventes livrées.

**Pour un vendeur** (`/vendre` puis `/vendeur`)
1. Il crée un compte (ou se connecte avec Google, Facebook ou GitHub), choisit son **marché**, puis ouvre sa boutique (nom, logo, description). Elle est **en attente de validation** (ou validée tout de suite si vous activez la validation automatique dans *Admin → Paramètres*).
2. Dans son espace vendeur : tableau de bord (ventes, stock bas, commandes à traiter), **ses produits** (mêmes fonctions que l'administration : photos, options, prix dégressifs, stock, échantillons), **ses commandes** (confirmer, expédier, marquer livrée, retours), **ses messages et devis**, **ses revenus** et le profil de sa boutique.
3. Il ne voit et ne modifie **que ses propres produits, commandes et messages** : l'API refuse tout le reste.

**Pour l'acheteur** : rien ne change, sauf qu'un panier avec des produits de plusieurs boutiques donne **une commande par boutique** (chacune avec son suivi, sa livraison et ses retours). Le code promo est réparti au prorata. Les boutiques ont une page publique (`/vendeurs/:id`) avec leur logo et leur description ; les questions sur un produit arrivent chez son vendeur.

**Pour l'administrateur** (*Admin → Boutiques des vendeurs*, droit « boutiques » pour les sous-administrateurs)
- **Valider** une nouvelle boutique, la **suspendre** (ses produits sont masqués, puis remis en ligne à la réactivation), accorder le badge ✔ vérifié ;
- fixer la **commission** : taux général dans *Paramètres* (10 % par défaut) ou taux propre à une boutique ;
- suivre ce que chaque boutique doit et **enregistrer les reversements**.

**Commission et paiement** : le client paie à la livraison, donc **c'est le vendeur qui encaisse**. La commission est calculée sur le montant des produits après remise, uniquement pour les commandes **livrées** et non remboursées ; le vendeur la reverse à la plateforme (espèces, Wave, Orange Money, virement…) et vous enregistrez chaque reversement. Les produits de la plateforme et des « vendeurs » créés par vous n'ont pas de commission. **Pas de paiement en ligne ni de reversement automatique** : cela demanderait un prestataire de paiement (Wave, Orange Money, Stripe…).

Comptes de démonstration (`npm run seed`) : `vendeur@boutik.sn` / `Vendeur123!` (boutique « Atelier Fatou », marché HLM, validée), `boutique1@` à `boutique9@boutik.sn` / `Vendeur123!` (neuf autres boutiques réparties dans les cinq marchés) et `nouveau@boutik.sn` / `Nouveau123!` (boutique en attente à valider).

**Limites actuelles** : l'espace vendeur est en français ; un vendeur n'a qu'une boutique par compte ; les avis restent modérés par l'administrateur.

## Langues du site

Le site se traduit en **9 langues** : français (par défaut), anglais, espagnol, arabe (lecture de droite à gauche), chinois mandarin, hindi, wolof, bambara et haoussa. Un sélecteur 🌐 est dans la barre de navigation et en bas de page ; le choix est mémorisé dans le navigateur. Les prix, nombres et dates suivent la langue.

- **Où sont les traductions ?** `frontend/src/i18n/dictionary.js` : une ligne par phrase, colonnes dans l'ordre *fr · en · es · ar · zh · hi · wo · bm · ha*. Pour corriger une traduction, modifiez la ligne ; pour traduire une nouvelle phrase, écrivez-la dans le code avec `t('Votre phrase')` (hook `const { t } = useI18n();`) puis ajoutez sa ligne au dictionnaire. Les variables s'écrivent `{n}`, `{name}`…
- **Phrase non traduite** : elle s'affiche en français (ou en anglais pour l'hindi et le haoussa) — rien ne casse.
- **Couverture** : anglais, espagnol, arabe, chinois et hindi sont complets pour la boutique. Le **wolof, le bambara et le haoussa ne couvrent que le vocabulaire essentiel** (navigation, panier, boutons) : faites-les relire par des locuteurs natifs avant de les promouvoir.
- **Non traduit** : les noms et descriptions des produits, les vendeurs et les bannières (contenus saisis en français dans l'administration), l'espace administrateur, et la plupart des messages d'erreur détaillés du serveur.
- Ajouter une langue : une entrée dans `i18n/languages.js` et une colonne dans `dictionary.js`.

## Administrateur du projet et sous-administrateurs

Trois rôles : **client**, **sous-administrateur** (droits limités) et **administrateur du projet** (tous les droits).

- L'administrateur du projet dispose d'un **sous-espace réservé** (menu « Administration du projet ») :
  - **Équipe et droits** (`/admin/equipe`) : créer des sous-administrateurs, choisir les rubriques auxquelles ils ont accès (tableau de bord, catalogue, commandes, devis, clients, codes promo, avis, paramètres), suspendre, réinitialiser le mot de passe ou retirer un membre ;
  - **Journal d'activité** (`/admin/journal`) : qui a créé, modifié ou supprimé quoi, et quand (les mots de passe ne sont jamais enregistrés).
- Un sous-administrateur ne voit dans le menu que ses rubriques ; l'API refuse (403) tout le reste, y compris l'équipe et le journal, qui sont invisibles pour lui.
- **Mise à jour d'une base existante** : au démarrage, si aucun administrateur du projet n'existe, le compte indiqué par `OWNER_EMAIL` (sinon le plus ancien administrateur) le devient automatiquement. Les anciens administrateurs gardent tous leurs droits jusqu'à ce que vous les restreigniez.

**Images des produits** : les 128 produits du catalogue ont une image (`frontend/public/produits/`). Ce sont des illustrations (icône sur fond de couleur) et non des photos : remplacez-les par vos vraies photos depuis *Admin → Produits*. Le script `scripts/generate-product-images.py` les régénère.

## Espace administrateur
Accessible sur `/admin` (barre latérale, adaptée au mobile) :
- **Tableau de bord** : chiffre d'affaires, commandes, panier moyen et nouveaux clients avec l'évolution par rapport à la période précédente (7 / 30 / 90 jours), courbe des ventes avec infobulle, meilleurs produits, ventes par catégorie, commandes par statut, alertes de stock, dernières commandes.
- **Produits** : recherche, filtres (catégorie, stock bas, épuisés, masqués), pagination, publication en un clic, duplication ; formulaire complet : images multiples, prix barré, vente flash, prix dégressifs, MOQ, caractéristiques, vendeur, livraison gratuite, sélection, aperçu en direct.
- **Catégories** (avec icône), **Vendeurs**, **Bannières** (avec image), **Codes promo**, **Avis clients** (modération).
- **Commandes** : onglets par statut avec compteurs, recherche (n°, client, téléphone), période, panneau de détail avec suivi, note interne, facture, export CSV.
- **Devis et messages** : boîte de réception avec réponses et statuts.
- **Clients** : total dépensé, dernière commande, historique, suspension de compte.
- **Paramètres** : nom, bandeau d'annonce, frais de livraison, seuil de livraison gratuite, délai de retour, seuil de stock bas.

## API
| Méthode | Route | Accès |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public |
| GET / PUT | /api/auth/profile | connecté |
| GET | /api/products?scope=official|market&market=<slug>&search=&category=&minPrice=&maxPrice=&minRating=&freeShipping=1&inStock=1&promo=1&flash=1&sort=&page=&limit= | public (sans `page` : tableau ; avec `page` : `{ items, total, page, pages }`) |
| GET | /api/products/suggest?q= | public (suggestions de recherche) |
| GET | /api/products/:id/related | public |
| POST | /api/products/:id/duplicate | admin |
| GET | /api/products/:id | public |
| POST / PUT / DELETE | /api/products, /api/products/:id | admin |
| POST | /api/products/upload | admin |
| GET | /api/categories | public |
| POST / PUT / DELETE | /api/categories, /api/categories/:id | admin |
| GET | /api/orders?status=&q=&from=&to=&page= | admin |
| GET | /api/orders/export | admin (CSV) |
| GET | /api/orders/mine | connecté (mes commandes) |
| POST | /api/orders | connecté |
| GET | /api/orders/:id | propriétaire ou admin |
| POST | /api/orders/:id/return | client (demande de retour, commande livrée) |
| PUT | /api/orders/:id/return | admin (accepter, refuser, rembourser) |
| PUT | /api/orders/:id | admin (statut, note interne) ; client (annuler si en attente) |
| GET | /api/stats?days=7\|30\|90 | admin (indicateurs, ventes, alertes) |
| GET | /api/stats/summary | admin (pastilles de la barre latérale) |
| GET / PUT / DELETE | /api/users, /api/users/:id | admin (clients, suspension) |
| POST / GET | /api/inquiries, /api/inquiries/mine | connecté (devis, questions) |
| GET / PUT | /api/inquiries, /api/inquiries/:id | admin (boîte de réception, statut) |
| POST | /api/inquiries/:id/messages | propriétaire ou admin |
| POST | /api/seller/shop | client (ouvrir sa boutique) |
| GET / PUT | /api/seller/shop, /stats, /earnings, /products, /orders, /inquiries | vendeur (limité à sa boutique) |
| GET / PUT / POST | /api/shops, /api/shops/:id/status, /ledger, /settlements | admin (droit « boutiques ») |
| GET | /api/markets, /api/markets/:slug | public (marchés et leurs boutiques) |
| POST / PUT / DELETE | /api/markets | admin (droit « boutiques ») |
| GET | /api/auth/providers, /api/auth/oauth/:provider(/callback) | public (connexion Google / Facebook / GitHub) |
| GET | /api/suppliers/directory?q=&verified=1&category= | public (annuaire) |
| GET | /api/suppliers/:id/profile | public (boutique d'un vendeur) |
| GET / POST / PUT / DELETE | /api/suppliers | admin |
| GET | /api/banners | public (actives) ; admin avec `?all=1` |
| POST / PUT / DELETE | /api/banners | admin |
| GET / PUT | /api/settings | public (lecture) ; admin (modification) |
| GET | /api/reviews | admin (modération) |
| POST | /api/coupons/validate | connecté |
| GET / POST / PUT / DELETE | /api/coupons, /api/coupons/:id | admin |
| GET | /api/products/:id/reviews | public |
| POST | /api/products/:id/reviews | client ayant reçu le produit |
| DELETE | /api/reviews/:id | auteur ou admin |
| GET | /api/favorites | connecté |
| PUT / DELETE | /api/favorites/:productId | connecté |
| GET | /api/health | public (contrôle de santé) |

## Structure
```
backend/   app.js, server.js, config, models (User, Product, Category, Order, Coupon, Review, Supplier, Banner, Settings, Inquiry), controllers, routes, middleware, utils, tests, seed.js
frontend/  src/pages (+ admin), components, context (Auth, Cart, Favorites, Settings), api.js, styles.css, store.css, admin.css
docker-compose.yml, render.yaml, .github/workflows/ci.yml
```

## Tests
```bash
cd backend
npm install
npm test
```
Jest + Supertest, avec une base MongoDB en mémoire (`mongodb-memory-server` télécharge un binaire MongoDB au premier lancement, une connexion Internet est donc nécessaire la première fois). Ils couvrent l'authentification et les rôles, le calcul des commandes côté serveur, le stock, les codes promo (expiration, minimum, épuisement, annulation), les avis, les favoris et les statistiques. L'intégration continue (GitHub Actions) lance les tests et le build du frontend à chaque push.

## Déploiement

### Docker (tout-en-un)
```bash
cp .env.docker.example .env      # puis changez JWT_SECRET
docker compose up --build
docker compose exec backend node seed.js --force   # données de démonstration (efface la base)
```
La boutique est disponible sur http://localhost:8080 (nginx sert le frontend et redirige `/api` et `/uploads` vers le backend). MongoDB et les images envoyées sont conservées dans des volumes Docker.

### Render + MongoDB Atlas
1. Créez un cluster gratuit sur MongoDB Atlas et récupérez l'URI de connexion (autorisez l'accès réseau depuis Render).
2. Poussez le projet sur GitHub, puis sur Render : *New → Blueprint* (le fichier `render.yaml` crée l'API et le site statique).
3. Renseignez `MONGO_URI`, `CLIENT_URL` (URL du site) et `VITE_API_URL` (URL de l'API, sans `/api`), puis redéployez le site statique pour que la variable soit prise en compte.
4. Pour une **démonstration seulement**, lancez le seed une fois (onglet *Shell* du service API : `node seed.js --force`, car le seed refuse de tourner en production sans `--force`), puis **changez tous les mots de passe des comptes de démonstration** (idéalement : ne jamais le lancer sur la vraie boutique).

Les images envoyées sont stockées sur le disque du serveur : sur Render, il faut un disque persistant (offre payante, déjà prévu dans `render.yaml`), sinon elles disparaissent à chaque redéploiement. Pour éviter cette contrainte, utilisez des URL d'images externes ou un stockage type Cloudinary.

### Vercel pour le frontend
Importez le dossier `frontend`, définissez `VITE_API_URL` avec l'URL du backend ; `vercel.json` gère les routes React Router. Définissez aussi `CLIENT_URL` côté backend avec l'URL Vercel (CORS).

## Idées pour aller plus loin
Stock par variante, paiement en ligne (Wave, Orange Money, Stripe — aujourd'hui le mode choisi est seulement enregistré, le paiement se fait à la livraison), notifications par e-mail ou SMS, recherche par image, demandes de retour, stockage d'images externe (Cloudinary), limitation de débit et en-têtes de sécurité (helmet).
