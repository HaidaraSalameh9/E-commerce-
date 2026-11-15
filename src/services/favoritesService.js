import { apiUrl } from './apiBase';

async function getFavoritesToken(getToken) {
	const token = await getToken();

	if (!token) {
		throw new Error('Please sign in to continue.');
	}

	return token;
}

async function favoritesRequest(endpoint, method, getToken, body) {
	const token = await getFavoritesToken(getToken);

	const response = await fetch(apiUrl(endpoint), {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			...(body && { 'Content-Type': 'application/json' }),
		},
		...(body && { body: JSON.stringify(body) }),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Favorites request failed.');
	}

	return data;
}

export async function getUserFavorites(getToken) {
	return favoritesRequest('getUserFavorites', 'GET', getToken);
}

export async function addUserFavorite(productId, getToken) {
	return favoritesRequest('addUserFavorite', 'POST', getToken, {
		productId,
	});
}

export async function removeUserFavorite(productId, getToken) {
	return favoritesRequest('removeUserFavorite', 'DELETE', getToken, {
		productId,
	});
}

export async function syncUserFavorites(productIds, getToken) {
	return favoritesRequest('syncUserFavorites', 'POST', getToken, {
		productIds,
	});
}
