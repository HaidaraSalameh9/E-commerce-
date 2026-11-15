import { apiUrl } from './apiBase';

async function getActivityToken(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in first.');
	}

	return token;
}

// Get activities of all users
export async function getAllUserActivities(getToken, { limit = 20, cursor = null } = {}) {
	const token = await getActivityToken(getToken);

	const params = new URLSearchParams({
		limit: String(limit),
	});

	if (cursor) {
		params.set('cursor', cursor);
	}

	const response = await fetch(apiUrl(`getAllUserActivities?${params}`), {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not load activities.');
	}

	return data;
}

// Get activities of a specific user
export async function getUserActivities(getToken, userId, { limit = 20, cursor = null } = {}) {
	if (!userId) {
		throw new Error('User ID is required.');
	}

	const token = await getActivityToken(getToken);

	const params = new URLSearchParams({
		userId,
		limit: String(limit),
	});

	if (cursor) {
		params.set('cursor', cursor);
	}

	const response = await fetch(apiUrl(`getUserActivities?${params}`), {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not load user activities.');
	}

	return data;
}
