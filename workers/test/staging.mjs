// End-to-end smoke test against the real staging Firestore project.
// Auth: reuses the local Firebase CLI refresh token (never persisted, never committed)
// to mint a short-lived OAuth access token, so no service-account file is needed.
//
// Usage: node test/staging.mjs

import fs from 'node:fs';
import path from 'node:path';
import { subtle } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';

import worker from '../src/index.js';
import { createDb } from '../src/firestore.js';

const PROJECT = process.env.STAGING_PROJECT || 'ecom-staging-haidara';
const ORIGIN = 'http://localhost:5173';
const OWNER = 'user_staging_owner';
const ADMIN = 'user_staging_admin';
const PLAIN = 'user_staging_plain';

/* ------------------------------- auth token ---------------------------- */

async function accessToken() {
	if (process.env.STAGING_ACCESS_TOKEN) return process.env.STAGING_ACCESS_TOKEN;

	const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'configstore', 'firebase-tools.json');
	const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
	const refreshToken = config.tokens?.refresh_token;

	if (!refreshToken) throw new Error('No Firebase CLI refresh token found; set STAGING_ACCESS_TOKEN instead');

	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
			client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
		}),
		signal: AbortSignal.timeout(20000),
	});

	if (!response.ok) throw new Error(`Token refresh failed (${response.status}): ${(await response.text()).slice(0, 200)}`);

	return (await response.json()).access_token;
}

/* ------------------------------ clerk mock ----------------------------- */

const clerkUsers = {
	[OWNER]: { id: OWNER, first_name: 'Owner', last_name: 'One', email_addresses: [{ id: 'oe', email_address: 'owner@example.com' }], primary_email_address_id: 'oe' },
	[ADMIN]: { id: ADMIN, first_name: 'Ada', last_name: 'Admin', email_addresses: [{ id: 'ae', email_address: 'admin@example.com' }], primary_email_address_id: 'ae' },
	[PLAIN]: { id: PLAIN, first_name: 'Pat', last_name: 'Buyer', email_addresses: [{ id: 'pe', email_address: 'buyer@example.com' }], primary_email_address_id: 'pe' },
};

const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
	const url = typeof input === 'string' ? input : input.url;

	if (!url.startsWith('https://api.clerk.com/v1')) return realFetch(input, init);

	const parsed = new URL(url);
	const pathname = parsed.pathname.replace(/^\/v1/, '');
	const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });

	if (pathname === '/users') {
		const ids = parsed.searchParams.getAll('user_id');
		return json(ids.length > 0 ? ids.map((id) => clerkUsers[id]).filter(Boolean) : Object.values(clerkUsers));
	}

	const single = pathname.match(/^\/users\/([^/]+)$/);

	if (single) {
		const user = clerkUsers[decodeURIComponent(single[1])];
		return user ? json(user) : json({ error: { message: 'not found' } }, 404);
	}

	return json({ error: { message: `unhandled ${pathname}` } }, 400);
};

/* ------------------------------ harness -------------------------------- */

let passed = 0;
let failed = 0;

