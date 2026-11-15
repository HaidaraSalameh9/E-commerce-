import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@clerk/react';

import { addToFavorite, removeFromFavorite, setFavorites } from '../app/features/favoriteSlice';

import { getUserFavorites, addUserFavorite, removeUserFavorite, syncUserFavorites } from '../services/favoritesService';

const STORAGE_KEY = 'userFavorites';
const MAX_FAVORITES = 15;

// Read local favorites safely
function getLocalFavorites() {
	try {
		const savedFavorites = localStorage.getItem(STORAGE_KEY);

		if (!savedFavorites) return [];

		const parsedFavorites = JSON.parse(savedFavorites);

		return Array.isArray(parsedFavorites) ? parsedFavorites : [];
	} catch (error) {
		console.error('Could not read local favorites:', error);
		return [];
	}
}

// Save local favorites
function saveLocalFavorites(favorites) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

// Normalize products returned by Backend
function normalizeFavorites(favorites = []) {
	return favorites.map((item) => ({
		...item,
		id: item.id ?? item.productId,
		discountPercentage: Number(item.discountPercentage) || 0,
		images: item.images?.length > 0 ? item.images : item.image ? [item.image] : [],
	}));
}

// Merge backend products with locally saved product details
function mergeProductDetails(serverFavorites, localFavorites) {
	const localMap = new Map(localFavorites.map((item) => [String(item.id), item]));

	return serverFavorites.map((item) => {
		const localItem = localMap.get(String(item.id));

		return {
			...localItem,
			...item,
			images: item.images?.length > 0 ? item.images : (localItem?.images ?? []),
		};
	});
}

export default function useFavoritesSync({ initialize = false } = {}) {
	const dispatch = useDispatch();

	const favorites = useSelector((state) => state.favorite.product);

	const maxProducts = useSelector((state) => state.favorite.maxProducts);

	const { isLoaded, isSignedIn, getToken } = useAuth();

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null);

	// Load and synchronize favorites when authentication changes
	useEffect(() => {
		if (!initialize || !isLoaded) return;

		let cancelled = false;

		async function initializeFavorites() {
			setIsLoading(true);
			setError(null);

			const localFavorites = getLocalFavorites();

			try {
				// Guest user: Redux + localStorage
				if (!isSignedIn) {
					dispatch(setFavorites(localFavorites.slice(0, MAX_FAVORITES)));

					return;
				}

				// Signed-in user: load Firestore favorites
				const serverData = await getUserFavorites(getToken);

				const serverFavorites = normalizeFavorites(serverData.favorites || []);

				const serverIds = new Set(serverFavorites.map((item) => String(item.id)));

				// Keep server favorites first, then add local favorites
				const localOnly = localFavorites.filter((item) => !serverIds.has(String(item.id)));

				const availableSlots = Math.max(0, MAX_FAVORITES - serverFavorites.length);

				const localToSync = localOnly.slice(0, availableSlots);

				const mergedIds = [...serverFavorites.map((item) => String(item.id)), ...localToSync.map((item) => String(item.id))];

				// Sync only when there are local products to add
				if (localToSync.length > 0) {
					await syncUserFavorites(mergedIds, getToken);
				}

				// Fetch complete favorites after synchronization
				const updatedData = await getUserFavorites(getToken);

				const updatedFavorites = normalizeFavorites(updatedData.favorites || []);

				const finalFavorites = mergeProductDetails(updatedFavorites, localFavorites);

				if (cancelled) return;

				dispatch(setFavorites(finalFavorites));

				// Clear local favorites only after successful synchronization
				localStorage.removeItem(STORAGE_KEY);
			} catch (error) {
				console.error('Favorites initialization failed:', error.message);

				if (!cancelled) {
					setError(error.message);

					// Preserve local data if synchronization fails
					if (localFavorites.length > 0) {
						dispatch(setFavorites(localFavorites.slice(0, MAX_FAVORITES)));
					}
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		}

		initializeFavorites();

		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, getToken, dispatch]);

	// Add favorite
	const addFavorite = useCallback(
		async (product) => {
			const exists = favorites.some((item) => String(item.id) === String(product.id));

			if (exists) return false;

			if (favorites.length >= maxProducts) {
				setError(`You can add only ${maxProducts} products to favorites.`);

				return false;
			}

			setIsSaving(true);
			setError(null);

			try {
				if (isSignedIn) {
					await addUserFavorite(product.id, getToken);

					const data = await getUserFavorites(getToken);

					dispatch(setFavorites(normalizeFavorites(data.favorites || [])));
				} else {
					dispatch(addToFavorite(product));

					const updatedFavorites = [...favorites, product];

					saveLocalFavorites(updatedFavorites);
				}

				return true;
			} catch (error) {
				console.error('Add favorite failed:', error.message);
				setError(error.message);

				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[favorites, maxProducts, isSignedIn, getToken, dispatch],
	);

	// Remove favorite
	const removeFavorite = useCallback(
		async (productId) => {
			setIsSaving(true);
			setError(null);

			try {
				if (isSignedIn) {
					await removeUserFavorite(productId, getToken);

					const data = await getUserFavorites(getToken);

					dispatch(setFavorites(normalizeFavorites(data.favorites || [])));
				} else {
					dispatch(removeFromFavorite(productId));

					const updatedFavorites = favorites.filter((item) => String(item.id) !== String(productId));

					saveLocalFavorites(updatedFavorites);
				}

				return true;
			} catch (error) {
				console.error('Remove favorite failed:', error.message);
				setError(error.message);

				return false;
			} finally {
				setIsSaving(false);
			}
		},
		[favorites, isSignedIn, getToken, dispatch],
	);

	// Check if product is favorite
	const isFavorite = useCallback(
		(productId) => {
			return favorites.some((item) => String(item.id) === String(productId));
		},
		[favorites],
	);

	return {
		favorites,
		isLoading,
		isSaving,
		error,
		addFavorite,
		removeFavorite,
		isFavorite,
	};
}
