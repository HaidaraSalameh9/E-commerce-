import { apiUrl } from './apiBase';

export async function getAllOrders(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Clerk token is missing.');
	}

	const response = await fetch(apiUrl('getAllOrders'), {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not load orders.');
	}

	return data.orders;
}

export async function updateOrderStatus(orderId, status, getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in first.');
	}

	const response = await fetch(apiUrl('updateOrderStatus'), {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ orderId, status }),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not update order status.');
	}

	return data;
}