const check = (name, ok, detail = '') => {
	if (ok) {
		passed += 1;
		console.log(`PASS  ${name}`);
	} else {
		failed += 1;
		console.log(`FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
	}
};

const token = await accessToken();

const env = {
	FIREBASE_PROJECT_ID: PROJECT,
	FIRESTORE_ACCESS_TOKEN: token,
	ALLOWED_ORIGINS: ORIGIN,
	OWNER_CLERK_USER_ID: OWNER,
	CLERK_SECRET_KEY: 'sk_test_mock_for_staging',
};

const db = createDb(env);

const keyPair = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const toPem = (buffer, label) => `-----BEGIN ${label}-----\n${Buffer.from(buffer).toString('base64').replace(/.{1,64}/g, '$&\n').trim()}\n-----END ${label}-----`;
const publicPem = toPem(await subtle.exportKey('spki', keyPair.publicKey), 'PUBLIC KEY');
const privateKey = await importPKCS8(toPem(await subtle.exportKey('pkcs8', keyPair.privateKey), 'PRIVATE KEY'), 'RS256');

env.CLERK_JWT_KEY = publicPem.replace(/\n/g, '\\n');

const sign = (sub) =>
	new SignJWT({ azp: ORIGIN })
		.setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
		.setSubject(sub)
		.setIssuedAt(Math.floor(Date.now() / 1000) - 10)
		.setExpirationTime(Math.floor(Date.now() / 1000) + 600)
		.sign(privateKey);

const ownerToken = await sign(OWNER);
const adminToken = await sign(ADMIN);
const plainToken = await sign(PLAIN);

async function call(pathname, { method = 'GET', tok, body } = {}) {
	const headers = { Origin: ORIGIN };

	if (tok) headers.Authorization = `Bearer ${tok}`;

	const response = await worker.fetch(
		new Request(`https://api.test${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
		env,
	);

	let json = null;

	try {
		json = await response.clone().json();
	} catch {
		json = null;
	}

	return { status: response.status, json, text: await response.text() };
}

/* -------------------------------- seed --------------------------------- */

const stamp = Date.now();
const created = new Set();

const cleanup = async () => {
	for (const p of created) await db.collection('customProducts').doc(p).delete().catch(() => {});
};

console.log(`staging project: ${PROJECT}\n`);

const seedAdmin = await call('/updateUserRole', { method: 'POST', tok: ownerToken, body: { targetUserId: ADMIN, role: 'admin' } });

if (seedAdmin.status !== 200) {
	await db.collection('users').doc(OWNER).set({ userId: OWNER, role: 'owner' });
	await db.collection('users').doc(ADMIN).set({ userId: ADMIN, role: 'admin' });
}

const product = {
	title: `Staging Lamp ${stamp}`,
	description: 'staging smoke test',
	price: 25,
	discountPercentage: 0,
	rating: 4,
	stock: 0,
	category: 'home',
	images: ['https://example.com/staging-smoke.jpg'],
	shippingInformation: 'ships in 2 days',
};

const createdProduct = await call('/createCustomProduct', { method: 'POST', tok: adminToken, body: product });
check('real Firestore: createCustomProduct -> 201', createdProduct.status === 201, JSON.stringify(createdProduct.json?.message));

const productId = createdProduct.json?.product?.id;
if (productId) created.add(productId);

const storefront = await call('/getCustomProducts');
check('real Firestore: getCustomProducts includes new product', (storefront.json?.products || []).some((p) => p.id === productId), JSON.stringify(storefront.status));

/* --------------------------- worker permission ------------------------- */

const roles = await call('/getMyRole', { tok: ownerToken });
check('real Firestore: getMyRole owner', roles.json?.role === 'owner', JSON.stringify(roles.json));

/* -------------------------------- cart --------------------------------- */

const cartSave = await call('/cart', { method: 'POST', tok: plainToken, body: { products: [{ productId, quantity: 3 }] } });
check('real Firestore: cart transaction -> 200', cartSave.status === 200, JSON.stringify(cartSave.json?.message));
check('real Firestore: cart accepts zero-stock product', cartSave.json?.products?.[0]?.quantity === 3, JSON.stringify(cartSave.json?.products));

const cartGet = await call('/cart', { tok: plainToken });
check('real Firestore: cart GET reads transaction write', cartGet.json?.products?.length === 1, JSON.stringify(cartGet.json?.products?.length));

/* ------------------------------- favorites ----------------------------- */

const favAdd = await call('/addUserFavorite', { method: 'POST', tok: plainToken, body: { productId } });
check('real Firestore: addUserFavorite -> 200', favAdd.status === 200, JSON.stringify(favAdd.json?.message));

const favDup = await call('/addUserFavorite', { method: 'POST', tok: plainToken, body: { productId } });
check('real Firestore: duplicate favorite detected', favDup.json?.message === 'Product is already in favorites', JSON.stringify(favDup.json?.message));

const favList = await call('/getUserFavorites', { tok: plainToken });
check('real Firestore: subcollection query returns favorite', (favList.json?.favorites || []).some((f) => f.productId === productId), JSON.stringify(favList.json?.favorites));

const favSync = await call('/syncUserFavorites', { method: 'POST', tok: plainToken, body: { productIds: [productId] } });
check('real Firestore: syncUserFavorites -> 200', favSync.status === 200, JSON.stringify(favSync.json));

/* -------------------------------- orders ------------------------------- */

const shippingInformation = { address: '1 Main St', city: 'Springfield', zip: '12345', phone: '555-0100' };

const order = await call('/createOrder', { method: 'POST', tok: plainToken, body: { products: [{ productId, quantity: 2 }], shippingInformation, paymentMethod: 'cod' } });
check('real Firestore: createOrder -> 201', order.status === 201, JSON.stringify(order.json?.message));
check('real Firestore: createOrder uses clerk customer data', order.json?.order?.customer?.email === 'buyer@example.com', JSON.stringify(order.json?.order?.customer));

const orderId = order.json?.order?.orderId;

if (orderId) {
	const myOrders = await call('/getMyOrders', { tok: plainToken });
	check('real Firestore: getMyOrders returns the order', (myOrders.json?.orders || []).some((o) => o.orderId === orderId), JSON.stringify(myOrders.json?.orders?.length));

	const oneOrder = await call(`/getOrder?orderId=${orderId}`, { tok: plainToken });
	check('real Firestore: getOrder -> 200', oneOrder.status === 200 && oneOrder.json?.order?.orderId === orderId, JSON.stringify(oneOrder.status));

	const forbidden = await call(`/getOrder?orderId=${orderId}`, { tok: adminToken });
	check('real Firestore: getOrder blocks other users', forbidden.status === 403, String(forbidden.status));

	const allOrders = await call('/getAllOrders', { tok: adminToken });
	check('real Firestore: getAllOrders enriched', ((allOrders.json?.orders || [])[0]?.customer?.email || '') !== '', JSON.stringify(allOrders.json?.orders?.[0]?.customer));

	const delivered = await call('/updateOrderStatus', { method: 'POST', tok: adminToken, body: { orderId, status: 'delivered' } });
	check('real Firestore: updateOrderStatus transaction -> 200', delivered.status === 200 && delivered.json?.status === 'delivered', JSON.stringify(delivered.json?.message));
}

const revenue = await call('/getOwnerDeliveredRevenue', { tok: ownerToken });
check('real Firestore: getOwnerDeliveredRevenue -> 200', revenue.status === 200, String(revenue.status));

const activities = await call('/getAllUserActivities?limit=5', { tok: adminToken });
check('real Firestore: activity feed -> 200', activities.status === 200 && Array.isArray(activities.json?.activities), String(activities.status));

const users = await call('/getAllUsers', { tok: ownerToken });
check('real Firestore: getAllUsers -> 200', users.status === 200 && Array.isArray(users.json?.users), String(users.status));

/* ------------------------------- cleanup ------------------------------- */

const removeFav = await call('/removeUserFavorite', { method: 'DELETE', tok: plainToken, body: { productId } });
check('real Firestore: removeUserFavorite -> 200', removeFav.status === 200, JSON.stringify(removeFav.json?.message));

const del = await call('/deleteCustomProduct', { method: 'DELETE', tok: adminToken, body: { id: productId } });
check('real Firestore: deleteCustomProduct -> 200', del.status === 200, JSON.stringify(del.json?.message));

await cleanup();

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
