// Firestore over REST, exposing the same surface index.js already uses:
//   db.collection('x').where('f','==',v).get()
//   db.collection('x').doc(id).get()/set()/update()/delete()
//   db.collection('a').doc(id).collection('b')   (subcollections)
//   db.batch(), db.runTransaction(), FieldValue.serverTimestamp()/delete()
// The Admin SDK cannot run on Workers (gRPC), this replaces it without
// touching handler code.

import { SignJWT, importPKCS8 } from 'jose';

const SERVER_TIMESTAMP = Symbol('serverTimestamp');
const DELETE_FIELD = Symbol('deleteField');

export const FieldValue = {
	serverTimestamp: () => SERVER_TIMESTAMP,
	delete: () => DELETE_FIELD,
};

const OPERATORS = {
	'==': 'EQUAL',
	'!=': 'NOT_EQUAL',
	'<': 'LESS_THAN',
	'<=': 'LESS_THAN_OR_EQUAL',
	'>': 'GREATER_THAN',
	'>=': 'GREATER_THAN_OR_EQUAL',
	'array-contains': 'ARRAY_CONTAINS',
	'in': 'IN',
	'not-in': 'NOT_IN',
	'array-contains-any': 'ARRAY_CONTAINS_ANY',
};

const AUTO_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/* ------------------------------- codec ------------------------------- */

function encodeValue(value) {
	if (value === null || value === undefined) return { nullValue: null };
	if (typeof value === 'boolean') return { booleanValue: value };
	if (typeof value === 'number') {
		return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
	}
	if (typeof value === 'string') return { stringValue: value };
	if (value instanceof Date) return { timestampValue: value.toISOString() };
	if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
	if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } };

	throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

function encodeFields(data) {
	const fields = {};

	for (const [key, value] of Object.entries(data || {})) {
		if (value === SERVER_TIMESTAMP || value === DELETE_FIELD) continue;
		fields[key] = encodeValue(value);
	}

	return fields;
}

function decodeValue(value) {
	if (!value || typeof value !== 'object') return null;
	if ('nullValue' in value) return null;
	if ('booleanValue' in value) return Boolean(value.booleanValue);
	if ('integerValue' in value) return Number(value.integerValue);
	if ('doubleValue' in value) return Number(value.doubleValue);
	if ('stringValue' in value) return value.stringValue;
	if ('timestampValue' in value) return value.timestampValue;
	if ('bytesValue' in value) return value.bytesValue;
	if ('referenceValue' in value) return value.referenceValue;
	if ('geoPointValue' in value) return value.geoPointValue;
	if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
	if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});

	return null;
}

function decodeFields(fields) {
	const data = {};

	for (const [key, value] of Object.entries(fields || {})) {
		data[key] = decodeValue(value);
	}

	return data;
}

/* ------------------------------- auth -------------------------------- */

let cachedToken = { token: null, expiresAt: 0 };
let cachedKey = { pem: null, key: null };

function serviceAccount(env) {
	const raw = env.FIRESTORE_SERVICE_ACCOUNT;

	if (!raw) throw new Error('FIRESTORE_SERVICE_ACCOUNT is not configured');

	return typeof raw === 'string' ? JSON.parse(raw.replace(/^\uFEFF/, "")) : raw;
}

async function accessToken(env) {
	if (env.FIRESTORE_ACCESS_TOKEN) return env.FIRESTORE_ACCESS_TOKEN;

	const now = Math.floor(Date.now() / 1000);

	if (cachedToken.token && cachedToken.expiresAt > now) return cachedToken.token;

	const sa = serviceAccount(env);

	if (cachedKey.pem !== sa.private_key) {
		cachedKey = { pem: sa.private_key, key: await importPKCS8(sa.private_key, 'RS256') };
	}

	const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
		.setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id })
		.setIssuer(sa.client_email)
		.setAudience('https://oauth2.googleapis.com/token')
		.setIssuedAt(now)
		.setExpirationTime(now + 3600)
		.sign(cachedKey.key);

	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion,
		}),
	});

	if (!res.ok) {
		throw new Error(`Firestore service-account auth failed (${res.status})`);
	}

	const data = await res.json();

	cachedToken = {
		token: data.access_token,
		expiresAt: now + (data.expires_in || 3600) - 60,
	};

	return cachedToken.token;
}

function emulatorHost(env) {
	return env.FIRESTORE_EMULATOR_HOST ? env.FIRESTORE_EMULATOR_HOST.replace(/\/+$/, '') : null;
}

