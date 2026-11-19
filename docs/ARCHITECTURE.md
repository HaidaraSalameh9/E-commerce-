# Architecture — Al-Haidara storefront

Everything in this document maps to files in this repository. Diagrams are derived from the real
call paths, not from a generic template.

---

## 1. System context

```mermaid
flowchart LR
  subgraph Browser
    UI[React 19 SPA<br/>Vite build]
  end

  UI -->|session JWT| API[API layer<br/>Functions v2 or Workers]
  UI -->|public reads| FS[(Firestore)]
  UI -->|products, categories, search| DJ[DummyJSON]
  UI <-->|session, OAuth, user profile| CK[Clerk]
  API <-->|verify JWT, enrich users| CK
  API <-->|transactions, queries| FS
```

Two interchangeable API implementations exist and share the same request/response contract:

| Implementation | Entry point | Notes |
| --- | --- | --- |
| Firebase Cloud Functions v2 | `functions/index.js` | 25 `onRequest` exports, Node 22, secrets via Secret Manager, needs the Blaze plan |
| Cloudflare Workers | `workers/src/index.js` + `src/api.js` | Same handlers ported by `workers/build/port.mjs`, Firestore reached over REST, `AsyncLocalStorage` supplies `env`/`db` |

The frontend is unaware of which one answers; it only knows `VITE_API_BASE_URL`
(`src/services/apiBase.js`), which falls back to the local emulator.

## 2. Frontend layers

```
main.jsx
 ├─ BrowserRouter            (react-router 7)
 ├─ ClerkProvider            (@clerk/react)
 ├─ Redux Provider           (six slices)
 ├─ CartLoader   → useLoadCart()
 ├─ FavoritesLoader → useFavoritesSync({ initialize: true })
 └─ App.jsx
     └─ RoleProvider (context/RoleContext)
         └─ Routes
             ├─ RootLayout → Navbar + Outlet + Footer + ScrollButtons
             │    ├─ ContainedLayout → favorite, cart, checkout, admin/*, owner/*, my-orders
             │    └─ BleedLayout     → / (Home), /products
             └─ ProtectedRoute(allowedRoles)
```

Dependency direction is one-way: `Page → components/hooks → app (Redux) → services → API`.
No service imports a component, and no component calls `fetch` directly except the two Redux
thunks (`allProductSlice`, `productDetailsSlice`, `searchSlice`) that talk to DummyJSON.

## 3. Routing and guards

```mermaid
flowchart TD
  R[request path] --> P{public?}
  P -->|yes| PAGE[render page]
  P -->|no| L{clerk isLoaded}
  L -->|no| WAIT[Checking permissions…]
  L -->|yes| S{signed in}
  S -->|no| HOME[redirect /]
  S -->|yes| ROLE{role loaded}
  ROLE -->|pending| WAIT
  ROLE -->|role in allowedRoles| PAGE
  ROLE -->|mismatch| HOME
```

`ProtectedRoute` performs the client-side gate. The same decision is repeated on the server for every
mutation, because the client gate is only a UX affordance.

## 4. Role resolution

```mermaid
sequenceDiagram
  participant C as Clerk
  participant R as RoleContext
  participant A as API /getMyRole
  participant F as Firestore users/{uid}

  C->>R: isLoaded, isSignedIn
  R->>C: getToken()
  R->>A: GET /getMyRole (Bearer JWT)
  A->>A: verify signature + azp
  alt uid == OWNER_CLERK_USER_ID
    A-->>R: "owner"
  else
    A->>F: read role
    F-->>A: "admin" | "user" | missing
    A-->>R: role (default "user", document upserted)
  end
  R-->>R: setRole(role), setLoading(false)
```

`updateUserRole` is owner-only and refuses `owner` as a target value, so privilege can only move
between `user` and `admin`.

## 5. Product data flow

```mermaid
flowchart LR
  subgraph External
    DJ[DummyJSON<br/>/products, /category, /search]
  end
  subgraph Firestore
    CP[(customProducts)]
  end
  UC[hooks/useCatalog] --> DJ
  UC -->|GET /getCustomProducts<br/>status == active| CP
  UC --> MERGE[merge + namespace<br/>origin:id]
  MERGE --> STORE[(Redux: allProducts)]
  STORE --> HOME[Home / New Arrivals]
  STORE --> PROD[/products]
  STORE --> DET[/productDetails/:id]
```

Key rule: identifiers are namespaced (`dummyjson:1` vs `custom:looz`), so cart lines, favourites and
order items can reference either origin without collision. `ProductDetails` resolves an id by first
asking the public custom-product endpoint and only then falling back to DummyJSON.

## 6. New Arrivals selection

```mermaid
flowchart TD
  A[custom products] --> B{createdAt parses?<br/>string, ≥2000, not future}
  B -->|no| X[drop]
  B -->|yes| C{isListable?<br/>isAvailable !== false<br/>status absent or 'active'}
  C -->|no| X
  C -->|yes| D[sort by createdAt desc, id asc]
  D --> E[dedupe by origin:id]
  E --> F[take 6]
```

Implemented in `src/utils/catalogSelectors.js`; the component re-sorts defensively and renders the
real count, the date range and the per-card "Added …" label.

## 7. Top Products ("Product of the Week")

