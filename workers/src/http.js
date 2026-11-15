// Express/Functions-Framework compatible request + response objects.
// Purpose: the handlers in functions/index.js can be moved here verbatim,
// because they use request.get(), request.body, request.query and
// response.status().json()/.send() — not the Web Fetch API.

export async function toRequestContext(request) {
	const url = new URL(request.url);

	const query = {};

	for (const [key, value] of url.searchParams) {
		query[key] = value;
	}

	// Functions Framework pre-parses JSON bodies; mimic that behaviour.
	let body = {};

	if (request.method !== 'GET' && request.method !== 'HEAD') {
		const text = await request.text();

		if (text) {
			try {
				body = JSON.parse(text);
			} catch {
				body = {};
			}
		}
	}

	const headers = new Map();

	request.headers.forEach((value, key) => headers.set(key.toLowerCase(), value));

	return {
		method: request.method,
		url: request.url,
		path: url.pathname,
		query,
		body,
		headers,
		get(name) {
			return headers.get(String(name).toLowerCase()) || '';
		},
	};
}

export function createResponse() {
	const headers = new Headers();

	let statusCode = 200;
	let payload = null;

	const response = {
		get statusCode() {
			return statusCode;
		},
		status(code) {
			statusCode = code;
			return response;
		},
		set(name, value) {
			headers.set(name, value);
			return response;
		},
		json(data) {
			headers.set('Content-Type', 'application/json; charset=utf-8');
			payload = JSON.stringify(data);
			return response;
		},
		send(data) {
			payload = typeof data === 'string' ? data : JSON.stringify(data ?? '');
			return response;
		},
		end(data) {
			payload = data ?? '';
			return response;
		},
		toResponse() {
			const bodyAllowed = ![101, 204, 205, 304].includes(statusCode);

			return new Response(bodyAllowed ? payload : null, {
				status: statusCode,
				headers,
			});
		},
	};

	return response;
}
