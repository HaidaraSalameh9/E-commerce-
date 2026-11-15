// Guards the API contract between the frontend and the Worker:
//   1. every handler routed in src/index.js must be exported by src/api.js
//   2. every handler the frontend references must exist in the router
//   3. reports handlers nothing in the frontend calls
//
// Usage: node test/contract-check.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const frontendDir = path.join(root, 'src');

const collect = (dir, acc = []) => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) collect(full, acc);
		else if (/\.(js|jsx)$/.test(entry.name)) acc.push(full);
	}

	return acc;
};

const handlerBlock = fs.readFileSync(path.join(here, '..', 'src', 'index.js'), 'utf8').match(/const HANDLERS = \[([\s\S]*?)\];/);
const handlers = handlerBlock ? [...handlerBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

const apiSource = fs.readFileSync(path.join(here, '..', 'src', 'api.js'), 'utf8');
const exported = new Set([...apiSource.matchAll(/export const (\w+) = onRequest/g)].map((m) => m[1]));

const files = collect(frontendDir).map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
const referenced = new Map();

for (const name of [...handlers, 'api']) {
	const pattern = new RegExp(`['"\`]${name}['"\`]`);
	const hit = files.find(({ text }) => pattern.test(text));

	if (hit) referenced.set(name, path.relative(frontendDir, hit.file).split(path.sep).join('/'));
}

const missingExport = handlers.filter((name) => !exported.has(name));
const neverReferenced = [...handlers, 'api'].filter((name) => !referenced.has(name));

console.log(`workers routed : ${handlers.length} handlers + /api`);
console.log(`api.js exports : ${exported.size}`);
console.log(`frontend refs  : ${referenced.size}`);

if (missingExport.length > 0) {
	console.log(`\nrouted but not exported: ${missingExport.join(', ')}`);
	process.exitCode = 1;
}

if (neverReferenced.length > 0) console.log(`\nnot referenced by the frontend: ${neverReferenced.join(', ')}`);

if (process.exitCode !== 1) console.log('\ncontract ok: every routed handler exists, every used path is routed');
