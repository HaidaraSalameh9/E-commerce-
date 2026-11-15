# E-Commerce App

Full-stack e-commerce storefront: React 19 + Vite frontend, Clerk authentication, Firebase Cloud Functions (Node 22, v2 HTTPS functions) as the API, and Firestore for products, carts, favorites, orders and activity logs.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router 7, Redux Toolkit, Tailwind CSS 4 |
| Auth | Clerk (`@clerk/react` on the client, `@clerk/backend` on the API) |
| API | Cloudflare Worker (`workers/`, free tier) — the same 25 endpoints as `functions/index.js`, which stays in the repo as the reference implementation |
| Database | Firestore (`orders`, `customProducts`, `carts`, `users/{id}/favorites`, `userActivity`) |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Workers (API) + Firestore (database) |

## Roles

- `user` — shop, cart, favorites, own orders
- `admin` — all orders, order status updates, product management, activity feed
- `owner` — everything an admin can do, plus user roles and delivered revenue

The owner account is fixed by the `OWNER_CLERK_USER_ID` environment variable on the backend.

## Local development

```bash
npm install
npm run dev                # frontend on http://localhost:5173
cd functions && npm install
firebase emulators:start --only functions,firestore
```

Create `.env` in the project root (see `env.example`). Leave `VITE_API_BASE_URL` empty locally so the frontend talks to the emulator at `http://127.0.0.1:5001/e-commerce-app-717a6/us-central1`.

## Environment variables

Frontend (`.env`, and the same keys in the host dashboard):

| Key | Notes |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` |
| `VITE_FIREBASE_*` | Firebase web app config |
| `VITE_API_BASE_URL` | Deployed functions base URL, no trailing slash. Empty = emulator |

Backend (`functions/.env`, never committed):

| Key | Notes |
| --- | --- |
| `CLERK_JWT_KEY` | Secret: set with `firebase functions:secrets:set CLERK_JWT_KEY` |
| `CLERK_SECRET_KEY` | Secret: set with `firebase functions:secrets:set CLERK_SECRET_KEY` |
| `OWNER_CLERK_USER_ID` | Clerk id of the owner account |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins. Used for CORS **and** Clerk `authorizedParties`, so it must contain the exact deployed origin |

## Deploying

### 1. Backend (Cloudflare Worker — free, no billing account)

See [`workers/README.md`](workers/README.md) for the full guide. Short version:

```bash
cd workers
npx wrangler login
npx wrangler secret put CLERK_JWT_KEY              # PEM public key
npx wrangler secret put CLERK_SECRET_KEY           # Clerk backend key
npx wrangler secret put FIRESTORE_SERVICE_ACCOUNT  # service-account JSON, one line
npx wrangler deploy                                # https://ecommerce-api.<subdomain>.workers.dev
```

Set `FIREBASE_PROJECT_ID` and `ALLOWED_ORIGINS` in `workers/wrangler.toml` before deploying.
`ALLOWED_ORIGINS` must contain the exact frontend origin (including the `pages.dev` one),
because it drives both CORS and Clerk's `azp` check.

### 1b. Backend (Cloud Functions — original, requires the Blaze plan)

Still valid and unchanged; kept as the reference implementation. It cannot be deployed on
the free Spark plan because Functions v2 need billing and Secret Manager.

```bash
firebase login
firebase use e-commerce-app-717a6
firebase functions:secrets:set CLERK_JWT_KEY      # paste the PEM public key
firebase functions:secrets:set CLERK_SECRET_KEY   # paste the Clerk secret key
# edit functions/.env -> ALLOWED_ORIGINS=<your deployed frontend origin>
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
```

The functions deploy to `us-central1`. API base URL:

```
https://us-central1-e-commerce-app-717a6.cloudfunctions.net
```

### 2. Frontend (Cloudflare Pages, alternative: Vercel)

Cloudflare Pages (free):

```bash
npm run build
npx wrangler pages deploy dist --project-name ecommerce-storefront
```

Vercel alternative:

1. Import the GitHub repo in Vercel, framework preset **Vite**.
2. Add the `VITE_*` environment variables (including `VITE_API_BASE_URL` pointing at the API base URL above).
3. `vercel.json` already rewrites all routes to `index.html`, so deep links such as `/products/12` work on refresh.
4. After the first deploy, copy the production origin into `ALLOWED_ORIGINS` and redeploy the API, otherwise every protected request returns 403 / 401.

### Clerk checklist for production

- Add the deployed domain to the Clerk instance's allowed origins.
- The keys in this repo are **test instance** keys (`pk_test_` / `sk_test_`). Switch to a production instance (`pk_live_` / `sk_live_`) before opening the store to real customers, then update both `VITE_CLERK_PUBLISHABLE_KEY` and the `CLERK_SECRET_KEY` secret.

## API endpoints

`cart`, `createOrder`, `getOrder`, `getMyOrders`, `cancelOrder`, `getUserFavorites`, `addUserFavorite`, `removeUserFavorite`, `syncUserFavorites`, `getMyRole`, `updateUserRole`, `getAllOrders`, `updateOrderStatus`, `getAllUsers`, `getCustomProducts`, `getAdminCustomProducts`, `createCustomProduct`, `updateCustomProduct`, `ArchivedCustomProduct`, `deleteCustomProduct`, `getAllUserActivities`, `getUserActivities`, `getOwnerDeliveredRevenue`, `authCheck`, `api` (health check).

All protected endpoints expect `Authorization: Bearer <clerk session token>` and validate the request `Origin` against `ALLOWED_ORIGINS`.
