// Full API test suite for the Cloudflare Worker, run against the isolated
// Firestore emulator (127.0.0.1:8899). Covers every endpoint, all three roles,
// the five transactions, and the removed stock guards.

import { subtle } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';

import worker from '../src/index.js';
import { createDb } from '../src/firestore.js';

// Silence handler noise (expected 4xx errors); re-enable with VERBOSE=1
if (!process.env.VERBOSE) console.error = function () {};

const ORIGIN = 'http://localhost:5173';
const OWNER = 'user_test_owner';
const ADMIN = 'user_test_admin';
const PLAIN = 'user_test_plain';

/* ---------------------------- Clerk API mock --------------------------- */
// Some handlers enrich responses with Clerk user data. Route those calls to an
// in-process mock so the enrichment code paths run without network access.
const clerkUsers = {
	[OWNER]: { id: OWNER, first_name: 'Owner', last_name: 'One', email_addresses: [{ id: 'oe', email_address: 'owner@example.com' }], primary_email_address_id: 'oe' },
	[ADMIN]: { id: ADMIN, first_name: 'Ada', last_name: 'Admin', email_addresses: [{ id: 'ae', email_address: 'admin@example.com' }], primary_email_address_id: 'ae' },
	[PLAIN]: { id: PLAIN, first_name: 'Pat', last_name: 'Buyer', email_addresses: [{ id: 'pe', email_address: 'buyer@example.com' }], primary_email_address_id: 'pe' },
};

let clerkCalls = 0;

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
	const url = typeof input === 'string' ? input : input.url;

	if (!url.startsWith('https://api.clerk.com/v1')) return realFetch(input, init);

	clerkCalls += 1;

	const parsed = new URL(url);
	const pathname = parsed.pathname.replace(/^\/v1/, '');
	const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });

	if (pathname === '/users') {
		const ids = parsed.searchParams.getAll('user_id');
		const list = ids.length > 0 ? ids.map((id) => clerkUsers[id]).filter(Boolean) : Object.values(clerkUsers);

		return json(list);
	}

	const single = pathname.match(/^\/users\/([^/]+)$/);

	if (single) {
		const user = clerkUsers[decodeURIComponent(single[1])];

		return user ? json(user) : json({ error: { message: 'not found' } }, 404);
	}

	return json({ error: { message: `unhandled ${pathname}` } }, 400);
};

const env = {
	FIREBASE_PROJECT_ID: 'demo-apitest',
	FIRESTORE_EMULATOR_HOST: 'http://127.0.0.1:8899',
	ALLOWED_ORIGINS: ORIGIN,
	OWNER_CLERK_USER_ID: OWNER,
	CLERK_SECRET_KEY: 'sk_test_invalid_for_tests',
};

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
	if (condition) {
		passed += 1;
		console.log(`PASS  ${name}`);
	} else {
		failed += 1;
		console.log(`FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
	}
}

async function call(path, { method = 'GET', token, origin = ORIGIN, body } = {}) {
	const headers = {};

	if (origin) headers.Origin = origin;
	if (token) headers.Authorization = `Bearer ${token}`;

	const response = await worker.fetch(
		new Request(`https://api.test${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
		env,
	);

	let json = null;

	try {
		json = await response.clone().json();
	} catch {
		json = null;
	}

	return { status: response.status, headers: response.headers, json };
}

/* ---------------------------- keys / tokens --------------------------- */

const keyPair = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const toPem = (buffer, label) => `-----BEGIN ${label}-----\n${Buffer.from(buffer).toString('base64').replace(/.{1,64}/g, '$&\n').trim()}\n-----END ${label}-----`;
const publicPem = toPem(await subtle.exportKey('spki', keyPair.publicKey), 'PUBLIC KEY');
const privateKey = await importPKCS8(toPem(await subtle.exportKey('pkcs8', keyPair.privateKey), 'PRIVATE KEY'), 'RS256');

env.CLERK_JWT_KEY = publicPem.replace(/\n/g, '\\n');

