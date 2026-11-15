import { useCallback, useRef, useState } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useAuth } from '@clerk/react';

import { addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart } from '../app/features/cartSlice';

import { saveUserCart } from '../services/cartService';

export default function useCartSync() {
	const dispatch = useDispatch();
	const store = useStore();
	const { getToken } = useAuth();

	const saveQueue = useRef(Promise.resolve());
	const [isSaving, setIsSaving] = useState(false);

	const syncCart = useCallback(
		(action, payload) => {
			dispatch(action(payload));

			const cartSnapshot = structuredClone(store.getState().cart.product);

			setIsSaving(true);

			const saveTask = saveQueue.current.catch(() => {}).then(() => saveUserCart(cartSnapshot, getToken));

			saveQueue.current = saveTask;

			return saveTask
				.then(() => true)
				.catch((error) => {
					console.error('Cart sync failed:', error.message);
					alert('Could not save your cart. Please check your connection.');
					return false;
				})
				.finally(() => {
					// Only the latest queued task should clear the indicator.
					if (saveQueue.current === saveTask) {
						setIsSaving(false);
					}
				});
		},
		[dispatch, store, getToken],
	);

	const clearUserCart = async () => {
		try {
			await saveUserCart([], getToken);
			dispatch(clearCart());
			return true;
		} catch (error) {
			console.error('Failed to clear cart:', error.message);
			return false;
		}
	};

	return {
		isSaving,
		addProduct: (product) => syncCart(addToCart, product),
		removeProduct: (id) => syncCart(removeFromCart, { id }),
		increaseProduct: (id) => syncCart(increaseQuantity, { id }),
		decreaseProduct: (id) => syncCart(decreaseQuantity, { id }),
		clearUserCart,
	};
}
