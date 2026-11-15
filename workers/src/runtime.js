// Runtime shims that let functions/index.js run on Workers verbatim:
//   - per-request env + db through AsyncLocalStorage (safe under concurrency)
//   - verifyToken()          -> jose, same PEM, same authorizedParties check
//   - createClerkClient()    -> Clerk REST, camelCase mapping like the SDK
//   - FieldValue / db proxy  -> Firestore REST client

import { AsyncLocalStorage } from 'node:async_hooks';
import { jwtVerify, importSPKI } from 'jose';

import { createDb, FieldValue } from './firestore.js';

const storage = new AsyncLocalStorage();

export { FieldValue };

export function runWithContext(env, fn) {
	const db = createDb(env);

	return storage.run({ env, db }, fn);
}

export function currentEnv() {
	return storage.getStore()?.env ?? {};
}

export function getDb() {
	const store = storage.getStore();

	if (!store) throw new Error('Firestore accessed outside of a request context');

	return store.db;
}

// index.js keeps calling db.collection(...) / db.batch() / db.runTransaction()
export const db = new Proxy(
	{},
	{
		get(_target, property) {
			const target = getDb();
			const value = target[property];

			return typeof value === 'function' ? value.bind(target) : value;
		},
	},
);

/* ----------------------------- Clerk JWT ----------------------------- */

let keyCache = { pem: null, key: null };

async function publicKey(pem) {
	if (keyCache.pem !== pem) {
		keyCache = { pem, key: await importSPKI(pem, 'RS256', { extractable: true }) };
	}

	return keyCache.key;
}

// Same contract as @clerk/backend verifyToken for the options used here.
export async function verifyToken(token, { jwtKey, authorizedParties } = {}) {

	if (!jwtKey) throw new Error('CLERK_JWT_KEY is not configured');

	const { payload } = await jwtVerify(token, await publicKey(jwtKey), {
		algorithms: ['RS256'],
	});

	let authorized = true;

	if (Array.isArray(authorizedParties)) {
		authorized = authorizedParties.includes(payload.azp);
	} else if (authorizedParties && typeof authorizedParties.includes === 'function') {
		authorized = authorizedParties.includes(payload.azp);
	}

	if (!authorized || !payload.azp) {
		throw new Error('Invalid authorized party');
	}

	return payload;
}

/* ---------------------------- Clerk users ---------------------------- */

function mapUser(user) {
	return {
		id: user.id,
		firstName: user.first_name,
		lastName: user.last_name,
		imageUrl: user.image_url,
		primaryEmailAddressId: user.primary_email_address_id,
		emailAddresses: (user.email_addresses || []).map((email) => ({
			id: email.id,
			emailAddress: email.email_address,
		})),
		createdAt: user.created_at,
	};
}

async function clerkRequest(secretKey, path) {
	if (!secretKey) throw new Error('CLERK_SECRET_KEY is not configured');

	const response = await fetch(`https://api.clerk.com/v1${path}`, {
		headers: { Authorization: `Bearer ${String(secretKey).trim()}` },
	});

	if (!response.ok) throw new Error(`Clerk request failed (${response.status})`);

	return response.json();
}

// Mirrors the subset of createClerkClient() that index.js uses.
export function createClerkClient({ secretKey } = {}) {
	const key = secretKey || currentEnv().CLERK_SECRET_KEY;

	return {
		users: {
			async getUser(userId) {
				return mapUser(await clerkRequest(key, `/users/${encodeURIComponent(userId)}`));
			},
			async getUserList({ userId, limit } = {}) {
				const params = new URLSearchParams();

				if (limit) params.set('limit', String(limit));

				for (const id of [].concat(userId || [])) {
					params.append('user_id', id);
				}

				const users = await clerkRequest(key, `/users?${params.toString()}`);

				return {
					data: (Array.isArray(users) ? users : []).map(mapUser),
					totalCount: Array.isArray(users) ? users.length : 0,
				};
			},
		},
	};
}

export const logger = console;

export const initializeApp = () => ({});

export const getFirestore = () => db;

export const setGlobalOptions = () => {};

export const defineSecret = (name) => name;

export const onRequest = (optionsOrHandler, maybeHandler) => (typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler);

export function allowedOrigins(env) {
	const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];

	return [
		...new Set(
			[...((env && env.ALLOWED_ORIGINS) || '').split(','), ...devOrigins].map((origin) => origin.trim().replace(/\/+$/, '')).filter(Boolean),
		),
	];
}

// Shape compatible with ALLOWED_ORIGINS.includes(origin) and with
// verifyToken({ authorizedParties: ALLOWED_ORIGINS }).
export const allowedOriginsView = {
	includes(origin) {
		return allowedOrigins(currentEnv()).includes(origin);
	},
};
