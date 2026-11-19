# Al-Haidara — Full-Stack E-Commerce Storefront

A production-shaped e-commerce application built as a university software-engineering project.
The storefront is a React 19 single-page application; identity is handled by Clerk; catalog,
cart, favourites, orders and activity data live in Firestore and are reached through a
token-verified Node API (Firebase Cloud Functions v2, with a functionally identical Cloudflare
Workers port in `workers/`). The catalogue mixes external demonstration products from
DummyJSON with products created by the store's own administrators.

> All statements below were verified against the source in this repository. Where behaviour is
> intentionally limited (no payment gateway, external demo data), that limitation is stated
> explicitly rather than described as a feature.

---

## 1. Project overview

| Aspect | Detail |
| --- | --- |
| Frontend | React 19 + Vite 8, Tailwind CSS 4, React Router 7, Redux Toolkit 2, Swiper 12 |
| Identity | Clerk (`@clerk/react` 6), email/password and Google OAuth |
| API | 25 HTTPS endpoints: Firebase Cloud Functions v2 (`functions/index.js`) or the Cloudflare Workers port (`workers/src`) |
| Database | Firestore (products, carts, orders, users, activity) + Firebase client SDK for reads |
| External data | DummyJSON at `https://dummyjson.com` (200+ demo products) |
| Deployment | Frontend: Vercel or Cloudflare Pages. API: Firebase Functions (Blaze) or Cloudflare Workers (free tier) |

## 2. Objectives

1. Implement the complete customer journey — browse, search, favourite, cart, checkout, order
   tracking — against real, persistent data rather than mocked state.
2. Separate three business roles (customer, administrator, owner) and enforce the separation on
   the server, not only in the UI.
3. Support two product origins (external demo catalogue and admin-created products) behind one
   consistent storefront experience.
4. Keep the architecture deployable on free-tier infrastructure without changing the application
   contract.

## 3. Problem statement

Small stores need a catalogue, an ordering flow and a lightweight back office without paying for
an enterprise commerce platform. This project explores how far a free-tier stack (Clerk + Firestore
+ a serverless function layer) can deliver a genuine multi-role commerce workflow, and where a real
payment integration would still be required.

## 4. Main features

- Marketing homepage: hero carousel, "Actual Collection" category tiles, trusted-brand marquee,
  New Arrivals, and a rating-filtered "Product of the Week" carousel for four categories.
- Product catalogue on `/products` with category navigation, search and a combined
  DummyJSON + Firestore listing.
- Product detail pages with gallery, discount computation, stock state and recommendations.
- Favourites for guests (localStorage) and for signed-in users (Firestore), with merge-on-sign-in
  and a hard limit of 15 products.
- Persistent cart with quantity control and optimistic Redux updates followed by a queued,
  sequential server save.
- Checkout with shipping details and two mock payment options (Cash on Delivery, Debit Card),
  creating a real order document.
- My Orders list, per-order detail page, and a four-step tracking timeline with customer
  cancellation while the order is still pending or processing.
- Admin back office: dashboard, full product CRUD with archiving, order status management,
  and a user-activity audit view.
- Owner back office: everything an admin can do, plus role management for other users and a
  delivered-revenue report.

## 5. User roles and permissions

| Capability | Guest | User | Admin | Owner |
| --- | :--: | :--: | :--: | :--: |
| Homepage, products, categories, search | ✅ | ✅ | ✅ | ✅ |
| Product details | ✅ | ✅ | ✅ | ✅ |
| Favourites (localStorage) | ✅ | — | — | — |
| Favourites (Firestore) | — | ✅ | ✅ | ✅ |
| Cart and checkout | — | ✅ | ✅ | ✅ |
| `/my-orders`, order tracking, self-cancel | — | ✅ | ✅ | ✅ |
| `/admin` dashboard, `/admin/orders` | — | — | ✅ | ✅ |
| `/admin/products` (create/edit/archive/delete) | — | — | ✅ | ✅ |
| `/admin/activity`, `/admin/activity/users`, `/admin/activity/events` | — | — | ✅ | ✅ |
| `/owner` dashboard, `/owner/delivered-revenue` | — | — | — | ✅ |
| `/owner/users` (promote/demote to admin) | — | — | — | ✅ |