function documentsRoot(env) {
	const project = env.FIREBASE_PROJECT_ID;

	if (!project) throw new Error('FIREBASE_PROJECT_ID is not configured');

	const host = emulatorHost(env);

	return host ? `${host}/v1/projects/${project}/databases/(default)/documents` : `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
}

// Firestore document resource names are NOT URLs — they must be
// projects/{p}/databases/(default)/documents/{path}, even against the emulator.
function documentName(env, path) {
	const project = env.FIREBASE_PROJECT_ID;

	if (!project) throw new Error('FIREBASE_PROJECT_ID is not configured');

	return `projects/${project}/databases/(default)/documents/${path}`;
}

function joinPath(parent, child) {
	return [parent, child]
		.filter(Boolean)
		.map((segment) => String(segment).replace(/^\/+|\/+$/g, ''))
		.join('/');
}

async function authorizedFetch(env, url, init = {}) {
	const headers = new Headers(init.headers || {});

	if (emulatorHost(env)) {
		// The emulator accepts any bearer token; "owner" bypasses security rules.
		headers.set('Authorization', 'Bearer owner');
	} else {
		headers.set('Authorization', `Bearer ${await accessToken(env)}`);
	}

	const response = await fetch(url, { ...init, headers, signal: init.signal || AbortSignal.timeout(20000) });

	if (!response.ok) {
		const text = await response.text();

		const error = new Error(`Firestore request failed (${response.status}): ${text.slice(0, 300)}`);

		error.status = response.status;

		throw error;
	}

	return response;
}

async function commitWrites(env, writes, transaction) {
	const body = { writes };

	if (transaction) body.transaction = transaction;

	await authorizedFetch(env, `${documentsRoot(env)}:commit`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

/* ----------------------------- snapshots ----------------------------- */

export class DocumentSnapshot {
	constructor(id, fields, name) {
		this.id = id;
		this.name = name;
		this._fields = fields || null;
		this.exists = Boolean(fields);
	}

	data() {
		return this.exists ? decodeFields(this._fields) : undefined;
	}

	get(field) {
		return this.data()?.[field];
	}
}

export class QuerySnapshot {
	constructor(docs) {
		this.docs = docs;
		this.size = docs.length;
		this.empty = docs.length === 0;
	}

	forEach(callback) {
		this.docs.forEach(callback);
	}
}

/* ------------------------------ queries ------------------------------ */

function randomId() {
	let id = '';

	for (let i = 0; i < 20; i += 1) {
		id += AUTO_ID_ALPHABET[Math.floor(Math.random() * AUTO_ID_ALPHABET.length)];
	}

	return id;
}

const EMPTY_STATE = () => ({
	filters: [],
	order: [],
	limitValue: null,
	cursor: null,
	transaction: null,
});

class Query {
	constructor(env, path, state) {
		this.env = env;
		this.path = path;
		this.state = state || EMPTY_STATE();
	}

	next(patch) {
		return new Query(this.env, this.path, { ...this.state, ...patch });
	}

	where(field, op, value) {
		if (!OPERATORS[op]) throw new Error(`Unsupported operator: ${op}`);

		return this.next({ filters: [...this.state.filters, { field, op, value }] });
	}

	orderBy(field, direction = 'asc') {
		return this.next({
			order: [...this.state.order, { field, direction: String(direction).toLowerCase() === 'desc' ? 'DESCENDING' : 'ASCENDING' }],
		});
	}

	limit(value) {
		return this.next({ limitValue: value });
	}

	startAfter(snapshot) {
		return this.next({ cursor: { snapshot, before: false } });
	}

	buildStructuredQuery() {
		const collectionId = this.path.split('/').pop();

		const query = { from: [{ collectionId }] };

		const filters = this.state.filters.map(({ field, op, value }) => ({
			fieldFilter: {
				field: { fieldPath: field },
				op: OPERATORS[op],
				value: encodeValue(value),
			},
		}));

		if (filters.length === 1) query.where = filters[0];
		else if (filters.length > 1) query.where = { compositeFilter: { op: 'AND', filters } };

		const order = [...this.state.order];

		// Admin SDK always appends __name__ as the final tiebreak.
		if (order.length > 0) {
			order.push({ field: '__name__', direction: order[order.length - 1].direction });
		}

		if (order.length > 0) {
			query.orderBy = order.map(({ field, direction }) => ({ field: { fieldPath: field }, direction }));
		}

		if (this.state.limitValue !== null) query.limit = this.state.limitValue;

		if (this.state.cursor) {
			const cursorSnapshot = this.state.cursor.snapshot;

			query.startAt = {
				values: this.state.order.map(({ field }) => {
					if (field === '__name__') return { referenceValue: cursorSnapshot.name };

					const raw = cursorSnapshot._fields?.[field];

					return raw === undefined ? { nullValue: null } : raw;
				}),
				before: this.state.cursor.before,
			};
		}

		return query;
	}

	async get(transaction = this.state.transaction) {
		// Subcollection queries need the parent document path in the URL:
		// documents/users/{id}:runQuery + from.collectionId = "favorites".
		const segments = this.path.split('/');
		const parentPath = segments.slice(0, -1).join('/');
		const root = `${documentsRoot(this.env)}${parentPath ? `/${parentPath}` : ''}`;

		const response = await authorizedFetch(this.env, `${root}:runQuery`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(transaction ? { structuredQuery: this.buildStructuredQuery(), transaction } : { structuredQuery: this.buildStructuredQuery() }),
		});

		const rows = await response.json();

		const docs = (Array.isArray(rows) ? rows : [])
			.filter((row) => row.document)
			.map((row) => {
				const segments = String(row.document.name).split('/');

				return new DocumentSnapshot(segments[segments.length - 1], row.document.fields || {}, row.document.name);
			});

		return new QuerySnapshot(docs);
	}
}

function buildWrite(env, name, data, { merge, exists } = {}) {
	const fields = {};
	const maskPaths = [];
	const transforms = [];

	for (const [key, value] of Object.entries(data || {})) {
		if (value === SERVER_TIMESTAMP) {
			transforms.push({ fieldPath: key, setToServerValue: 'REQUEST_TIME' });
		} else if (value === DELETE_FIELD) {
			if (merge) maskPaths.push(key);
		} else {
			fields[key] = encodeValue(value);
			if (merge) maskPaths.push(key);
		}
	}

	const write = { update: { name, fields } };

	if (merge) write.updateMask = { fieldPaths: maskPaths };
	if (transforms.length > 0) write.updateTransforms = transforms;
	if (typeof exists === 'boolean') write.currentDocument = { exists };

	return write;
}

export class DocumentReference {
	constructor(env, path, id) {
		this.env = env;
		this.parentPath = path;
		this.id = id || randomId();
		this.path = joinPath(path, this.id);
		this.name = documentName(env, this.path);
	}

	collection(id) {
		return new CollectionReference(this.env, this.path, id);
	}

	async get(transaction = null) {
		// Transactional reads must go through :batchGet — the emulator (and some
		// intermediaries) stall forever on documents.get?transaction=...
		if (transaction) {
			const response = await authorizedFetch(this.env, `${documentsRoot(this.env)}:batchGet`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documents: [this.name], transaction }),
			});

			const rows = await response.json();
			const found = (Array.isArray(rows) ? rows : []).find((row) => row && row.found);

			return new DocumentSnapshot(this.id, found ? found.found.fields || {} : null, this.name);
		}

		let response;

		try {
			response = await authorizedFetch(this.env, `${documentsRoot(this.env)}/${this.path}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			if (error.status === 404) return new DocumentSnapshot(this.id, null, this.name);

			throw error;
		}

		const doc = await response.json();

		return new DocumentSnapshot(this.id, doc.fields || {}, doc.name);
	}

	async set(data) {
		await commitWrites(this.env, [buildWrite(this.env, this.name, data, { merge: false })]);
	}

	async update(data) {
		await commitWrites(this.env, [buildWrite(this.env, this.name, data, { merge: true })]);
	}

	async delete() {
		await commitWrites(this.env, [{ delete: this.name }]);
	}
}