const sign = ({ sub, azp = ORIGIN, expSeconds = 300 } = {}) =>
	new SignJWT({ azp })
		.setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
		.setSubject(sub)
		.setIssuedAt(Math.floor(Date.now() / 1000) - 10)
		.setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
		.sign(privateKey);

const ownerToken = await sign({ sub: OWNER });
const adminToken = await sign({ sub: ADMIN });
const plainToken = await sign({ sub: PLAIN });

/* ------------------------------ clean state --------------------------- */

const db = createDb(env);

async function clearCollection(name, collectionRef = db.collection(name)) {
	const snapshot = await collectionRef.get();

	for (const doc of snapshot.docs) {
		await collectionRef.doc(doc.id).delete();
	}
}

for (const name of ['customProducts', 'orders', 'carts', 'users', 'userActivity']) {
	await clearCollection(name);
}

// Deleting a user document does not delete its subcollections.
for (const uid of [OWNER, ADMIN, PLAIN]) {
	await clearCollection('favorites', db.collection('users').doc(uid).collection('favorites'));
}

/* -------------------------------- seed -------------------------------- */

await db.collection('users').doc(OWNER).set({ userId: OWNER, role: 'owner' });
await db.collection('users').doc(ADMIN).set({ userId: ADMIN, role: 'admin' });
await db.collection('users').doc(PLAIN).set({ userId: PLAIN, role: 'user' });

const product = (id, data) => db.collection('customProducts').doc(id).set(data);

await product('p-active-1', { title: 'Lamp', price: 50, stock: 4, status: 'active', images: ['https://x/1.jpg'], category: 'home', description: 'd', discountPercentage: 0, rating: 4, shippingInformation: 's' });
await product('p-active-2', { title: 'Chair', price: 120.5, stock: 7, status: 'active', images: [], category: 'home', description: 'd', discountPercentage: 0, rating: 4, shippingInformation: 's' });
await product('p-zero-stock', { title: 'Sold Out Label', price: 10, stock: 0, status: 'active', images: [], category: 'home', description: 'd', discountPercentage: 0, rating: 4, shippingInformation: 's' });
await product('p-archived', { title: 'Archived', price: 300, stock: 2, status: 'archived', images: [], category: 'home', description: 'd', discountPercentage: 0, rating: 4, shippingInformation: 's' });

// extra products for the favorites cap test
for (let i = 1; i <= 16; i += 1) {
	await product(`f-${i}`, { title: `Fav ${i}`, price: i, stock: 9, status: 'active', images: [], category: 'home', description: 'd', discountPercentage: 0, rating: 4, shippingInformation: 's' });
}

console.log('seeded users + products\n');

/* ------------------------------ health / auth ------------------------- */

let r = await call('/api');
check('GET /api health payload', r.status === 200 && r.json?.success === true, JSON.stringify(r.json));

r = await call('/authCheck', { method: 'POST' });
check('authCheck without token -> 401', r.status === 401 && r.json?.message === 'Authentication required', JSON.stringify(r.json));

r = await call('/authCheck', { method: 'POST', token: ownerToken });
check('authCheck valid token -> userId', r.status === 200 && r.json?.userId === OWNER, JSON.stringify(r.json));

r = await call('/authCheck', { method: 'POST', token: ownerToken });
check('CORS header echoes allowed origin', r.headers.get('access-control-allow-origin') === ORIGIN);

r = await call('/authCheck', { method: 'POST', token: await sign({ sub: OWNER, expSeconds: -60 }) });
check('expired token -> 401', r.status === 401, String(r.status));

r = await call('/authCheck', { method: 'POST', token: await sign({ sub: OWNER, azp: 'https://evil.example.com' }) });
check('foreign azp -> 401', r.status === 401, String(r.status));

r = await call('/authCheck', { method: 'GET', token: ownerToken });
check('authCheck wrong method -> 405', r.status === 405, String(r.status));

r = await call('/doesNotExist');
check('unknown route -> 404', r.status === 404, String(r.status));