How roles are decided, in code:

- `RoleContext` calls `GET /getMyRole` on every authentication change and exposes
  `{ role, loading, error }`.
- The server returns `owner` when the caller's Clerk id equals `OWNER_CLERK_USER_ID`; otherwise it
  reads `users/{uid}.role`, defaulting to `user`.
- `ProtectedRoute` redirects unauthenticated visitors to `/` and blocks role mismatches.
- Every mutating endpoint re-checks the caller's role server-side (`requireAdmin`,
  `verifyAdminOrOwner`, owner-id comparison). Hiding a page in the UI is never the only control.

## 6. Technology stack

| Layer | Technology | Role in this project |
| --- | --- | --- |
| UI | React 19 | Function components, hooks, `memo` on heavy sections |
| Build | Vite 8 | Dev server, bundling, `import.meta.env` |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) | Design tokens (`ink`, `brass`, `paper`), responsive layout |
| Routing | React Router 7 | Nested layouts (`RootLayout` → `ContainedLayout` / `BleedLayout`), protected routes |
| State | Redux Toolkit 2 + React Redux | Six slices: `allProducts`, `categoryProducts`, `cart`, `singleProduct`, `searchProduct`, `favorite` |
| Auth | Clerk 6 | Session, JWT, sign-in modal, `useAuth`/`useUser` |
| Data | Firebase 13 (Firestore) | Client reads for products; server writes for cart/orders/favourites |
| API | Cloud Functions v2 (Node 22) / Cloudflare Workers | Token verification, role gates, Firestore transactions |
| Carousels | Swiper 12 | Hero, New Arrivals (mobile), Top Products marquee |
| Icons | lucide-react, react-icons | UI iconography |
| External data | DummyJSON REST API | Demo catalogue |

## 7. Frontend architecture

```
src/
├── app/            store.js + six Redux slices
├── components/     Navbar, Footer, Hero, Actual, TrustedBrand, Newarrivals,
│                   TopProducts, ProductCard, SearchInput, ProtectedRoute,
│                   orders/OrderTracking, recommendations/*, admin/* (activity UI)
├── context/        RoleContext (role resolution + guards)
├── hooks/          useCatalog, useLoadCart, useCartSync, useFavoritesSync,
│                   useRecommendationCatalog, useInView
├── layouts/        RootLayout, ContainedLayout, BleedLayout, AdminLayout
├── Page/           21 route components (see §8)
├── services/       one module per API area (products, cart, favourites, orders,
│                   admin orders, owner orders, users, activity)
├── utils/          catalogSelectors, recommendations
└── lib/            firebase.js (Firestore client), clerkBackend.js
```

Component rules observed in the code: pages own data loading, presentational components receive
props, variants are small focused components (`ProductCard`, `SearchInput`), and animation is CSS
based (`useInView` + clip-path transitions) rather than a motion library.

## 8. Routing

| Path | Page | Guard |
| --- | --- | --- |
| `/` | Home | public, `BleedLayout` |
| `/products` | Products | public, `BleedLayout` |
| `/productDetails/:id` | ProductDetails | public |
| `/favorite` | Favorite | public (guest fallback to localStorage) |
| `/cart` | Cart | public shell; saving requires a session |
| `/checkout` | Checkout | public shell; submitting requires a session |
| `/order-confirmation/:orderId` | OrderConfirm | public, order-scoped |
| `/about`, `/contact` | About, Contact | public |
| `/my-orders` | MyOrders | `user`, `admin`, `owner` |
| `/admin` | AdminDashboard | `admin`, `owner` |
| `/admin/orders` | AdminOrders | `admin`, `owner` |
| `/admin/products` | AdminProducts | `admin`, `owner` |
| `/admin/activity` | AdminActivity | `admin`, `owner` |
| `/admin/activity/users`, `/admin/activity/events` | ActivityUsers, ActivityEvents | `admin`, `owner` |
| `/owner` | OwnerDashboard | `owner` |
| `/owner/users` | OwnerUsers | `owner` |
| `/owner/delivered-revenue`, `/owner/revenue` | OwnerDeliveredRevenue | `owner` |
| `*` | NotFound | public |

