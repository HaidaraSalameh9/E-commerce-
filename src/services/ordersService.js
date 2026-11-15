import { apiUrl } from './apiBase';

const ORDER_API = apiUrl('createOrder');

export async function createUserOrder(order, getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in before placing an order.');
	}

	const response = await fetch(ORDER_API, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			products: order.products.map((item) => ({
				productId: item.id,
				quantity: item.quantity,
			})),
			shippingInformation: order.shippingInformation,
			paymentMethod: order.paymentMethod,
		}),
	});

	let data;

	try {
		data = await response.json();
	} catch {
		throw new Error('The server returned an invalid response.');
	}

	if (!response.ok) {
		throw new Error(data.message || 'Could not create your order.');
	}

	if (!data.order) {
		throw new Error('The server did not return the created order.');
	}

	return data.order;
}

const GET_ORDER_API = apiUrl('getOrder');

export async function getUserOrder(orderId, getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in to view this order.');
	}

	const response = await fetch(`${GET_ORDER_API}?orderId=${encodeURIComponent(orderId)}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not load your order.');
	}

	return data.order;
}

const GET_MY_ORDERS_API = apiUrl('getMyOrders');

export async function getMyOrders(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in to view your orders.');
	}

	const response = await fetch(GET_MY_ORDERS_API, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not load your orders.');
	}

	return data.orders;
}

const CANCEL_ORDER_API = apiUrl('cancelOrder');

export async function cancelUserOrder(orderId, getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in before cancelling your order.');
	}

	const response = await fetch(CANCEL_ORDER_API, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ orderId }),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not cancel your order.');
	}

	return data;
}
