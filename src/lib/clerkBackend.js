import { apiUrl } from '../services/apiBase';

const API_URL = apiUrl('authCheck');

export async function checkBackendAuth(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('No Clerk session token available');
	}

	const response = await fetch(API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({}),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Authentication failed');
	}

	return data;
}