```
categories = [groceries, furniture, fragrances, beauty]   (fixed in TopProducts.jsx)
selected  -> dispatch(fetchCategoryProducts(slug)) -> Redux categoryProducts[slug]
          -> filter(p => p.rating > 2.5)
          -> Swiper marquee (loop only when >= 3 items; slides repeated to reach 8 for loop mode)
```

No order or sales data participates in this section. The subtitle "Product of the week" is
merchandising language, not a computed ranking.

## 8. Cart data flow

```mermaid
sequenceDiagram
  participant U as User
  participant C as Cart.jsx
  participant H as useCartSync
  participant R as Redux cart
  participant A as API /cart

  U->>C: add / increment / remove
  C->>H: addProduct(product)
  H->>R: dispatch(addToCart)  (instant UI)
  H->>H: structuredClone(state.cart.product)
  H->>A: POST {products:[{productId,quantity}]}  (queued, sequential)
  A-->>H: ok | error
  alt error
    H-->>U: alert("Could not save your cart…")
  end
```

The queue (`saveQueue.current`) serialises writes so rapid clicks cannot land out of order; only the
latest task clears the saving indicator. Loading is one-shot per session (`useLoadCart`).

## 9. Favourites data flow

```mermaid
flowchart TD
  S{isSignedIn}
  S -->|no| L[localStorage userFavorites<br/>max 15]
  S -->|yes| A[GET /getUserFavorites]
  A --> M[merge local-only ids into free slots]
  M --> SY[POST /syncUserFavorites]
  SY --> F2[GET /getUserFavorites]
  F2 --> R[Redux favorite.product]
  R --> CL[localStorage.removeItem]
  A -.error.-> KEEP[keep local favourites, surface error]
```

## 10. Order lifecycle

```mermaid
stateDiagram-v2
  [*] --> pending: POST /createOrder
  pending --> processing: admin PATCH-equivalent /updateOrderStatus
  processing --> shipped: admin
  shipped --> delivered: admin
  pending --> cancelled: customer /cancelOrder OR admin
  processing --> cancelled: customer OR admin
  delivered --> [*]
  cancelled --> [*]
```

`createOrder` recomputes the total from Firestore product data on the server, so a tampered client
total cannot be persisted. Each transition writes a `userActivity` document.

## 11. Firestore model

```
users/{uid}                        { role }
users/{uid}/favorites/{favId}      { productId, title, price, image, ... }
customProducts/{id}                { title, category, brand, tags, price, discountPercentage,
                                     rating, stock, description, shippingInformation,
                                     images[], status, createdAt }
carts/{uid}                        { products:[{productId,quantity}], updatedAt }
orders/{id}                        { orderId, userId, customer, items[], totalAmount,
                                     shippingInformation, paymentMethod, status,
                                     createdAt, updatedAt, cancelledAt?, cancelledBy? }
userActivity/{id}                  { userId, userName, type, message, entityId,
                                     entityType, metadata, createdAt }
```

## 12. API surface

| Area | Endpoint | Auth | Role |
| --- | --- | --- | --- |
| Health | `GET /api` | none | — |
| Session | `GET /authCheck` | JWT | any |
| Role | `GET /getMyRole` | JWT | any |
| Role | `POST /updateUserRole` | JWT | owner |
| Cart | `GET /cart`, `POST /cart` | JWT | any |
| Favourites | `GET /getUserFavorites`, `POST /addUserFavorite`, `DELETE /removeUserFavorite`, `POST /syncUserFavorites` | JWT | any |
| Orders | `POST /createOrder`, `GET /getOrder`, `GET /getMyOrders`, `POST /cancelOrder` | JWT | any (own data) |
| Orders | `GET /getAllOrders`, `POST /updateOrderStatus` | JWT | admin/owner |
| Orders | `GET /getOwnerDeliveredRevenue` | JWT | owner |
| Users | `GET /getAllUsers` | JWT | owner |
| Products | `GET /getCustomProducts` | none | — |
| Products | `GET /getAdminCustomProducts` | JWT | admin/owner |
| Products | `POST /createCustomProduct`, `PUT /updateCustomProduct`, `DELETE /ArchivedCustomProduct`, `DELETE /deleteCustomProduct` | JWT | admin/owner |
| Activity | `GET /getAllUserActivities`, `GET /getUserActivities` | JWT | admin/owner |

## 13. Deployment topologies

```
A. Firebase-native                     B. Free-tier (current deployment)
  Vercel/Pages ── SPA                    Vercel/Pages ── SPA
      │                                      │
      ▼                                      ▼
  Functions v2 (Blaze)  ←→ Firestore     Cloudflare Worker  ←REST→ Firestore
      └─ Secret Manager                      └─ Wrangler secrets
```

Both require `OWNER_CLERK_USER_ID` and an `ALLOWED_ORIGINS` list that matches the exact frontend
origin, because the same list doubles as the Clerk `azp` allow-list.

## 14. Known architectural limits

- No caching layer in front of Firestore; each page load re-reads its collection.
- Image payloads are base64 data URLs inside the product document, which inflates document size and
  response time (visible as the slow first paint on `/productDetails/:id`).
- The worker's 10 ms CPU budget on the free plan bounds `getAllOrders` and activity pagination.
- Guest carts are Redux-only; there is no anonymous cart persistence.
