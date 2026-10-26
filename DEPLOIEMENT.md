# Déployer Boutik

Trois façons de mettre le site en ligne. Choisissez-en une.

| | **A. Render + MongoDB Atlas** | **B. Serveur (VPS) avec Docker** | **C. Vercel + Render** |
|---|---|---|---|
| Difficulté | ⭐ la plus simple | ⭐⭐ | ⭐⭐ |
| Coût de départ | Gratuit (avec limites) | ≈ 5 €/mois | Gratuit (avec limites) |
| Images envoyées conservées | Seulement avec un disque payant | ✅ oui (volume Docker) | Seulement avec un disque payant |
| HTTPS | ✅ automatique | ✅ avec Caddy (automatique) | ✅ automatique |
| Pour qui | Démarrer vite, tester avec de vrais clients | Boutique sérieuse, tout sous votre contrôle | Si vous aimez Vercel pour le site |

> **Limites du gratuit sur Render** : le serveur « s'endort » après un moment sans visite (le premier visiteur attend ~30 s), et **les images envoyées par vos vendeurs sont effacées à chaque redéploiement** sans disque persistant (offre payante). Pour une vraie boutique, prenez le disque (option A payante) ou le serveur (option B).

---

## 0. Avant de commencer

1. **Testez** chez vous : `cd backend && npm install && npm test`, puis `cd ../frontend && npm install && npm run build`. Tout doit passer.
2. **Mettez à jour multer** (failles connues de la version 1) : `cd backend && npm install multer@2 && npm audit fix`, puis relancez les tests et validez (`git commit`).
3. **Changez les secrets**. Si le fichier `backend/.env` d'origine (avec son mot de passe MongoDB) a déjà été partagé ou publié sur GitHub, **changez le mot de passe de la base** dans Atlas. Ne publiez jamais `.env` : il est dans `.gitignore`.
4. Mettez le projet sur **GitHub** (dépôt privé de préférence) : `git init && git add . && git commit -m "Boutik" && git remote add origin … && git push`.

## 1. La base de données (MongoDB Atlas, gratuit)

1. Créez un compte sur **mongodb.com/atlas** → *Create* → cluster gratuit **M0**, région proche de vos clients (Europe, par exemple).
2. **Database Access** → *Add New Database User* : un nom d'utilisateur et un **mot de passe long** (évitez `@ : / ?` ; sinon encodez-les dans l'adresse). Droit « Read and write to any database ».
3. **Network Access** → *Add IP Address* :
   - serveur fixe (option B) : l'adresse IP de votre serveur uniquement ;
   - Render : Render publie les plages d'adresses sortantes de sa région (à autoriser dans Atlas) ; à défaut `0.0.0.0/0` **avec un mot de passe très long**.
