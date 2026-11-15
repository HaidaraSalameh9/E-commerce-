import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth, useUser } from '@clerk/react';

import { replaceCart } from '../app/features/cartSlice';
import { fetchUserCart } from '../services/cartService';

export default function useLoadCart() {
	const dispatch = useDispatch();
	const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
	const { isLoaded: userLoaded } = useUser();
	const loadedUserRef = useRef(null);

	useEffect(() => {
		if (!authLoaded || !userLoaded) return;

		if (!isSignedIn) {
			loadedUserRef.current = null;
			dispatch(replaceCart([]));
			return;
		}

		let cancelled = false;

		async function loadCart() {
			try {
				const token = await getToken();

				if (!token) return;

				// Avoid loading the same user's cart repeatedly.
				if (loadedUserRef.current === token) return;

				const products = await fetchUserCart(async () => token);

				if (!cancelled) {
					dispatch(replaceCart(products));
					loadedUserRef.current = token;
				}
			} catch (error) {
				console.error('Failed to load cart:', error.message);
			}
		}

		loadCart();

		return () => {
			cancelled = true;
		};
	}, [authLoaded, userLoaded, isSignedIn, getToken, dispatch]);
}
