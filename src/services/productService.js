import { apiUrl } from './apiBase';

// Shared request function
async function productRequest(endpoint, getToken = null, options = {}) {
	if (getToken && typeof getToken !== 'function') {
		throw new Error('Invalid authentication. Please sign in again.');
	}

	const token = getToken ? await getToken() : null;

	if (getToken && !token) {
		throw new Error('Please sign in first.');
	}

	const response = await fetch(apiUrl(endpoint), {
		...options,
		headers: {
			...(token && {
				Authorization: `Bearer ${token}`,
			}),
			...(options.body && {
				'Content-Type': 'application/json',
			}),
			...options.headers,
		},
	});

	// The server should always answer with JSON, but do not crash if it does not.
	const data = await response.json().catch(() => ({}));

	if (!response.ok || data.success === false) {
		throw new Error(data.message || 'Something went wrong.');
	}

	return data;
}

/* ---------------------------- Storefront ---------------------------- */

// Public: active products only (no sign-in needed)
export async function getCustomProducts() {
	const data = await productRequest('getCustomProducts');

	return data.products;
}

/* ------------------------------ Admin ------------------------------- */

// Admin: every product, including archived ones (sign-in required)
export async function getAdminCustomProducts(getToken) {
	const data = await productRequest('getAdminCustomProducts', getToken, {
		method: 'GET',
	});

	return data.products;
}

// Create product
export async function createCustomProduct(product, getToken) {
	const data = await productRequest('createCustomProduct', getToken, {
		method: 'POST',
		body: JSON.stringify(product),
	});

	return data.product;
}

// Update product (also used to restore an archived product)
export async function updateCustomProduct(product, getToken) {
	const data = await productRequest('updateCustomProduct', getToken, {
		method: 'PUT',
		body: JSON.stringify(product),
	});

	return data.product;
}

// Archive product
export async function archivedCustomProduct(id, getToken) {
	return await productRequest('ArchivedCustomProduct', getToken, {
		method: 'DELETE',
		body: JSON.stringify({ id: String(id) }),
	});
}

// Permanently delete product
export async function deleteCustomProduct(id, getToken) {
	return await productRequest('deleteCustomProduct', getToken, {
		method: 'DELETE',
		body: JSON.stringify({ id: String(id) }),
	});
}
