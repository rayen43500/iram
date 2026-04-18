# Backend Credit App (Node.js + Express + MySQL)

## 1) Configuration

Copy `.env.example` to `.env` and adapt values:

- `PORT=4000`
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_DATABASE=credit_app`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=`
- `JWT_SECRET=change_this_secret`
- `JWT_EXPIRES_IN=7d`
- `FRONTEND_ORIGIN=*`
- `SCORING_MAX_DEBT_RATIO=0.35`

## 2) Start

```bash
npm install
npm run seed
npm run dev
```

Health check: `GET /health`

## 3) Seed accounts

- Admin: `admin@bank.local` / `Admin@1234`
- Client: `client1@bank.local` / `Client@1234`

## 4) Main API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/credits/dashboard`
- `GET /api/credits/types`
- `GET /api/credits/types/:slug`
- `POST /api/estimation`
- `POST /api/requests`
- `GET /api/requests/mine`
- `POST /api/chatbot`

Admin routes:

- `GET /api/admin/requests`
- `PATCH /api/admin/requests/:id/status`
- `POST /api/admin/credit-types`
- `PATCH /api/admin/credit-types/:id`
- `GET /api/admin/analytics/summary`

## 5) Power BI integration

Power BI can consume `GET /api/admin/analytics/summary` (with admin JWT) as a web data source.
For richer dashboards, add endpoints by period/product and connect them to Power BI tables.
