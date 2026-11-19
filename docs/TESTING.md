# Testing report — Al-Haidara storefront

Date: 19 November 2026
Build under test: production deployment `https://e-commerce-tan-beta-6x5kc3gwca.vercel.app` (commit `279a729`, `main`)
Browsers: Chrome 143 (desktop, 1920 × 912) and Chrome 143 with emulated widths 390 × 844 and 768 × 1024
Method: manual walkthrough of every reachable route, ARIA/DOM inspection, screenshot capture, and source
cross-check for everything that could not be exercised end-to-end.

> Verdicts below describe what was actually observed. Anything not executed is listed in
> §7 "Not executed" with the reason, instead of being reported as passing.

---

## 1. Environment and preconditions

| Item | Value |
| --- | --- |
| Frontend | Vercel static deployment of the Vite build |
| API | Deployed worker/function layer referenced by the deployment's `VITE_API_BASE_URL` |
| Identity | Clerk **test** instance (`pk_test_…`), Google OAuth and email/password |
| Database | Firestore project seeded with 1 custom product (`Looz`) and the DummyJSON catalogue |
| Test data created | None (see §7) |
| Data destroyed | None |

A local dev server (Vite, port 5173) was also running, but the local Functions emulator was **not**
running and `functions/node_modules` is absent, so the local build has no API. All functional testing
was therefore done against the deployment, which has a live API.

## 2. Guest / unauthenticated visitor

| ID | Test | Expected | Observed | Verdict |
| --- | --- | --- | --- | --- |
| G-01 | Open `/` | Home renders with hero, collections, brands, New Arrivals, Top Products | All five sections render; hero rotates through 5 slides with dot controls | **Pass** |
| G-02 | Hero carousel | Slides change and dots track position | 5 dots, `Show image n of 5` labels exposed to assistive tech | **Pass** |
| G-03 | "Actual Collection" section | Four collection tiles linking to product views | Women / Accessories / Kids / Men tiles present and linked | **Pass** |
| G-04 | Trusted brands | Continuously scrolling logo strip | Marquee scrolls; logos rendered from local assets | **Pass** |
| G-05 | New Arrivals | Newest **custom** products only, ≤ 6, archived excluded | Shows exactly 1 product ("Looz"), label "Added Nov 17", count "01 new product", price $500, 25 % off, "Only 1 left" | **Pass** |
| G-06 | Top Products | 4 category tabs, rating-filtered carousel | Tabs Groceries / Furniture / Fragrances / Beauty; Groceries selected shows "27 products"; products with rating ≤ 2.5 excluded | **Pass** |
| G-07 | Switch Top Products category | Carousel reloads for the chosen category | Selection moves the brass pill and reloads the list | **Pass** |
| G-08 | Open `/products` | Catalogue with statistics, category rail and per-category rows | "195 Products", "25 Categories", rail of 25 category chips, one carousel per category | **Pass** |
| G-09 | Select a category chip | Page moves to that category's products | Clicking "Groceries" marked the chip active and smooth-scrolled to the Groceries row (27 products) | **Pass** |
| G-10 | Product card content | Image, discount, rating, stock, price, add-to-cart, favourite | All present; sold-out state is rendered when stock ≤ 0 | **Pass** |
| G-11 | Open `/productDetails/1` | Detail page with gallery, price, discount, rating, stock, quantity, CTA | Rendered, but only after an initial full-page spinner of several seconds | **Pass with issue** (see D-02) |
| G-12 | Quantity selector on detail page | Increment/decrement updates the line total | Total recalculates with quantity | **Pass** |
| G-13 | `/favorite` as guest | Empty wishlist state, no sign-in required | "No favorites yet" state with CTA | **Pass** |
| G-14 | Add a favourite as guest | Stored locally and shown in `/favorite` | Not executed (no product view interaction was needed; behaviour verified in code — `localStorage["userFavorites"]`, cap 15) | **Not executed** |
| G-15 | `/cart` as guest | Empty-cart state with 3-step progress | "Shopping Cart — Nothing here yet", 0 products, steps Cart → Checkout → Order Confirmation | **Pass** |
| G-16 | `/checkout` as guest | Form + order summary, sign-in required to submit | Form and summary render, but the banner said "You're signed in" while the navbar showed "Login" | **Fail → fixed** (D-01) |
| G-17 | `/my-orders` as guest | Redirect to `/` | Page stayed on "Checking permissions..." indefinitely (white text on white panel) | **Fail → fixed** (D-03) |
| G-18 | `/admin` as guest | Redirect to `/` | Same guard as G-17 — blocked on the same defect | **Fail → fixed** (D-03) |
| G-19 | Unknown route | 404 page with recovery actions | "404 — Oops! Page not found" with Go Home / Go Back | **Pass with issue** (D-04) |
| G-20 | Search box presence | Accessible search input in the navbar | `textbox "Search products"` present on every page | **Pass** |
| G-21 | Search execution | Results view for a query | Not executed (no stable result route was confirmed from the UI in this session) | **Not executed** |

## 3. Registered normal user

