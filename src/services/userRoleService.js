import { apiUrl } from './apiBase';

const GET_MY_ROLE_API = apiUrl('getMyRole');

export async function getMyRole(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in first.');
	}

	const response = await fetch(GET_MY_ROLE_API, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not retrieve user role.');
	}

	return data.role;
}

const UPDATE_USER_ROLE_API = apiUrl('updateUserRole');

export async function updateUserRole(targetUserId, role, getToken) {
	if (!['admin', 'user'].includes(role)) {
		throw new Error('Invalid role.');
	}

	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in first.');
	}

	const response = await fetch(UPDATE_USER_ROLE_API, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ targetUserId, role }),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not update user role.');
	}

	return data;
}

const GET_ALL_USERS_API = apiUrl('getAllUsers');

export async function getAllUsers(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in first.');
	}

	const response = await fetch(GET_ALL_USERS_API, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Could not load users.');
	}

	return data.users;
}
