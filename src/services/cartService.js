import { apiUrl } from './apiBase';

const CART_API = apiUrl('cart');

export async function getCartToken(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in to continue.');
	}

	return token;
}

export async function fetchUserCart(getToken) {
	const token = await getCartToken(getToken);

	const response = await fetch(CART_API, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not load your cart.');
	}

	return (data.products || []).map((item) => ({
		...item,
		image: item.image || item.images?.[0] || '',
	}));
}

export async function saveUserCart(products, getToken) {
	const token = await getCartToken(getToken);

	const response = await fetch(CART_API, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			products: products.map((item) => ({
				productId: item.id,
				quantity: item.quantity,
			})),
		}),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not save your cart.');
	}

	return data.products;
}
