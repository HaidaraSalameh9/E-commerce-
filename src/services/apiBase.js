// Single source of truth for the Firebase Cloud Functions base URL.
// Local development falls back to the emulator; production must provide
// VITE_API_BASE_URL, e.g. https://us-central1-e-commerce-app-717a6.cloudfunctions.net
const LOCAL_EMULATOR_BASE_URL = 'http://127.0.0.1:5001/e-commerce-app-717a6/us-central1';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = String(configuredBaseUrl || LOCAL_EMULATOR_BASE_URL)
	.trim()
	.replace(/\/+$/, '');

export function apiUrl(path = '') {
	const cleanPath = String(path).replace(/^\/+/, '');

	return cleanPath ? `${API_BASE_URL}/${cleanPath}` : API_BASE_URL;
}
