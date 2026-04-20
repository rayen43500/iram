# Documentation detaillee du projet IRAM

## 1) Vue d'ensemble

Ce projet est une application de credit bancaire composee de deux parties:

- Backend Node.js/Express: expose une API REST, gere l'authentification JWT, les demandes de credit, la simulation, le chatbot et les fonctions admin.
- Frontend React Native (Expo): application mobile qui consomme l'API backend pour les parcours client et administrateur.

Architecture globale:

- Mobile Expo (frontend) -> API REST Express (backend) -> Base MySQL via Sequelize ORM

## 2) Technologies utilisees

### Backend

- Node.js (runtime JavaScript serveur)
- Express 5 (framework API REST)
- Sequelize (ORM SQL)
- MySQL2 (driver MySQL)
- dotenv (variables d'environnement)
- jsonwebtoken (auth JWT)
- bcryptjs (hash des mots de passe)
- cors (gestion CORS)
- morgan (logs HTTP)
- nodemon (dev hot-reload)
- @faker-js/faker (generation de donnees seed)

### Frontend

- React 19
- React Native 0.81
- Expo SDK 54
- expo-font + Google Fonts Inter
- expo-linear-gradient
- lucide-react-native (icones)
- react-native-chart-kit + react-native-svg (graphiques)

## 3) Flux fonctionnel principal

1. L'utilisateur se connecte via /api/auth/login.
2. Le backend renvoie un JWT.
3. Le frontend envoie le JWT dans Authorization: Bearer <token>.
4. Le middleware auth verifie le token et injecte req.user.
5. Les routes client permettent:
   - consultation dashboard,
   - simulation de credit,
   - creation de demande,
   - consultation historique,
   - interaction chatbot.
6. Les routes admin permettent:
   - gestion des demandes,
   - creation/modification des types de credit,
   - consultation des statistiques.
7. En cas d'acceptation d'une demande, un pret actif est cree automatiquement.

## 4) Structure complete et role de chaque element

## Racine du workspace

- .git/
  - Metadonnees Git du depot.
- .gitignore
  - Regles d'exclusion Git (node_modules, .env, logs, caches, builds, dossiers Expo, etc.).
- ARCHITECTURE_DETAILLEE.md
  - Cette documentation detaillee.
- backend/
  - Projet API backend Node.js.
- frontend/
  - Projet mobile frontend React Native Expo.

## Dossier backend

- .env
  - Variables d'environnement locales (non versionnees), utilisees au runtime.
- .env.example
  - Exemple de configuration (PORT, MySQL, JWT, CORS, scoring).
- index.js
  - Point d'entree du serveur: connexion DB, puis app.listen.
- package.json
  - Metadonnees npm, scripts (start, dev, seed), dependances backend.
- package-lock.json
  - Verrouillage des versions npm installees.
- README.md
  - Guide de demarrage backend, endpoints principaux, comptes seed.
- node_modules/
  - Dependances npm installees localement.
- src/
  - Code source principal backend.

### backend/src

- app.js
  - Composition Express: middlewares globaux, health check, montage des routes, gestionnaire d'erreurs.
- seed.js
  - Script d'initialisation de donnees: types de credit, utilisateurs, prets, demandes.

#### backend/src/config

- env.js
  - Charge et normalise les variables d'environnement (types Number/string, valeurs par defaut).
- sequelize.js
  - Instancie Sequelize avec la configuration MySQL.
- db.js
  - Gere la connexion globale DB, creation base si absente, associations des modeles, sync schema.

#### backend/src/models

- User.js
  - Modele Sequelize users: identite, email, hash mot de passe, role, salaire, solde.
- CreditType.js
  - Modele des produits de credit: bornes montant/duree, taux, documents requis, actif/inactif.
- Loan.js
  - Modele des prets actifs/historises: mensualite, duree, taux, statut.
- CreditRequest.js
  - Modele des demandes de credit: montant demande, simulation, ratio dette, probabilite, statut admin.

#### backend/src/middlewares

- auth.js
  - Middleware authRequired (verifie JWT, charge user) et adminRequired (controle role admin).

#### backend/src/controllers

- authController.js
  - Logique register/login/me.
  - Validation des entrees, hash password, emission JWT.
- creditController.js
  - Dashboard client (prets + demandes), liste types actifs, details type par slug.
- estimationController.js
  - Simulation de credit selon type, revenu, encours, taux; renvoie mensualite/cout/probabilite.
- requestController.js
  - Creation de demande client et liste de ses demandes.
  - Empeche doublons en attente pour un meme type.
- adminController.js
  - Gestion admin des demandes (liste + changement statut).
  - Creation/mise a jour des types de credit.
  - Statistiques globales (acceptation, montants, volumes).
  - Cree un pret actif automatiquement quand une demande est acceptee.
- chatbotController.js
  - Reponses simples basees sur intentions (documents, statut demande, aide simulation).

#### backend/src/routes

- authRoutes.js
  - Routes /register, /login, /me.
- creditRoutes.js
  - Routes /dashboard, /types, /types/:slug.
- estimationRoutes.js
  - Route POST / (module estimation).
- requestRoutes.js
  - Routes POST / (nouvelle demande), GET /mine.
- adminRoutes.js
  - Routes admin securisees (requests, analytics, statut, credit-types).
- chatbotRoutes.js
  - Route chatbot POST /.

#### backend/src/utils

- estimate.js
  - Fonctions de calcul metier:
    - mensualite,
    - cout total,
    - ratio d'endettement,
    - probabilite d'acceptation.

#### backend/src/data

- Dossier present mais vide.
  - Reserve pour donnees metier locales/eventuels jeux de donnees.

## Dossier frontend

- .expo/
  - Donnees de runtime/cache Expo locales (non metier).
- .gitignore
  - Regles ignore frontend (cache/build/artefacts locaux).
- App.js
  - Ecran principal unique de l'application:
    - authentification,
    - dashboard client,
    - simulation,
    - demandes,
    - chatbot,
    - vue admin et actions admin.
- app.json
  - Configuration Expo (nom, icones, splash, platformes, plugins).
- index.js
  - Point d'entree Expo qui enregistre le composant racine App.
- package.json
  - Scripts Expo (start/android/ios/web) et dependances frontend.
- package-lock.json
  - Verrouillage des versions npm frontend.
- README.md
  - Instructions de lancement frontend et configuration API de base.
- node_modules/
  - Dependances npm installees localement.
- assets/
  - Ressources statiques (images/icones/splash/logo).
- src/
  - Modules frontend partages.

### frontend/assets

- adaptive-icon.png
  - Icne adaptive Android.
- favicon.png
  - Favicon web.
- icon.png
  - Icone application.
- image.png
  - Logo visuel principal utilise dans l'UI (ATB_LOGO).
- splash-icon.png
  - Image ecran de demarrage Expo.

### frontend/src

- api.js
  - Client HTTP central:
    - URL API selon plateforme,
    - timeout via AbortController,
    - serialisation JSON,
    - gestion d'erreurs metier.
- components.js
  - Bibliotheque de composants UI reutilisables (badges, boutons, cartes, chat bubble, tab bar).
- theme.js
  - Design tokens (couleurs, espacements, polices, rayons, ombres).

## 5) Couche securite

- Auth stateless JWT sur backend.
- Routes protegees par authRequired.
- Routes sensibles admin protegees par authRequired + adminRequired.
- Hash des mots de passe via bcryptjs (jamais de stockage en clair).

## 6) Couche donnees

- Base MySQL.
- Sequelize definit schema + relations.
- Associations principales:
  - User 1..N Loan
  - CreditType 1..N Loan
  - User 1..N CreditRequest
  - CreditType 1..N CreditRequest

## 7) Scripts utiles

### Backend

- npm run start
  - Demarrage production backend.
- npm run dev
  - Demarrage dev avec nodemon.
- npm run seed
  - Reinitialise/synchronise DB et injecte des donnees de test.

### Frontend

- npm start
  - Lance Expo.
- npm run android
  - Lance sur emulateur Android.
- npm run ios
  - Lance sur simulateur iOS.
- npm run web
  - Lance version web.

## 8) Notes d'architecture

- Le backend suit une architecture en couches classiques:
  - routes -> controllers -> models/utils -> DB.
- Le frontend centralise la logique dans App.js, avec extraction des briques UI et du theme dans src/.
- Le dossier backend/src/data est actuellement reserve.
- Le projet est pret pour une evolution vers:
  - services metier separes,
  - validation schema (Joi/Zod),
  - tests automatises,
  - pagination/filtrage API avances.