export class CollectionReference extends Query {
	constructor(env, parentPath, collectionId) {
		super(env, joinPath(parentPath, collectionId), EMPTY_STATE());
	}

	doc(id) {
		return new DocumentReference(this.env, this.path, id);
	}

	async add(data) {
		const ref = this.doc();

		await ref.set(data);

		return ref;
	}
}

/* ------------------------- batch / transaction ------------------------ */

class WriteBatch {
	constructor(env) {
		this.env = env;
		this.writes = [];
	}

	set(ref, data) {
		this.writes.push(buildWrite(this.env, ref.name, data, { merge: false }));
		return this;
	}

	update(ref, data) {
		this.writes.push(buildWrite(this.env, ref.name, data, { merge: true }));
		return this;
	}

	delete(ref) {
		this.writes.push({ delete: ref.name });
		return this;
	}

	async commit() {
		await commitWrites(this.env, this.writes);
	}
}

class Transaction extends WriteBatch {
	constructor(env, id) {
		super(env);
		this.id = id;
	}

	async get(target) {
		return target instanceof Query ? target.get(this.id) : target.get(this.id);
	}

	async commit() {
		await commitWrites(this.env, this.writes, this.id);
	}
}

/* ------------------------------ database ----------------------------- */

export function createDb(env) {
	return {
		collection(name) {
			return new CollectionReference(env, '', name);
		},
		batch() {
			return new WriteBatch(env);
		},
		async runTransaction(callback, { retries = 3 } = {}) {
			let attempt = 0;

			for (;;) {
				const begin = await authorizedFetch(env, `${documentsRoot(env)}:beginTransaction`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ options: { readWrite: {} } }),
				});

				const { transaction } = await begin.json();
				const tx = new Transaction(env, transaction);

				try {
					const result = await callback(tx);

					await tx.commit();

					return result;
				} catch (error) {
					await authorizedFetch(env, `${documentsRoot(env)}:rollback`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ transaction }),
					}).catch(() => {});

					const retryable = error.status === 409 || error.status === 429 || error.status === 503;

					if (!retryable || attempt >= retries) throw error;

					attempt += 1;
				}
			}
		},
	};
}