## 9. State management

| Slice | Holds | Written by |
| --- | --- | --- |
| `allProducts` | Full storefront catalogue (DummyJSON + active Firestore products) | `useCatalog` |
| `categoryProducts` | Per-category cache for the Top Products carousel | `fetchCategoryProducts` thunk |
| `cart` | `{ id, title, price, image, quantity, … }[]` | `useLoadCart`, `useCartSync` |
| `singleProduct` | Detail payload for one product | ProductDetails |
| `searchProduct` | Query, results, loading, error | SearchInput |
| `favorite` | Favourite products + `maxProducts` | `useFavoritesSync`, `FavoritesLoader` |

Redux is intentionally shallow: it holds server-derived collections and never duplicates routing
or session state, which stay in React Router and Clerk.

## 10. Authentication and authorization

1. `ClerkProvider` wraps the app in `main.jsx`; `RoleProvider` sits inside it.
2. Each API call sends `Authorization: Bearer <session JWT>` obtained with `getToken()`.
3. `verifyToken` validates the JWT against Clerk's PEM public key and checks the **authorized
   party** (`azp`) against `ALLOWED_ORIGINS`, so a token minted for another site is rejected.
4. Handlers resolve the role from Firestore/owner id and answer `401`/`403` before touching data.
5. Client-side, `ProtectedRoute` renders "Checking permissions…" while the role resolves, then
   either renders the route or redirects to `/`.

## 11–13. Product management, DummyJSON, custom products

**DummyJSON.** Categories are fetched from `https://dummyjson.com/products/categories`; listings
from `/products`, `/products/category/:slug` and `/products/search?q=`. DummyJSON ids are numeric
and are namespaced with the `dummyjson` origin so they cannot collide with Firestore ids.

**Custom products (Firestore `customProducts`).** Created in `/admin/products` with
title, category, brand, tags, price, discount, rating, stock, description (≤3000 chars), shipping
information, image list and a `status` of `active` / `archived`. Images are stored as data URLs or
remote URLs (no Storage bucket is required). Each document also carries `createdAt` (ISO string),
which is what New Arrivals sorts on. Archiving (`DELETE /ArchivedCustomProduct`) hides a product
from the storefront without destroying it; `DELETE /deleteCustomProduct` removes it permanently.

**Combined catalogue.** `useCatalog` loads public custom products (`GET /getCustomProducts`,
active only) and merges them with the DummyJSON list. Product keys are `${origin}:${id}`, so a
Firestore product and a DummyJSON product can never be confused in cart, favourites or orders.

**Category navigation.** `/products` renders the category rail from the DummyJSON category list
plus categories discovered in custom products; selecting a category filters the merged list in
place and links to the corresponding listing.

## 14. New Arrivals

`selectNewArrivals(customProducts, { limit: 6 })` in `src/utils/catalogSelectors.js`:

1. Keep only custom (Firebase) products — external demo products have no `createdAt`.
2. `parseCreatedAt` rejects missing, unparseable, pre-2000 or future timestamps.
3. `isListable` drops products with `isAvailable === false` or a `status` other than `active`
   (archived products never appear).
4. Sort descending by `createdAt`, tie-break by id.
5. De-duplicate by `origin:id` and take the first six.

The component re-sorts and re-slices defensively, shows the real count and the date range
("Added 3 Oct – 28 Oct"), renders a staggered two-column grid from 640 px upward and a Swiper
carousel below that breakpoint. Missing data produces an explicit empty state, not a blank gap.

## 15. Top Products ("Product of the Week")

`src/components/TopProducts.jsx` fixes four categories — **Groceries, Furniture, Fragrances,
Beauty** — and requests `/products/category/:slug` for the selected one through the
`categoryProducts` slice. Products are filtered with `rating > 2.5`; there is **no sales or order
data** in this selection, so the section is presented as a curated, rating-filtered carousel rather
than a true best-seller ranking. Slides repeat (and are marked `inert`/`aria-hidden`) when a
category has fewer than eight products, and the marquee autoplay is disabled for
`prefers-reduced-motion`.