/* ------------------------------- products ----------------------------- */

r = await call('/getCustomProducts');
const activeIds = (r.json?.products || []).map((p) => p.id).sort();
check('getCustomProducts returns active only', r.status === 200 && !activeIds.includes('p-archived') && activeIds.includes('p-zero-stock'), JSON.stringify(activeIds));

r = await call('/getCustomProducts', { method: 'OPTIONS' });
check('OPTIONS preflight -> 204 + CORS', r.status === 204 && r.headers.get('access-control-allow-origin') === ORIGIN, String(r.status));

r = await call('/getCustomProducts', { origin: 'https://nope.example.com' });
check('disallowed origin has no CORS header', r.status === 200 && !r.headers.get('access-control-allow-origin'));

r = await call('/getCustomProducts', { method: 'POST' });
check('getCustomProducts wrong method -> 405', r.status === 405, String(r.status));

/* -------------------------------- roles ------------------------------- */

r = await call('/getMyRole', { token: plainToken });
check('getMyRole plain -> user', r.status === 200 && r.json?.role === 'user', JSON.stringify(r.json));

r = await call('/getMyRole', { token: ownerToken });
check('getMyRole owner -> owner', r.status === 200 && r.json?.role === 'owner', JSON.stringify(r.json));

r = await call('/getMyRole');
check('getMyRole without token -> 401', r.status === 401, String(r.status));

r = await call('/updateUserRole', { method: 'POST', token: adminToken, body: { targetUserId: PLAIN, role: 'admin' } });
check('updateUserRole by admin -> 403', r.status === 403, JSON.stringify(r.json));

r = await call('/updateUserRole', { method: 'POST', token: ownerToken, body: { targetUserId: 'user_x', role: 'boss' } });
check('updateUserRole invalid role -> 400', r.status === 400, JSON.stringify(r.json));

/* --------------------------------- cart -------------------------------- */

