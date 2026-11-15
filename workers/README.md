# E-Commerce API — Cloudflare Workers

Free-tier replacement for the Firebase Cloud Functions in `../functions/index.js`.
Same 25 endpoints, same request/response JSON, same Clerk token verification and role
gates, same Firestore data model and the same five transactions. The original
`functions/` folder is untouched and can still be deployed or run alongside.

## Why this exists

Cloud Functions v2 require the Blaze (pay-as-you-go) plan and Secret Manager. Firestore
itself, Clerk and the frontend all work on free plans, so only the API layer moved.
Cloudflare Workers free tier: 100k requests/day, 10 ms CPU per request, no billing
required. Requests that exceed the CPU budget are rejected — they are never billed.

## Files

| File | Role |
| --- | --- |
| `src/api.js` | Generated: `functions/index.js` with only the header rewritten (`defineSecret`/`initializeApp`/`setGlobalOptions` removed, `exports.x =` → `export const x =`). Handler bodies are byte-identical. |
| `src/runtime.js` | `onRequest`, `Request`/`Response` helpers, `verifyToken` (jose, same PEM + `azp` allow-list), `createClerkClient` REST shim, `env`/`db` access via `AsyncLocalStorage`. |
| `src/firestore.js` | Firestore REST client mirroring the Admin SDK surface used by the handlers: `collection/doc/where/orderBy/limit/startAfter/get/set/update/delete/batch/runTransaction/FieldValue`. |
| `src/index.js` | Router: all 25 paths under `runWithContext`, CORS preflight, 404/405. |
| `build/port.mjs` | Regenerates `src/api.js` from `functions/index.js` (`node build/port.mjs`). |

Re-run the port after editing `functions/index.js`; do not hand-edit `src/api.js`.

## Endpoints

```
GET  /api                        health + CORS probe
GET  /authCheck                  token sanity check
POST /createOrder                GET  /getOrder        GET /getMyOrders
POST /updateOrderStatus          POST /cancelOrder     GET /getAllOrders
GET  /getOwnerDeliveredRevenue
GET  /cart  POST /cart
GET  /getUserFavorites  POST /addUserFavorite
DELETE /removeUserFavorite  POST /syncUserFavorites
GET  /getMyRole  POST /updateUserRole  GET /getAllUsers
GET  /getCustomProducts  GET /getAdminCustomProducts
POST /createCustomProduct  PUT /updateCustomProduct
DELETE /ArchivedCustomProduct  DELETE /deleteCustomProduct
GET  /getAllUserActivities  GET /getUserActivities
```

Business rule change versus the Cloud Function: inventory is unlimited, so the two
"Not enough product stock" guards are gone. `stock`, `status` and `isAvailable` fields
are still read, written and returned exactly as before.

## Configuration

`wrangler.toml` `[vars]` (non-secret):

| Var | Meaning |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Staging or production Firebase project |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins; used for CORS **and** Clerk `azp` |
| `OWNER_CLERK_USER_ID` | Clerk id of the owner account |

Secrets (never commit):

```bash
npx wrangler secret put CLERK_JWT_KEY            # PEM public key, "\n" escaped or literal
npx wrangler secret put CLERK_SECRET_KEY         # Clerk backend key
npx wrangler secret put FIRESTORE_SERVICE_ACCOUNT # full service-account JSON (single line)
```

Local development uses `workers/.dev.vars` with the same names (git-ignored).

## Tests

```bash
# 75 checks against an isolated Firestore emulator (127.0.0.1:8899)
firebase emulators:start --only firestore --project demo-apitest --config test/firebase.test.json
node test/run-tests.mjs

# 22 checks against the real staging project (needs local `firebase login`)
node test/staging.mjs
```

The suite covers every endpoint, all three roles, the five transactions, token
rejection (expired, forged, foreign `azp`), CORS, 404/405, Clerk-enriched responses
(mocked) and activity pagination.

## Deploy

```bash
npx wrangler login          # once, interactive; opens the browser
npx wrangler whoami
npx wrangler secret put CLERK_JWT_KEY
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put FIRESTORE_SERVICE_ACCOUNT
npx wrangler deploy         # prints https://ecommerce-api.<subdomain>.workers.dev
```

Then point the frontend at it:

```
VITE_API_BASE_URL=https://ecommerce-api.<subdomain>.workers.dev
```

and add the Pages origin (`https://<project>.pages.dev`) to `ALLOWED_ORIGINS` in
`wrangler.toml`, then `npx wrangler deploy` again.

Frontend on Cloudflare Pages:

```bash
npm run build
npx wrangler pages deploy dist --project-name ecommerce-storefront
```

## Limitations

- Cloudflare free plan aborts requests that exceed 10 ms CPU; long loops over very large
  collections (thousands of orders in `getAllOrders`) are the realistic risk. Firestore
  I/O time does not count toward CPU.
- `FIRESTORE_SERVICE_ACCOUNT` must be a real key from the target project (free to create
  and rotate in the Firebase console). An OAuth access token can be supplied instead via
  `FIRESTORE_ACCESS_TOKEN` — used by `test/staging.mjs`.
- Clerk user enrichment is wrapped in try/catch exactly like the Cloud Function: if the
  Clerk API is unreachable the endpoint still returns data with "Unknown Customer".
- Product images are still base64/URL strings stored in Firestore, unchanged.