## 16. Favourites system

- Guest: `localStorage["userFavorites"]`, mirrored into the `favorite` slice; capped at 15.
- Signed in: Firestore subcollection `users/{uid}/favorites`; the UI always re-reads the server
  list after a mutation, so the client never diverges.
- Sign-in transition: server favourites load first, local-only favourites fill the remaining
  slots, `POST /syncUserFavorites` merges the ids, and localStorage is cleared **only** after the
  server confirms. If synchronisation fails, local data is preserved and an error is surfaced.

## 17. Shopping cart

- Guest: the cart lives in Redux only. Saving requires a session (`cart` endpoint returns 401
  otherwise), so guests are guided to sign in before checkout.
- Signed in: `useLoadCart` hydrates the slice once per session; `useCartSync` dispatches the
  Redux action first (instant UI), then appends a `POST /cart` to a promise queue so rapid clicks
  cannot reorder writes. A failed save shows a non-blocking alert and leaves the UI state intact.
- Totals exclude unavailable products and are recomputed from `price × quantity`
  (`Cart.jsx` → `availableTotal`).

## 18. Checkout workflow

`/checkout` collects name, email, phone (required), address, city and zip (required), with inline
required-field messages, then a payment block offering **Cash on Delivery** or **Debit Card**
(card number, holder, expiry, CVV). No card data is transmitted or stored — the value sent to the
server is only the method (`cod` / `dc`). `POST /createOrder` validates the payload, re-reads each
product, recomputes the total server-side, writes `orders/{id}` with `status: "pending"` and appends
a `userActivity` record. The client then navigates to `/order-confirmation/:orderId`.

## 19–21. Order management and tracking

- `GET /getMyOrders` returns the caller's orders only (`userId == caller`); `GET /getOrder`
  additionally verifies ownership, so one customer cannot read another's order by id.
- `OrderTracking` renders `pending → processing → shipped → delivered`; `cancelled` is a terminal
  branch rendered separately with its timestamp.
- Customers may cancel only while the order is `pending` or `processing` (`POST /cancelOrder`);
  the server re-checks the status inside a transaction.
- Admins move orders through `POST /updateOrderStatus` with the allowed set
  `pending | processing | shipped | delivered | cancelled`, and each transition is logged to
  `userActivity`.

## 22. Database structure

```
users/{uid}                     { role: 'admin' | 'user', ... }
users/{uid}/favorites/{favId}   { productId, title, price, image, ... }
customProducts/{id}             { title, category, brand, tags, price, discountPercentage,
                                  rating, stock, description, shippingInformation,
                                  images[], status: 'active' | 'archived', createdAt }
carts/{uid}                     { products: [{ productId, quantity }], updatedAt }
orders/{id}                     { orderId, userId, customer, products[], items[],
                                  totalAmount, shippingInformation, paymentMethod,
                                  status, createdAt, updatedAt, cancelledAt?, cancelledBy? }
userActivity/{id}               { userId, userName, type, message, entityId,
                                  entityType, metadata, createdAt }
```

Access model: the browser reads products through the Firebase client SDK; every other collection
is reached through the API, and `firestore.rules` denies direct client writes.

## 23. API integration

25 endpoints (`functions/index.js`, mirrored 1:1 in `workers/src/api.js`):

```
GET  /api                     health + CORS probe
GET  /authCheck               token sanity check
POST /createOrder             GET  /getOrder         GET  /getMyOrders
POST /updateOrderStatus       POST /cancelOrder      GET  /getAllOrders
GET  /getOwnerDeliveredRevenue
GET  /cart                    POST /cart
GET  /getUserFavorites        POST /addUserFavorite
DELETE /removeUserFavorite    POST /syncUserFavorites
GET  /getMyRole               POST /updateUserRole   GET  /getAllUsers
GET  /getCustomProducts       GET  /getAdminCustomProducts
POST /createCustomProduct     PUT  /updateCustomProduct
DELETE /ArchivedCustomProduct DELETE /deleteCustomProduct
GET  /getAllUserActivities    GET  /getUserActivities
GET  /getCustomProducts (public) is the only unauthenticated data endpoint.
```