**Blocked.** Creating a test account requires Clerk's sign-up form, which presented a Cloudflare
Turnstile "Verify you are human" challenge; solving it is a human step and was not attempted. Signing
in with the owner account would require the account password, which is deliberately never requested.

Consequently the following were **not** executed: cart persistence, favourite persistence and merge,
checkout submission, order creation, `/my-orders`, order detail, order cancellation. They are
described in `README.md` and `docs/ARCHITECTURE.md` from source, and flagged as untested behaviour.

## 4. Administrator

Not executed live (same authentication blocker). What was verified from source instead:

- `/admin`, `/admin/orders`, `/admin/products`, `/admin/activity`, `/admin/activity/users`,
  `/admin/activity/events` are wrapped in `ProtectedRoute allowedRoles={['admin','owner']}`.
- Product management exposes create, edit, archive (`DELETE /ArchivedCustomProduct`) and permanent
  delete, with fields title, category, brand, tags, price, discount, rating, stock, description
  (≤ 3000 chars), shipping information, images and status, plus a live card preview.
- Order status transitions are validated server-side against
  `pending | processing | shipped | delivered | cancelled`; every change appends a `userActivity` record.

## 5. Project owner

Not executed live (same authentication blocker). Verified from source:

- The owner is the Clerk user id in `OWNER_CLERK_USER_ID`; `getMyRole` returns `owner` for that id
  regardless of the Firestore document.
- `updateUserRole` refuses every caller except the owner, refuses to change the owner's own role, and
  accepts only `admin` / `user`.
- `getOwnerDeliveredRevenue` filters `orders.status == "delivered"`, sums `totalAmount` and enriches
  customers through the Clerk Backend API.

## 6. Responsive behaviour

| Width | Page | Result |
| --- | --- | --- |
| 390 px | Home | Pass — hamburger navigation, stacked hero, single CTA; hero artwork sits below the fold |
| 390 px | Products | Pass — one card per view with peeking next card, arrows for the category carousel, sticky back-to-top button |
| 768 px | Products | Pass — three cards per row, category chips scroll horizontally |
| 1920 px | All pages | Pass — content capped at `max-w-6xl`, no horizontal overflow |

## 7. Not executed, and why

| Area | Reason |
| --- | --- |
| Account creation, sign-in | Cloudflare Turnstile human challenge on the Clerk sign-up form |
| Cart, favourites, checkout, orders as a user | Require an authenticated session (above) |
| Admin and owner screens | Role assignment requires an authenticated owner session |
| Search results | No deterministic result URL confirmed during the walkthrough |
| Payment | By design: no gateway, `cod` / `dc` are recorded as a label only |
| Automated E2E suite | Not present in the repository; only worker-level API contract tests exist in `workers/test/` |

## 8. Defects found

| ID | Severity | Description | Status |
| --- | --- | --- | --- |
| D-01 | Medium | Checkout told guests "You're signed in — review your details…" | **Fixed** in `src/Page/Checkout.jsx` (banner now depends on `user`) |
| D-02 | Medium | Product detail page shows a full-page spinner while the custom-product list resolves, before the DummyJSON request even starts | Open — reported, not changed (behavioural design decision) |
| D-03 | High | Guests visiting `/my-orders`, `/admin/*` or `/owner/*` were stuck on "Checking permissions..." instead of being redirected | **Fixed** in `src/components/ProtectedRoute.jsx` (redirect before waiting for the role request; loader text made visible) |
| D-04 | Low | 404 page is not themed like the rest of the store and exposes the leftover debug button in the deployed build | Open (styling only) |
| D-05 | Medium | The deployed build is **older than `main`**: it still renders the removed `BackendAuthTest` debug button ("Test Backend Authentication") below the content on several pages | Open — needs a redeploy; source is already clean |
| D-06 | Low | On `/productDetails/1` the main product image area rendered as a blank pale panel while the card images loaded correctly | Open — likely image lazy-loading/`object-contain` on a light image |
| D-07 | Low | `Checkout.jsx` uses `product.title.slice(0.25)`, which silently means `slice(0)`, i.e. the full title | Open (harmless, recorded for completeness) |

## 9. Security observations

1. Every protected handler verifies the Clerk JWT signature against the public key and checks the
   token's `azp` against `ALLOWED_ORIGINS`, so a token minted for another origin is rejected.
2. `getOrder` and `getMyOrders` scope results to the calling `userId`; an order id alone is not enough
   to read another customer's order.
3. `cancelOrder` and `updateOrderStatus` re-check the current status inside a transaction, which
   prevents a double cancel or a status regression under concurrency.
4. `firestore.rules` is deny-by-default; the browser only reads public product data directly.
5. No credentials are stored in the repository: `.env`, `workers/.dev.vars`, service accounts and
   debug logs are git-ignored, and the screenshots in this report contain no secrets.
6. The deployed demo uses **test-instance** Clerk keys — expected for an academic project, must be
   replaced before any real use.

## 10. Reproduction notes

```bash
npm install
npm run dev            # UI only; needs a reachable API for custom products, cart, orders
npm run build
npm run lint
```

To reproduce the authenticated tests, sign in on the machine (the assistant never handles the
password) with a normal user, then an admin, then the owner, and repeat §2 with each session.