4. **Database** → *Connect* → *Drivers* : copiez l'adresse, par exemple  
   `mongodb+srv://utilisateur:motdepasse@cluster0.xxxxx.mongodb.net/ecommerce?retryWrites=true&w=majority`  
   (remplacez `<password>`, et gardez `/ecommerce` : c'est le nom de la base). C'est votre **`MONGO_URI`**.
5. Activez les **sauvegardes** (Atlas → *Backup*) dès que vous avez de vrais clients.

## 2. Option A : Render (le plus simple)

1. Créez un compte sur **render.com** et reliez votre GitHub.
2. **New + → Blueprint** → choisissez votre dépôt. Render lit `render.yaml` et crée **deux services** : `boutik-api` (le serveur) et `boutik-web` (le site).
3. Renseignez les variables demandées :

| Service | Variable | Valeur |
|---|---|---|
| boutik-api | `MONGO_URI` | l'adresse Atlas de l'étape 1 |
| boutik-api | `JWT_SECRET` | généré automatiquement par Render (32 caractères ou plus) |
| boutik-api | `CLIENT_URL` | l'adresse du site, **sans « / » final**, ex. `https://boutik-web.onrender.com` |
| boutik-api | `API_URL` | l'adresse de l'API, ex. `https://boutik-api.onrender.com` |
| boutik-web | `VITE_API_URL` | l'adresse de l'API, **sans `/api`**, ex. `https://boutik-api.onrender.com` |

   Les adresses exactes ne sont connues qu'après la création : lancez une première fois, notez-les, puis complétez les variables et faites **Manual Deploy** (le site doit être reconstruit après avoir fixé `VITE_API_URL`).
4. **Images envoyées** : dans `render.yaml`, le disque `uploads` (1 Go, offre payante) conserve les images. Sans lui, passez à l'étape suivante en sachant que les photos envoyées disparaîtront au prochain déploiement.
5. **Sécurité des en-têtes** : dans `render.yaml` (service `boutik-web`), remplacez `connect-src 'self' https:` par `connect-src 'self' https://boutik-api.onrender.com` (votre API), puis redéployez.
6. Vérifiez : ouvrez `https://boutik-api.onrender.com/api/health` → `{"status":"ok"…}`, puis le site.
7. Passez à **« 5. Après le déploiement »**.

## 3. Option B : serveur (VPS) avec Docker Compose

Sur un petit serveur Linux (Ubuntu 22.04/24.04, 1 Go de mémoire suffit pour démarrer) chez Hetzner, OVH, DigitalOcean, Contabo…

1. **Installez Docker** : `curl -fsSL https://get.docker.com | sh` (puis `sudo usermod -aG docker $USER` et reconnectez-vous).
2. **Pare-feu** : n'ouvrez que 22, 80 et 443 : `sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable`.
3. **Copiez le projet** sur le serveur (`git clone …`), puis :
   ```bash
   cp .env.docker.example .env
   nano .env     # JWT_SECRET (32+ caractères), CLIENT_URL, API_URL, TRUST_PROXY…
   ```
   Générer un secret : `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` (ou `openssl rand -hex 48`).
4. **Domaine + HTTPS (Caddy)** : pointez votre domaine vers l'adresse IP du serveur (enregistrement DNS « A »), installez Caddy (caddyserver.com/docs/install), copiez `Caddyfile.example` vers `/etc/caddy/Caddyfile` en mettant votre domaine, `sudo systemctl reload caddy`. Dans `.env` : `CLIENT_URL=https://votre-domaine.com`, `API_URL=https://votre-domaine.com`, **`TRUST_PROXY=2`**. Dans `docker-compose.yml`, remplacez `"8080:80"` par `"127.0.0.1:8080:80"` pour que seul Caddy soit exposé.
5. **Démarrez** : `docker compose up -d --build`. Vérifiez : `curl https://votre-domaine.com/api/health`.
6. Passez à **« 5. Après le déploiement »**, en remplaçant `npm run …` par `docker compose exec backend node …` (voir les commandes en bas).
7. **Sauvegardes** (à automatiser avec `cron`) :
   ```bash
   docker compose exec -T mongo mongodump --db ecommerce --archive --gzip > sauvegarde-$(date +%F).gz
   docker run --rm -v boutik_uploads-data:/d -v $PWD:/b alpine tar czf /b/images-$(date +%F).tgz -C /d .
   ```
   Restaurer : `docker compose exec -T mongo mongorestore --archive --gzip --drop < sauvegarde.gz`. Copiez ces fichiers **hors du serveur**.
8. **Mettre à jour** : `git pull && docker compose up -d --build`.

## 4. Option C : Vercel (site) + Render (API)

1. Déployez l'API sur Render comme en **A** (créez seulement le service `boutik-api`, en supprimant `boutik-web` du Blueprint).
2. Sur **vercel.com** : *Add New → Project* → votre dépôt → **Root Directory : `frontend`**. Variable d'environnement : `VITE_API_URL` = l'adresse de l'API (sans `/api`).
3. Notez l'adresse Vercel et mettez-la dans `CLIENT_URL` du service Render (plusieurs adresses possibles, séparées par des virgules : domaine personnalisé + `…vercel.app`), puis redéployez l'API.
4. `frontend/vercel.json` envoie déjà les en-têtes de sécurité ; remplacez `connect-src 'self' https:` par l'adresse de votre API.

## 5. Après le déploiement (toutes les options)

### Créer votre compte administrateur
> ⚠️ **N'utilisez jamais `seed.js` en production** : il efface la base et crée des comptes aux mots de passe publics. Il refuse d'ailleurs de tourner sans `--force`.

Depuis **votre ordinateur** (le plus simple sur Render gratuit, qui n'a pas de console) :
```bash
cd backend && npm install
MONGO_URI='mongodb+srv://…/ecommerce?…' ADMIN_EMAIL=moi@exemple.com ADMIN_PASSWORD='MotDePasse2026' ADMIN_NAME='Mon Nom' npm run admin:create
MONGO_URI='mongodb+srv://…/ecommerce?…' npm run seed:catalog     # rayons, ~190 produits, images, têtes de gondole (sans rien effacer)
```
(Sous Windows PowerShell : `$env:MONGO_URI='…'; $env:ADMIN_EMAIL='…'; … ; npm run admin:create`.)  
Avec Docker : `docker compose exec -e ADMIN_EMAIL=… -e ADMIN_PASSWORD=… backend node create-admin.js` puis `docker compose exec backend node seed-products.js`.

> Les produits du catalogue n'ont que des **illustrations** : remplacez-les par vos vraies photos dans *Admin → Produits*. Supprimez ou modifiez ce qui ne vous concerne pas.

### Réglages à faire dans l'administration
1. Connectez-vous avec votre compte puis **activez la double authentification** (Mon profil → Sécurité du compte).
2. *Admin → Paramètres* : nom de la boutique, contact, frais de livraison, seuil de livraison gratuite, délai de retour, **commission des vendeurs**, validation automatique ou manuelle des nouvelles boutiques.
3. *Admin → Bannières*, *Marchés*, *Rayons*, *Planogramme*, *Têtes de gondole* : adaptez à votre boutique.

### Connexion Google / Facebook / GitHub (facultatif)
Créez l'application chez chaque fournisseur (voir le README) avec l'adresse de retour `<API_URL>/api/auth/oauth/<google|facebook|github>/callback`, puis ajoutez les identifiants dans les variables d'environnement du serveur (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, …). Google : publiez l'écran de consentement ; Facebook : passez l'application en mode « Live ».

### Liste de contrôle finale
- [ ] `https://…/api/health` répond `ok`, le site s'ouvre en **HTTPS**.
- [ ] Inscription d'un compte client test, connexion, ajout au panier, **commande test**, puis statut « Livrée » côté admin.
- [ ] Envoi d'une image produit : elle s'affiche **et reste** après un redéploiement (sinon : disque persistant manquant).
- [ ] Connexion admin avec double authentification ; un client ne peut pas ouvrir `/admin`.
- [ ] `JWT_SECRET` long et secret, `NODE_ENV=production`, aucun mot de passe de démonstration.
- [ ] Atlas : adresses autorisées limitées, sauvegardes actives.
- [ ] Nom de domaine personnalisé et `CLIENT_URL` / `API_URL` à jour.

## 6. Problèmes fréquents

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le serveur s'arrête au démarrage avec « JWT_SECRET » | Secret absent, trop court (< 32 caractères) ou valeur d'exemple | Mettez un secret aléatoire de 32 caractères ou plus |
| Le site s'ouvre mais « Network Error » / erreur CORS | `CLIENT_URL` ≠ adresse réelle du site (« / » final, `http` au lieu de `https`, `www`) | Corrigez `CLIENT_URL` (plusieurs adresses possibles, séparées par des virgules) et redéployez l'API |
| Le site appelle `localhost` ou l'API introuvable | `VITE_API_URL` manquante au moment de la construction | Renseignez-la, puis **reconstruisez** le site |
| `MongooseServerSelectionError` / « timed out » | Adresse du serveur non autorisée dans Atlas, ou mauvais mot de passe dans `MONGO_URI` | Corrigez *Network Access* ; encodez les caractères spéciaux du mot de passe |
| Images produits cassées ou disparues | Pas de disque persistant, ou `UPLOADS_DIR` mal monté | Disque Render payant ou volume Docker ; ne pas changer `UPLOADS_DIR` |
| « Trop de requêtes » pour tout le monde | Le serveur voit l'adresse du proxy au lieu de celle du visiteur | `TRUST_PROXY=2` si un proxy (Caddy, Cloudflare) est devant nginx |
| `redirect_uri_mismatch` en se connectant avec Google/GitHub | Adresse de retour mal déclarée chez le fournisseur | Utilisez exactement `<API_URL>/api/auth/oauth/<fournisseur>/callback` |
| Premier chargement très lent sur Render gratuit | Le service était endormi | Normal ; offre payante, ou un service de « ping » régulier |
| Impossible de se connecter à l'admin | Aucun administrateur créé (le seed est bloqué en production) | `npm run admin:create` (voir 5) |

**Pas (encore) géré** : l'envoi d'emails (vérification d'adresse, mot de passe oublié, confirmations de commande) et le paiement en ligne (Wave, Orange Money, carte) : ils demandent un service tiers et vos identifiants.
