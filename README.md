# SAHAL SHOP — Application de gestion de boutique

Application mobile de **point de vente et gestion de stock** pour la boutique SAHAL SHOP.
Elle réunit la caisse, le stock, les ventes à crédit, les clients, les dépenses et un tableau de bord financier, avec **facture PDF** pour chaque vente.

- **Mobile** : React Native / Expo SDK 58, React Navigation, stockage sécurisé de la session.
- **API** : Node.js / Express 5, MongoDB Atlas / Mongoose 9, JWT, PDFKit.
- **Langue** : interface et documents en français, montants en **FCFA (XOF)**.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration de l'API](#configuration-de-lapi)
- [Comptes et données de démonstration](#comptes-et-données-de-démonstration)
- [Calculs du tableau de bord](#calculs-du-tableau-de-bord)
- [API REST](#api-rest)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Sécurité](#sécurité)
- [Limites connues](#limites-connues)

---

## Fonctionnalités

### Caisse et ventes
- Panier multi-articles, remise, paiement comptant, Mobile Money, banque ou **crédit**.
- Décrémentation atomique du stock à la vente (transactions MongoDB).
- Numéro de vente et **numéro de facture uniques**.
- Facture **PDF** téléchargeable et partageable depuis l'application.
- Annulation d'une vente par un administrateur : stock restauré et dette client annulée.

### Stock
- Fiches articles : prix d'achat, prix de vente, catégorie, unité, seuil d'alerte.
- Entrées / sorties / ajustements manuels avec journal des mouvements.
- **Pertes d'articles** (casse, vol, péremption) : stock décrémenté et perte valorisée au prix d'achat.
- Archivage des articles au lieu d'une suppression destructive.

### Clients et crédit
- Fiches clients, limite de crédit, solde de dette.
- Remboursements **totaux ou partiels**, avec historique (journal client).
- Suppression bloquée tant que le client a une dette.

### Dépenses
- Catégories : carburant, salaire employé, livraison, loyer, eau/électricité, fournitures, maintenance, taxes, autres.
- Ajout, modification et suppression des dépenses.

### Tableau de bord
- Périodes : aujourd'hui, semaine, mois, année, ou plage personnalisée.
- CA net, bénéfice brut, bénéfice net, dépenses, pertes, encaissements, créances.
- Graphique d'évolution et ventes récentes.
- Rechargement à chaque retour sur l'écran et par geste de rafraîchissement.

### Administration
- Rôles **admin** et **employé**.
- L'admin crée, modifie, active/désactive et supprime les utilisateurs.
- Mot de passe **libre** : aucune règle de complexité, seul le caractère non vide est exigé.
- Le dernier administrateur actif est protégé, ainsi que son propre compte.

---

## Architecture

```text
2026_11_12___SAHAL_APK/
├── backend/                      API Express + MongoDB
│   ├── assets/logo.jpeg          Logo utilisé dans les factures PDF
│   ├── scripts/smoke-test.js     Test de fumée de bout en bout
│   ├── src/
│   │   ├── config/               env, connexion MongoDB
│   │   ├── controllers/          auth, users, articles, ventes, clients, dépenses, pertes, dashboard
│   │   ├── middleware/           JWT, rôles, erreurs, rate limiting
│   │   ├── models/               User, Article, Sale, Customer, CreditTransaction…
│   │   ├── routes/               Routes /api/*
│   │   ├── seed/seed.js          Création de l'admin + jeu de démonstration optionnel
│   │   ├── services/invoice.service.js
│   │   ├── utils/                dates, pagination, erreurs, séquences
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── mobile/                       Application Expo
│   ├── assets/                   Logo, icône, splash
│   ├── src/
│   │   ├── api/                  client HTTP, détection de l'URL, services
│   │   ├── components/           composants UI réutilisables
│   │   ├── context/AuthContext.js
│   │   ├── navigation/           tabs + stack natif
│   │   ├── screens/              tous les écrans
│   │   ├── utils/format.js
│   │   └── theme.js
│   ├── App.js
│   ├── app.json
│   └── eas.json
├── logo.jpeg                     Logo source
├── render.yaml                   Blueprint de déploiement Render
└── README.md
```

---

## Démarrage rapide

### Prérequis
- Node.js **>= 20**
- Un cluster **MongoDB Atlas** (les transactions nécessitent un replica set, fourni par Atlas)
- L'application **Expo Go** sur le téléphone, ou un émulateur Android/iOS

### 1. API

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Renseigner dans `backend/.env` :

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
MONGODB_DB=sahal_shop
JWT_SECRET=<chaîne aléatoire longue>
ADMIN_USERNAME=cherif
ADMIN_PASSWORD=<mot de passe libre>
```

Puis initialiser l'administrateur et démarrer :

```powershell
npm run seed
npm run dev
```

L'API écoute sur `http://localhost:5000/api` et expose `GET /api/health`.

> Les transactions MongoDB exigent Atlas. Un simple `mongod` local sans replica set fera échouer les ventes, pertes et paiements.

### 2. Application mobile

```powershell
cd mobile
npm ci
npx expo start
```

Au premier lancement, l'application déduit l'adresse de l'API depuis l'hôte Expo et utilise le port `5000`.
Si nécessaire, toucher **« Serveur : … »** sur l'écran de connexion et saisir :

```text
http://<IP-du-PC>:5000/api
```

Le téléphone et le PC doivent être sur le **même réseau Wi-Fi**. Sur un émulateur Android, l'adresse de repli est `http://10.0.2.2:5000/api`.

Se connecter avec l'administrateur créé par `npm run seed`.

---

## Configuration de l'API

L'URL est résolue dans cet ordre (`mobile/src/api/config.js`) :

1. URL enregistrée depuis l'écran de connexion (AsyncStorage).
2. Variable d'environnement `EXPO_PUBLIC_API_URL`.
3. Hôte du serveur Expo en développement + port `5000`.
4. Repli émulateur (`10.0.2.2` sur Android, `localhost` sur iOS).

Pour un build autonome, fournir une URL publique **au moment du build** :

```powershell
$env:EXPO_PUBLIC_API_URL="https://sahal-shop-api.vercel.app/api"
npx eas-cli build --profile preview --platform android
```

Ou déclarer la variable dans les variables d'environnement EAS du projet (`eas env:set preview --name EXPO_PUBLIC_API_URL ...`).

> Le build Android autorise le trafic HTTP en clair (`expo-build-properties`) pour faciliter les tests sur le réseau local.
> En production, utiliser une URL **HTTPS** et vous pouvez retirer `usesCleartextTraffic` de `mobile/app.json`.

---

## Comptes et données de démonstration

Le seed crée uniquement l'administrateur par défaut :

| Identifiant | Mot de passe |
|---|---|
| `cherif` | `admin123` |

**Changez ce mot de passe dès la mise en service** (écran Profil ou `backend/.env` avant le seed).

Pour ajouter un jeu de démonstration (articles, clients, ventes, dépenses, pertes) :

```powershell
$env:SEED_DEMO="true"; npm run seed
```

Sous macOS/Linux : `SEED_DEMO=true npm run seed`.

---

## Calculs du tableau de bord

Pour la période sélectionnée :

- **CA net** = somme des totaux des ventes `completed` (remises déduites).
- **Bénéfice brut** = CA net − coût d'achat des articles vendus (prix d'achat figé au moment de la vente).
- **Bénéfice net** = bénéfice brut − dépenses − pertes valorisées.
- **Encaissements** = paiements des ventes comptant + acomptes + remboursements de dettes.
- **Créances** = somme des soldes clients restants.

Les bornes de dates sont interprétées dans le fuseau du serveur. Le projet est configuré pour Dakar (`Africa/Dakar`, UTC+0) ; un serveur déployé en UTC produit donc les mêmes journées qu'au Sénégal.

---

## API REST

Toutes les routes sont préfixées par `/api`. Sauf `login` et `health`, elles exigent :

```http
Authorization: Bearer <token JWT>
```

### Authentification et comptes
| Méthode | Route | Accès |
|---|---|---|
| `POST` | `/auth/login` | public |
| `GET` | `/auth/me` | connecté |
| `PUT` | `/auth/profile` | connecté |
| `PUT` | `/auth/password` | connecté |
| `GET/POST` | `/users` | admin |
| `PUT/DELETE` | `/users/:id` | admin |

### Articles et stock
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/articles` | liste, recherche, filtre catégorie / stock bas |
| `GET` | `/articles/categories` | catégories utilisées |
| `GET` | `/articles/:id` | fiche + mouvements |
| `POST` | `/articles` | création |
| `PUT` | `/articles/:id` | modification |
| `POST` | `/articles/:id/stock` | entrée / sortie / ajustement |
| `DELETE` | `/articles/:id` | archivage |

### Ventes et factures
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/sales` | liste filtrable |
| `POST` | `/sales` | créer une vente |
| `GET` | `/sales/:id` | détail |
| `GET` | `/sales/:id/invoice` | **PDF de la facture** |
| `POST` | `/sales/:id/cancel` | annulation (admin) |

Exemple de vente à crédit :

```json
{
  "items": [{ "articleId": "…", "quantity": 2 }],
  "customerId": "…",
  "paymentType": "credit",
  "amountPaid": 1000,
  "discount": 0,
  "note": ""
}
```

### Clients et crédit
| Méthode | Route | Description |
|---|---|---|
| `GET/POST` | `/customers` | liste / création |
| `GET/PUT/DELETE` | `/customers/:id` | fiche / modification / suppression si solde nul |
| `GET` | `/customers/:id/ledger` | journal des crédits et paiements |
| `POST` | `/customers/:id/payments` | remboursement partiel ou total |

### Dépenses et pertes
| Méthode | Route | Description |
|---|---|---|
| `GET/POST` | `/expenses` | liste / création |
| `GET` | `/expenses/categories` | catégories |
| `PUT/DELETE` | `/expenses/:id` | modification / suppression |
| `GET/POST` | `/losses` | liste / déclaration de perte |

### Tableau de bord et métadonnées
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/dashboard?startDate=AAAA-MM-JJ&endDate=AAAA-MM-JJ` | indicateurs + séries |
| `GET` | `/dashboard/quick` | compteurs rapides |
| `GET` | `/meta` | infos boutique, catégories, moyens de paiement |
| `GET` | `/health` | état de l'API (public) |

---

## Tests

Le test de fumée utilise la base Atlas configurée, crée des enregistrements temporaires puis les supprime :

```powershell
cd backend
npm run smoke
```

Il vérifie notamment : connexion, rôles, CRUD utilisateur, article et stock, vente à crédit, génération PDF, remboursement et journal client, dépense, perte, dashboard, annulation de vente, restauration du stock et de la dette.

La compilation du bundle mobile peut être contrôlée sans appareil :

```powershell
cd mobile
npx expo export --platform android --output-dir dist-check
```

---

## API publique et build Android

Le backend est déployé sur **Vercel** :

- API : `https://sahal-shop-api.vercel.app/api`
- Santé : `https://sahal-shop-api.vercel.app/api/health`

L'APK **preview** `1.1.0` pointe directement vers cette API publique. Il fonctionne donc hors du réseau local, sans lancer le backend sur le poste de développement.

- Téléchargement direct (lien stable) : `https://github.com/cherifcoder/sahalshopmobile/releases/download/v1.1.0/sahal-shop-1.1.0.apk`
- Page de la release : `https://github.com/cherifcoder/sahalshopmobile/releases/tag/v1.1.0`
- Page du build : `https://expo.dev/accounts/cherifcoder/projects/sahalshop/builds/c5560a02-fa4d-4abf-acaf-55221b41b9a9`
- Signature Android vérifiée (schéma v2), `package` : `com.sahalshop.app`
- Version : `1.1.0` (`versionCode` 2), runtime EAS `1.1.0`

Installation sur Android :

1. Ouvrir le lien de téléchargement depuis le téléphone.
2. Télécharger `sahal-shop-1.1.0.apk`.
3. Autoriser l'installation depuis le navigateur ou le gestionnaire de fichiers si Android le demande.
4. Ouvrir **SAHAL SHOP** et se connecter avec `cherif` / `admin123`.

> L'APK est signé mais distribué hors Play Store : Android affiche un avertissement d'installation normale.
> Changer le mot de passe administrateur avant une utilisation en production.

### Ouvrir l'application dans Expo Go (EAS Update)

Une mise à jour JavaScript a été publiée sur le canal `preview` le 12 novembre 2026 :

- Lien QR Expo Go : `https://qr.expo.dev/eas-update?projectId=8ea3a6ee-f299-42aa-b9ab-486db14b4314&runtimeVersion=1.1.0&channel=preview`
- Lien direct (à ouvrir sur le téléphone) : `exp://u.expo.dev/8ea3a6ee-f299-42aa-b9ab-486db14b4314?runtime-version=1.1.0&channel-name=preview`
- Page EAS Update : `https://expo.dev/accounts/cherifcoder/projects/sahalshop/updates/83fbde03-fdc7-449f-8b7c-80af09d99f19`

Prérequis :

1. Installer **Expo Go** (version SDK 58) sur le téléphone.
2. L'API Vercel est publique : aucun réseau local ni backend local n'est nécessaire.

> Le lien Expo Go charge le bundle JavaScript publié ; il ne remplace pas l'APK. L'APK `preview` reste utilisable indépendamment.

---

## Déploiement

### GitHub

Le dépôt cible est `https://github.com/cherifcoder/sahalshopmobile`.

```powershell
git init
git add .
git commit -m "SAHAL SHOP : application mobile et API"
git branch -M main
git remote add origin https://github.com/cherifcoder/sahalshopmobile.git
git push -u origin main
```

Le fichier `backend/.env` est ignoré : ne jamais committer de secret.

### API publique (Vercel)

Le backend est déployé sur Vercel dans le projet `sahal-shop-api` :

- URL de production : `https://sahal-shop-api.vercel.app`
- Santé : `https://sahal-shop-api.vercel.app/api/health`
- Déploiement : `cd backend && npx vercel deploy --prod --yes`

Vercel détecte l'application Express via `src/app.js`. La connexion MongoDB est établie de façon idempotente par `ensureDatabase()` pour être réutilisée entre les invocations serverless.

Variables d'environnement à définir dans **Vercel → Project → Settings → Environment Variables** : `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `SHOP_*`, `CURRENCY`, `CURRENCY_LABEL`, `TIMEZONE`.

Dans MongoDB Atlas → **Network Access**, autoriser les connexions depuis Vercel. Pour un déploiement de démonstration, l'entrée `0.0.0.0/0` fonctionne ; pour la production, restreindre aux plages d'IP de Vercel ou utiliser Vercel Secure Compute.

> La première requête après un cold start peut prendre quelques secondes (connexion Atlas).

### API publique (Render, alternative)

Le fichier `render.yaml` décrit un service Node gratuit à la racine du dépôt.

1. Sur Render : **New → Blueprint**, sélectionner le dépôt GitHub.
2. Renseigner `MONGODB_URI` (et éventuellement les coordonnées de la boutique).
3. Déployer, puis vérifier `https://<service>.onrender.com/api/health`.
4. Dans Atlas, autoriser les connexions du service (réseau Render) dans **Network Access**.
5. Reporter l'URL `https://<service>.onrender.com/api` dans l'application (écran Serveur ou variable EAS).

> Les offres gratuites peuvent mettre le service en veille : la première requête après une pause peut prendre quelques secondes.

### Application Expo / EAS

Le projet Expo cible est `https://expo.dev/accounts/cherifcoder/projects/sahalshop`.
Il est déjà lié au projet EAS `8ea3a6ee-f299-42aa-b9ab-486db14b4314`.

```powershell
cd mobile
npx eas-cli login
npx eas-cli init --account cherifcoder
```

Puis, avec `EXPO_PUBLIC_API_URL` défini :

```powershell
# URL de l'API Vercel pour le build preview
npx eas-cli env:set preview --name EXPO_PUBLIC_API_URL --value "https://sahal-shop-api.vercel.app/api" --visibility plaintext --non-interactive

# APK de test à installer directement
npx eas-cli build --profile preview --platform android

# Build de production (AAB pour le Play Store)
npx eas-cli build --profile production --platform android
```

Les profils `preview` et `production` de `mobile/eas.json` déclarent respectivement `"environment": "preview"` et `"environment": "production"`, ce qui charge automatiquement les variables EAS correspondantes.

Mises à jour JavaScript sans recompilation native :

```powershell
# Publier sur le canal preview (variable EXPO_PUBLIC_API_URL de l'environnement EAS preview)
npx eas-cli update --channel preview --environment preview --message "Correctifs SAHAL SHOP"

# Publier sur le canal production
npx eas-cli update --channel production --environment production --message "Correctifs SAHAL SHOP"
```

Les profils se trouvent dans `mobile/eas.json` : `development` (client de développement), `preview` (APK) et `production` (AAB, version auto-incrémentée).

---

## Sécurité

- `backend/.env` n'est jamais versionné ; seul `.env.example` l'est.
- Remplacer `JWT_SECRET` et le mot de passe admin avant la production.
- Utiliser un utilisateur MongoDB dédié, limité à la base `sahal_shop`.
- Restreindre `CORS_ORIGIN` si un client web est ajouté.
- Servir l'API en **HTTPS** en production et désactiver le trafic HTTP en clair dans le build final.
- Sauvegardes Atlas activées ; les transactions protègent les opérations de stock et de crédit.
- Le stockage du jeton côté mobile utilise AsyncStorage ; pour un niveau de sécurité supérieur, migrer vers `expo-secure-store`.

---

## Limites connues

- Les dates des périodes prédéfinies utilisent le fuseau du serveur : déployer en UTC ou régler `TZ=Africa/Dakar` pour le Sénégal.
- Les factures PDF sont générées à la demande ; aucun fichier n'est conservé côté serveur.
- L'application mobile n'est pas encore publiée sur le Play Store ; elle est distribuée via un APK EAS ou Expo Go.
- La connexion HTTP locale nécessite que le téléphone puisse joindre l'IP du serveur sur le même réseau.

---

**SAHAL SHOP** — *Votre boutique, simplement.*
