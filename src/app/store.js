import { configureStore } from '@reduxjs/toolkit';

import allProductSlice from './features/allProductSlice';
import categoryProductSlice from './features/categoryProductSlice';
import cartSlice from './features/cartSlice';
import productDetailsSlice from './features/productDetailsSlice';
import searchSlice from './features/searchSlice';
import favoriteSlice from './features/favoriteSlice';

export default configureStore({
	reducer: {
		allProducts: allProductSlice,
		categoryProducts: categoryProductSlice,
		cart: cartSlice,
		singleProduct: productDetailsSlice,
		searchProduct: searchSlice,
		favorite: favoriteSlice,
	},
});
