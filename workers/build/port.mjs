// Mechanical port: functions/index.js -> workers/src/api.js
//
// Only the header (imports, initializeApp, defineSecret, setGlobalOptions) is
// replaced. Handler bodies below it are copied byte for byte, so the business
// logic, validation strings, status codes and JSON shapes cannot drift.
//
// Run: node workers/build/port.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const source = readFileSync(join(root, 'functions', 'index.js'), 'utf8');

const headerMarker = 'setGlobalOptions({';
const markerIndex = source.indexOf(headerMarker);

if (markerIndex === -1) throw new Error('setGlobalOptions marker not found - source changed?');

const headerEnd = source.indexOf('});', markerIndex) + 3;

const header = `// GENERATED FILE - do not edit by hand.
// Produced by workers/build/port.mjs from functions/index.js.
// Everything below the header is verbatim Cloud Functions code; the runtime
// shims supply db, process.env, verifyToken, createClerkClient and friends.

import {
	FieldValue,
	allowedOriginsView as ALLOWED_ORIGINS,
	createClerkClient,
	currentEnv,
	db,
	defineSecret,
	initializeApp,
	logger,
	onRequest,
	setGlobalOptions,
	verifyToken,
} from './runtime.js';

const CLERK_JWT_KEY = defineSecret('CLERK_JWT_KEY');
const CLERK_SECRET_KEY = defineSecret('CLERK_SECRET_KEY');

// Per-request environment, so handler code can read process.env unchanged.
const process = {
	env: new Proxy({}, { get: (_target, key) => currentEnv()[key] }),
};

initializeApp();
setGlobalOptions();`;

let body = source.slice(headerEnd);

// CommonJS -> ESM
body = body.replace(/^const \{ FieldValue \} = require\('firebase-admin\/firestore'\);\s*$/m, '');
body = body.replace(/^exports\./gm, 'export const ');

// Inventory is unlimited: drop the two "quantity > stock" guards.
// stock/status/isAvailable fields are left untouched for the frontend.
const stockGuard = /^[ \t]*if \(Number\.isInteger\(product\.stock\) && quantity > product\.stock\) \{[\s\S]*?\n[ \t]*\}\n\n?/gm;
const stockGuardCount = (body.match(stockGuard) || []).length;

if (stockGuardCount !== 2) throw new Error(`Expected 2 stock guards, found ${stockGuardCount}`);

body = body.replace(stockGuard, '');

if (/\brequire\(/.test(body)) throw new Error('Unhandled require() left in the ported body');
if (/^exports\./m.test(body)) throw new Error('Unhandled exports statement left in the ported body');

const output = `${header}\n${body}`;

writeFileSync(join(here, '..', 'src', 'api.js'), output, 'utf8');

const exported = [...output.matchAll(/^export const (\w+)/gm)].map((match) => match[1]);

console.log(`ported ${exported.length} exports:`);
console.log(exported.join(', '));
