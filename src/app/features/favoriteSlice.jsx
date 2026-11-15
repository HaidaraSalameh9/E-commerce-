import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	product: [],
	maxProducts: 15,
};

export const favoriteSlice = createSlice({
	name: 'favorite',
	initialState,
	reducers: {
		addToFavorite(state, action) {
			const newItem = action.payload;

			const existingItem = state.product.find((item) => item.id === newItem.id);

			if (existingItem) return;

			if (state.product.length >= state.maxProducts) return;

			state.product.push({
				id: newItem.id,
				title: newItem.title,
				price: newItem.price,
				images: newItem.images,
				shippingInformation: newItem.shippingInformation,
				discountPercentage: newItem.discountPercentage,
				rating: newItem.rating,
				stock: newItem.stock,
			});
		},

		removeFromFavorite(state, action) {
			state.product = state.product.filter((item) => item.id !== action.payload);
		},

		setFavorites(state, action) {
			state.product = action.payload;
		},

		clearFavorites(state) {
			state.product = [];
		},
	},
});

export const { addToFavorite, removeFromFavorite, setFavorites, clearFavorites } = favoriteSlice.actions;

export default favoriteSlice.reducer;
