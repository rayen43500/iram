## 7 Work environment

Cette section decrit l environnement de travail utilise pour developper et executer le projet IRAM (backend API + application mobile).

### 7.1 Hardware environment

- Poste de developpement: PC Windows (teste sur Windows).
- Smartphone ou emulateur pour les tests mobiles (Android ou iOS).
- Reseau local Wi-Fi pour les tests sur telephone physique (PC et mobile sur le meme reseau).

### 7.2 Software Environment

- Systeme d exploitation: Windows.
- Runtime: Node.js 18+.
- Base de donnees: MySQL 8+ (MariaDB compatible).
- Outils mobile: Expo Go, emulateur Android/iOS.
- Outils projet: npm (scripts racine, backend, frontend).

Pour les tests sur telephone physique, l API est exposee sur l IP LAN du PC (ex: http://192.168.x.x:4000/api) et configuree dans frontend/.env.

## 8 Technologies used

Cette section resume les technologies observees dans les sources et les fichiers package.json.

### 8.1 Backend technologies

- Node.js + Express pour l API REST.
- Sequelize + mysql2 pour l acces base de donnees.
- JSON Web Token pour l authentification.
- bcryptjs pour le hash des mots de passe.
- nodemailer pour l envoi OTP email.
- morgan et cors pour journalisation et CORS.
- dotenv pour la configuration.
- nodemon (dev) pour le rechargement automatique.

### 8.2 Front-end Technologies

- React Native avec Expo SDK 54.
- React 19 + react-native 0.81.
- i18next / react-i18next pour la traduction (FR/EN/AR).
- expo-local-authentication et expo-secure-store pour biometrie et securite.
- expo-notifications pour les notifications push.
- react-native-chart-kit pour graphiques.
- react-native-qrcode-svg pour QR code.
- pdf-lib et expo-sharing pour export PDF.
- Fonts: @expo-google-fonts/inter et @expo-google-fonts/manrope.

### 8.3 Testing technologies

- Script smoke test API: backend/scripts/smoke-api.js (npm run smoke).
- Verification bundle web: npm run verify dans le frontend (export Expo web).
