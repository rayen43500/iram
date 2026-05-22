# Frontend — ATB Mobile (Expo)

Application **React Native / Expo SDK 54** pour clients et administrateurs.

## Installation

```bash
npm install
npx expo install
copy .env.example .env
```

Configurer l’API (obligatoire sur téléphone) :

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XX:4000/api
```

## Lancer

```bash
npm run dev
# ou
npx expo start -c
```

Vérifier le bundle : `npm run verify`

## Fonctionnalités interface

- **Auth** : login, inscription, biométrie (après 1ère connexion)
- **Client** : accueil, crédits, pro, simulation, assistant, notifications, profil
- **Admin** : dashboard sidebar, demandes filtrées, offres, profil
- **Profil** : photo, OTP, mot de passe, documents, simulations, QR, historiques
- **Simulation** : amortissement, PDF, sauvegarde, comparaison A/B
- **UX** : mode sombre, FR/EN/AR, déconnexion auto 10 min

## Réseau

| Contexte | URL API typique |
|----------|-----------------|
| Android émulateur | `http://10.0.2.2:4000/api` |
| iOS simulateur | `http://127.0.0.1:4000/api` |
| Téléphone physique | `http://IP_LAN_PC:4000/api` dans `.env` |

Le fichier `src/api.js` détecte aussi l’IP du bundler Expo en développement.

## Plugins Expo (`app.config.js`)

Chargés si installés : `expo-font`, `expo-image-picker`, `expo-notifications`, `expo-local-authentication`, `expo-secure-store`.

## Comptes test

- Admin : `admin@bank.local` / `Admin@1234`
- Client : `client1@bank.local` / `Client@1234`