r = await call('/cart', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-active-2', quantity: 3 }] } });
check('cart POST saves products', r.status === 200 && r.json?.products?.[0]?.quantity === 3, JSON.stringify(r.json?.message));
check('cart totalPrice computed', r.json?.products?.[0]?.totalPrice === 361.5, JSON.stringify(r.json?.products?.[0]?.totalPrice));

r = await call('/cart', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-zero-stock', quantity: 8 }] } });
check('cart accepts out-of-stock product (guard removed)', r.status === 200, JSON.stringify(r.json?.message));

r = await call('/cart', { token: plainToken });
check('cart GET returns saved cart', r.status === 200 && r.json?.products?.length === 1, JSON.stringify(r.json?.products?.length));

r = await call('/cart', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-active-1', quantity: 0 }] } });
check('cart rejects quantity 0 -> 400', r.status === 400, JSON.stringify(r.json?.message));

r = await call('/cart', { method: 'POST', token: plainToken, body: { products: [{ productId: 'missing-id', quantity: 1 }] } });
check('cart rejects unknown product -> 400', r.status === 400 && r.json?.message === 'Product not found', JSON.stringify(r.json));

/* ------------------------------ favorites ------------------------------ */

r = await call('/addUserFavorite', { method: 'POST', token: plainToken, body: { productId: 'p-active-1' } });
check('addUserFavorite -> 200', r.status === 200 && r.json?.productId === 'p-active-1', JSON.stringify(r.json?.message));

r = await call('/addUserFavorite', { method: 'POST', token: plainToken, body: { productId: 'p-active-1' } });
check('addUserFavorite duplicate -> already exists', r.status === 200 && /already/.test(r.json?.message || ''), JSON.stringify(r.json?.message));

r = await call('/getUserFavorites', { token: plainToken });
check('getUserFavorites returns enriched product', r.status === 200 && r.json?.favorites?.[0]?.title === 'Lamp', JSON.stringify(r.json?.favorites?.[0]?.title));

r = await call('/syncUserFavorites', { method: 'POST', token: plainToken, body: { productIds: ['p-active-2', 'p-zero-stock'] } });
check('syncUserFavorites merges ids', r.status === 200 && r.json?.productIds?.length === 3, JSON.stringify(r.json?.productIds));

r = await call('/removeUserFavorite', { method: 'DELETE', token: plainToken, body: { productId: 'p-active-1' } });
check('removeUserFavorite -> 200', r.status === 200, JSON.stringify(r.json?.message));

// cap of 15
for (let i = 1; i <= 13; i += 1) {
	await call('/addUserFavorite', { method: 'POST', token: plainToken, body: { productId: `f-${i}` } });
}

r = await call('/addUserFavorite', { method: 'POST', token: plainToken, body: { productId: 'f-14' } });
check('favorites cap enforcement -> 409', r.status === 409, JSON.stringify(r.json));

/* -------------------------------- orders ------------------------------- */

const shipping = { address: '1 Main St', city: 'Springfield', zip: '12345', phone: '555-0100' };

r = await call('/createOrder', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-zero-stock', quantity: 5 }, { productId: 'p-active-2', quantity: 2 }], shippingInformation: shipping, paymentMethod: 'cod' } });
check('createOrder accepts out-of-stock product (guard removed)', r.status === 201, JSON.stringify(r.json));
check('createOrder computes total', r.json?.order?.totalPrice === 291, JSON.stringify(r.json?.order?.totalPrice));

r = await call('/getMyOrders', { token: plainToken });
check('getMyOrders lists the order', r.status === 200 && Array.isArray(r.json?.orders) && r.json.orders.length === 1, JSON.stringify(r.json?.orders?.length));

const myOrderId = r.json?.orders?.[0]?.orderId;

r = await call(`/getOrder?orderId=${myOrderId}`, { token: plainToken });
check('getOrder owner -> 200', r.status === 200 && r.json?.order?.orderId === myOrderId, JSON.stringify(r.json?.message));

r = await call(`/getOrder?orderId=${myOrderId}`, { token: adminToken });
check('getOrder other user -> 403', r.status === 403, String(r.status));

r = await call('/createOrder', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-active-1', quantity: 1 }], shippingInformation: { address: 'x' }, paymentMethod: 'cod' } });
check('createOrder incomplete shipping -> 400', r.status === 400, JSON.stringify(r.json?.message));

r = await call('/createOrder', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-active-1', quantity: 1 }], shippingInformation: shipping, paymentMethod: 'paypal' } });
check('createOrder invalid payment -> 400', r.status === 400, JSON.stringify(r.json?.message));

r = await call('/createOrder', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-active-1', quantity: 1 }, { productId: 'p-active-1', quantity: 2 }], shippingInformation: shipping, paymentMethod: 'cod' } });
check('createOrder duplicate product -> 400', r.status === 400, JSON.stringify(r.json?.message));

/* --------------------------- admin order actions ----------------------- */

r = await call('/getAllOrders', { token: plainToken });
check('getAllOrders as user -> 403', r.status === 403, String(r.status));

r = await call('/getAllOrders', { token: adminToken });
check('getAllOrders as admin -> 200', r.status === 200 && Array.isArray(r.json?.orders), JSON.stringify(r.json?.message));

r = await call('/updateOrderStatus', { method: 'POST', token: plainToken, body: { orderId: myOrderId, status: 'processing' } });
check('updateOrderStatus as user -> 403', r.status === 403, String(r.status));

r = await call('/updateOrderStatus', { method: 'POST', token: adminToken, body: { orderId: myOrderId, status: 'processing' } });
check('updateOrderStatus as admin -> 200', r.status === 200 && r.json?.status === 'processing', JSON.stringify(r.json));

r = await call('/updateOrderStatus', { method: 'POST', token: adminToken, body: { orderId: myOrderId, status: 'delivered' } });
check('updateOrderStatus to delivered -> 200', r.status === 200, JSON.stringify(r.json?.message));

/* second order to test cancel + revenue limits */
r = await call('/createOrder', { method: 'POST', token: plainToken, body: { products: [{ productId: 'p-active-2', quantity: 1 }], shippingInformation: shipping, paymentMethod: 'dc' } });
const secondOrderId = (await call('/getMyOrders', { token: plainToken })).json.orders.find((o) => o.orderId !== myOrderId)?.orderId;

r = await call('/cancelOrder', { method: 'POST', token: adminToken, body: { orderId: secondOrderId } });
check('cancelOrder other user -> 403', r.status === 403, JSON.stringify(r.json?.message));

r = await call('/cancelOrder', { method: 'POST', token: plainToken, body: { orderId: secondOrderId } });
check('cancelOrder owner -> 200', r.status === 200 && r.json?.status === 'cancelled', JSON.stringify(r.json));

r = await call('/cancelOrder', { method: 'POST', token: plainToken, body: { orderId: secondOrderId } });
check('cancelOrder twice -> 409', r.status === 409, String(r.status));

r = await call('/updateOrderStatus', { method: 'POST', token: adminToken, body: { orderId: secondOrderId, status: 'shipped' } });
check('updateOrderStatus on cancelled -> 409', r.status === 409, JSON.stringify(r.json?.message));

/* ------------------------------- revenue ------------------------------- */

r = await call('/getOwnerDeliveredRevenue', { token: adminToken });
check('getOwnerDeliveredRevenue as admin -> 403', r.status === 403, String(r.status));

r = await call('/getOwnerDeliveredRevenue', { token: ownerToken });
check('getOwnerDeliveredRevenue as owner -> 200', r.status === 200 && r.json?.success === true, JSON.stringify(r.json?.message));
check('revenue sums delivered orders only', r.json?.totalDeliveredOrders === 1 && r.json?.totalDeliveredRevenue === 291, JSON.stringify({ n: r.json?.totalDeliveredOrders, total: r.json?.totalDeliveredRevenue }));

/* -------------------------- product management ------------------------- */

r = await call('/getAdminCustomProducts', { token: plainToken });
check('getAdminCustomProducts as user -> 403', r.status === 403, String(r.status));

r = await call('/getAdminCustomProducts', { token: adminToken });
check('getAdminCustomProducts includes archived', r.status === 200 && (r.json?.products || []).some((p) => p.id === 'p-archived'), String(r.json?.products?.length));

const newProduct = { title: 'New Vase', description: 'A vase', price: 25, discountPercentage: 0, rating: 4.5, stock: 0, category: 'home', images: ['https://x/v.jpg'], shippingInformation: 'ships' };

r = await call('/createCustomProduct', { method: 'POST', token: plainToken, body: newProduct });
check('createCustomProduct as user -> 403', r.status === 403, String(r.status));

r = await call('/createCustomProduct', { method: 'POST', token: adminToken, body: { ...newProduct, title: '' } });
check('createCustomProduct invalid -> 400', r.status === 400, JSON.stringify(r.json?.message));

r = await call('/createCustomProduct', { method: 'POST', token: adminToken, body: newProduct });
check('createCustomProduct as admin -> 201', r.status === 201 && r.json?.product?.title === 'New Vase', JSON.stringify(r.json?.message));

const createdId = r.json?.product?.id;

r = await call('/updateCustomProduct', { method: 'PUT', token: adminToken, body: { ...newProduct, id: createdId, title: 'Renamed Vase' } });
check('updateCustomProduct -> 200', r.status === 200 && r.json?.product?.title === 'Renamed Vase', JSON.stringify(r.json?.message));

r = await call('/ArchivedCustomProduct', { method: 'DELETE', token: adminToken, body: { id: createdId } });
check('ArchivedCustomProduct -> archived', r.status === 200, JSON.stringify(r.json?.message));

r = await call('/getCustomProducts');
check('archived product hidden from storefront', !(r.json?.products || []).some((p) => p.id === createdId));

r = await call('/deleteCustomProduct', { method: 'DELETE', token: adminToken, body: { id: createdId } });
check('deleteCustomProduct -> 200', r.status === 200, JSON.stringify(r.json?.message));

/* ------------------------------- activity ------------------------------ */

r = await call('/getAllUserActivities', { token: plainToken });
check('getAllUserActivities as user -> 403', r.status === 403, String(r.status));

r = await call('/getAllUserActivities', { token: adminToken });
check('getAllUserActivities as admin -> 200', r.status === 200 && Array.isArray(r.json?.activities) && r.json.activities.length > 0, JSON.stringify(r.json?.activities?.length));
check('activity feed is newest first', (() => {
	const list = r.json?.activities || [];
	return list.length < 2 || new Date(list[0].createdAt).getTime() >= new Date(list[1].createdAt).getTime();
})());

r = await call(`/getUserActivities?userId=${PLAIN}`, { token: adminToken });
check('getUserActivities -> 200', r.status === 200 && r.json?.userId === PLAIN, JSON.stringify(r.json?.message));

r = await call('/getUserActivities', { token: adminToken });
check('getUserActivities without userId -> 400', r.status === 400, JSON.stringify(r.json?.message));

r = await call('/getAllUsers', { token: plainToken });
check('getAllUsers as user -> 403', r.status === 403, String(r.status));

/* --------------------------- clerk enrichment -------------------------- */

r = await call('/getAllOrders', { token: adminToken });
const enrichedOrder = (r.json?.orders || [])[0];
check('getAllOrders enriches customer email', r.status === 200 && enrichedOrder?.customer?.email === 'buyer@example.com', JSON.stringify(enrichedOrder?.customer));

r = await call('/getAllUsers', { token: adminToken });
check('getAllUsers as admin -> 403 (owner only)', r.status === 403, JSON.stringify(r.json?.message));

r = await call('/getAllUsers', { token: ownerToken });
check('getAllUsers as owner -> 200', r.status === 200 && Array.isArray(r.json?.users) && r.json.users.length === 3, JSON.stringify(r.json?.message || r.json?.users?.length));
check('getAllUsers maps clerk emails', (r.json?.users || []).some((u) => u.email === 'owner@example.com' && u.role === 'owner'), JSON.stringify(r.json?.users?.[0]));
check('clerk api was actually called', clerkCalls > 0, String(clerkCalls));

/* ---------------------------- pagination ------------------------------ */

r = await call('/getAllUserActivities?limit=2', { token: adminToken });
const firstPage = r.json?.activities || [];
check('activity pagination honours limit', r.status === 200 && firstPage.length <= 2, String(firstPage.length));

if (r.json?.nextCursor) {
	const second = await call(`/getAllUserActivities?limit=2&cursor=${encodeURIComponent(r.json.nextCursor)}`, { token: adminToken });
	const secondPage = second.json?.activities || [];

	check('activity cursor returns a different page', second.status === 200 && secondPage.every((a) => !firstPage.some((b) => b.id === a.id)), JSON.stringify(secondPage.map((a) => a.id)));
} else {
	check('activity cursor returns a different page', firstPage.length < 2, 'no cursor returned');
}

/* ------------------------------ bad input ----------------------------- */

r = await call('/updateOrderStatus', { method: 'POST', token: adminToken, body: { orderId: 'does-not-exist', status: 'shipped' } });
check('updateOrderStatus unknown order -> 404', r.status === 404, JSON.stringify(r.json?.message));

r = await call('/getOrder', { token: plainToken });
check('getOrder without orderId -> 400', r.status === 400, JSON.stringify(r.json?.message));

r = await call('/createOrder', { method: 'POST', token: plainToken, body: { products: [], shippingInformation: {}, paymentMethod: 'cod' } });
check('createOrder without products -> 400', r.status === 400, JSON.stringify(r.json?.message));

r = await call('/unknown-endpoint', { token: plainToken });
check('unknown endpoint -> 404', r.status === 404, String(r.status));

/* ------------------------------ summary -------------------------------- */

console.log(`\n${passed} passed, ${failed} failed`);

process.exitCode = failed === 0 ? 0 : 1;
