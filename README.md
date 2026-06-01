# IRAM — Application bancaire mobile (ATB)

Application complète de **gestion de crédits** : simulation, demandes, espace admin, sécurité biométrique, notifications, documents et profil multilingue.

## Structure

| Dossier | Rôle |
|---------|------|
| `backend/` | API REST Node.js + Express + MySQL (Sequelize) |
| `frontend/` | Application mobile Expo (React Native) |

## Prérequis

- **Node.js** 18+
- **MySQL** 8+ (MariaDB compatible)
- **Expo Go** ou émulateur Android/iOS pour le mobile

## Installation rapide

```bash
# Racine du projet
npm run install:all

# Backend
cd backend
copy .env.example .env
npm run dev

# Frontend (autre terminal)
cd frontend
copy .env.example .env
# Éditer EXPO_PUBLIC_API_BASE_URL=http://VOTRE_IP_LAN:4000/api
npm run dev
```

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@bank.local` | `Admin@1234` |
| Client | `client1@bank.local` | `Client@1234` |

## Fonctionnalités livrées

### Sécurité & authentification
- Connexion / inscription JWT
- **Biométrie** (empreinte / Face ID) après première connexion
- **OTP email** (code en console si SMTP non configuré)
- **Changement de mot de passe**
- **Déconnexion auto** après 10 min d’inactivité
- **Historique des connexions**

### Profil
- Photo (URL, galerie mobile, import web)
- Nom, téléphone, ville, profession
- Upload **CIN**, fiche de paie, selfie
- **QR code** profil client

### Crédit & simulation
- Catalogue **7 crédits pro** (Sayara, Sakan, Mounassib, etc.)
- Estimation + scoring + **tableau d’amortissement**
- **Sauvegarde** et **comparaison** de simulations
- **Export PDF** simulation
- Formulaire demande + **barre de progression**
- **Historique complet** des demandes

### Notifications
- Liste **lu / non lu**
- Push Expo (appareil physique)
- Acceptation / refus de demande
- **Rappels mensualités** (à la connexion)

### Admin
- Dashboard KPI + graphique
- Demandes : recherche, statut, **filtre par dates**
- Utilisateurs : recherche, filtre role, modification **client / admin**
- Édition des offres de crédit
- Décision accept / refus + notification client

### UX
- **Mode sombre**
- **FR / EN / AR** (i18next)
- Splash animé
- Interface responsive (sidebar admin desktop)

## Vérification automatique

```bash
# API (backend démarré)
cd backend && npm run smoke

# Bundle web frontend
cd frontend && npm run verify
```

## Documentation

- [Backend — API détaillée](backend/README.md)
- [Frontend — Expo & réseau](frontend/README.md)
- [Architecture](ARCHITECTURE_DETAILLEE.md)

## Configuration réseau (téléphone physique)

1. PC et téléphone sur le **même Wi‑Fi**
2. Backend écoute sur `0.0.0.0:4000`
3. `frontend/.env` : `EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:4000/api`
4. Redémarrer Expo : `npx expo start -c`

## Variables d’environnement

Voir `backend/.env.example` et `frontend/.env.example`.

## Production

- Backend : definir `NODE_ENV=production`, `MYSQL_PASSWORD`, un `JWT_SECRET` unique de 32+ caracteres, `FRONTEND_ORIGIN` avec l'origine exacte du frontend, et `AUTO_SEED_ON_START=false`.
- Frontend : definir obligatoirement `EXPO_PUBLIC_API_BASE_URL=https://votre-api.example.com/api`.
- Verification build : `npm run verify`.
- Test API reel apres demarrage backend : `npm run verify:smoke`.
-------|--------------|------|
| admin@bank.local | Admin@1234 | admin |
| client1@bank.local | Client@1234 | client |
