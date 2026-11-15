import { apiUrl } from './apiBase';

export async function getOwnerDeliveredRevenue(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in first.');
	}

	const response = await fetch(apiUrl('getOwnerDeliveredRevenue'), {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not retrieve delivered orders revenue.');
	}

	return data;
}