## 24. Project structure

```
.
├── src/                  React application (see §7)
├── functions/            Cloud Functions v2 API (Node 22) + Firestore triggers
├── workers/              Cloudflare Workers port (same handlers, REST Firestore client)
├── public/               static assets
├── firestore.rules       deny-by-default client access
├── firestore.indexes.json
├── firebase.json         functions + Firestore emulator config
├── vercel.json           SPA rewrites for deep links
├── env.example           variable names only, no values
└── vite.config.js
```

## 25–27. Installation, configuration, running

```bash
npm install
cp env.example .env            # then fill in the values described below
npm run dev                    # http://localhost:5173
npm run build                  # production bundle in dist/
npm run lint
```

Environment variables (names only — never commit values):

| Variable | Purpose |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk instance key (`pk_test_…` / `pk_live_…`) |
| `VITE_API_BASE_URL` | Deployed API base URL; leave empty to use the local emulator |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web config |

Server-side only (Functions secrets / Wrangler secrets, never in the frontend):

| Secret / var | Purpose |
| --- | --- |
| `CLERK_JWT_KEY` | Clerk PEM public key for JWT verification |
| `CLERK_SECRET_KEY` | Clerk Backend API (user enrichment) |
| `FIRESTORE_SERVICE_ACCOUNT` | Worker-only service-account JSON |
| `OWNER_CLERK_USER_ID` | Clerk id that always resolves to `owner` |
| `ALLOWED_ORIGINS` | CORS allow-list, also used as Clerk `azp` allow-list |

Local backend options:

```bash
# A. Functions emulator (needs the Blaze-free emulator + functions deps)
firebase emulators:start --only functions,firestore

# B. Cloudflare Worker (free tier, no Blaze plan)
cd workers && npx wrangler dev      # then set VITE_API_BASE_URL=http://127.0.0.1:8787
```

## 28. Testing

Manual, role-by-role browser testing plus the API contract suites that ship with the worker
(`workers/test/`, 75 checks against an isolated Firestore emulator and 22 against staging).
The verified results, including what could **not** be tested and why, are in
[`docs/TESTING.md`](docs/TESTING.md).

## 29. Security considerations

- Every protected endpoint verifies the Clerk JWT signature and `azp` before reading `request.body`.
- Role checks happen server-side and again inside transactions where state can race (cancel,
  status update, role change).
- `firestore.rules` denies direct client writes; the browser only reads public product data.
- Order endpoints scope results to `userId`, preventing horizontal privilege escalation.
- `.env*`, `workers/.dev.vars`, service accounts and debug logs are git-ignored; screenshots in
  this repository contain no credentials.
- Known gaps: no rate limiting, no server-side re-validation of uploaded image payloads, and the
  Clerk keys in the deployed demo are **test-instance** keys.

## 30. Limitations

- There is no real payment gateway. "Debit Card" collects no card data and no charge ever occurs.
- "Product of the Week" is rating-filtered, not sales-ranked; order history is not used for
  merchandising.
- DummyJSON products have no `createdAt`, so they never appear in New Arrivals.
- Cart is server-backed only for signed-in users; a guest cart is not persisted across reloads.
- Cloud Functions need the Blaze plan; the Workers port exists to keep the API on a free tier and
  caps requests at ~10 ms CPU.

## 31. Future improvements

Payment provider integration with webhooks, product image storage in Firebase Storage instead of
data URLs, server-side pagination for orders and activity, a sales-based ranking for the
merchandising sections, automated end-to-end tests (Playwright) in CI, and refresh-token/role
caching to avoid a role round-trip on every session change.

## 32. Conclusion

The implementation covers the full commerce loop on free-tier infrastructure: a real catalogue
merged from two origins, session-based identity with three enforced roles, persistent cart and
favourites, order creation, tracking and cancellation, and two back offices with genuinely
different permission sets. Its boundaries — mock payments, demo external data, serverless CPU
limits — are deliberate and documented rather than hidden.
