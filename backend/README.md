# Backend — API crédit ATB

API REST **Node.js + Express + MySQL** (Sequelize).

## Démarrage

```bash
npm install
copy .env.example .env
npm run dev
```

Santé : `GET http://localhost:4000/health`  
Tests : `npm run smoke` (11 contrôles API)

## Comptes seed

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| admin@bank.local | Admin@1234 | admin |
| client1@bank.local | Client@1234 | client |

## Authentification (`/api/auth`)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/register` | Inscription |
| POST | `/login` | Connexion (+ historique + rappels mensualités) |
| GET | `/me` | Profil courant |
| PATCH | `/profile` | Nom, avatar, téléphone, ville, profession |
| POST | `/request-otp` | Envoi OTP email |
| POST | `/verify-otp` | Vérification OTP |
| POST | `/change-password` | Changement mot de passe |
| GET | `/login-history` | Historique connexions |

## Crédits (`/api/credits`)

| GET | `/dashboard` | Solde, prêts, demandes client |
| GET | `/types` | Types de crédit actifs |
| GET | `/types/:slug` | Détail par slug |

## Estimation & demandes

| POST | `/api/estimation` | Simulation + **tableau d’amortissement** |
| POST | `/api/requests` | Nouvelle demande (+ notification client) |
| GET | `/api/requests/mine` | Mes demandes |

## Simulations sauvegardées (`/api/simulations`)

| GET | `/` | Liste |
| POST | `/` | Sauvegarder |
| DELETE | `/:id` | Supprimer |

## Documents (`/api/documents`)

| GET | `/` | Liste (CIN, payslip, selfie, other) |
| POST | `/` | Upload base64 |
| DELETE | `/:id` | Supprimer |

## Notifications (`/api/notifications`)

| GET | `/` | Historique lu/non lu |
| PATCH | `/read-all` | Tout marquer lu |
| PATCH | `/:id/read` | Marquer une notification |
| POST | `/push-token` | Enregistrer token Expo |

## Admin (`/api/admin`) — JWT admin

| GET | `/requests?q&status&from&to` | Liste filtrée |
| PATCH | `/requests/:id/status` | Accepter / refuser (+ notif + prêt) |
| GET | `/analytics/summary` | KPI dashboard |
| POST | `/credit-types` | Créer offre |
| PATCH | `/credit-types/:id` | Modifier taux / actif |

## Chatbot

| POST | `/api/chatbot` | Question crédit (auth) |

## Variables `.env`

Voir `.env.example` : MySQL, JWT, SMTP (OTP), `EXPO_PUSH_ENABLED`, `SCORING_MAX_DEBT_RATIO`, `AUTO_SEED_ON_START`.

## Schéma auto

Au démarrage : colonnes manquantes ajoutées (`avatarUrl`, `applicationForm`, OTP, `lastReminderAt`, etc.).
