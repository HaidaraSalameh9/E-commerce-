import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Keep the old thunk for existing components that still use it.
export const fetchProducts = createAsyncThunk('products/fetchProducts', async (_, { rejectWithValue }) => {
	try {
		const res = await fetch('https://dummyjson.com/products');

		if (!res.ok) throw new Error('Failed to fetch products');

		const data = await res.json();
		return data.products;
	} catch (error) {
		return rejectWithValue(error.message);
	}
});

// Fetch category names.
export const fetchProductCategories = createAsyncThunk('products/fetchCategories', async (_, { rejectWithValue }) => {
	try {
		const res = await fetch('https://dummyjson.com/products/categories');

		if (!res.ok) throw new Error('Failed to fetch categories');

		const data = await res.json();

		return Array.isArray(data)
			? data
					.map((category) => ({
						slug: typeof category === 'string' ? category : category.slug,
						name: typeof category === 'string' ? category.replaceAll('-', ' ') : category.name,
					}))
					.filter((category) => category.slug)
			: [];
	} catch (error) {
		return rejectWithValue(error.message);
	}
});

// Fetch products belonging to one category.
export const fetchProductsByCategory = createAsyncThunk('products/fetchProductsByCategory', async (category, { rejectWithValue }) => {
	try {
		const res = await fetch(`https://dummyjson.com/products/category/${encodeURIComponent(category)}`);

		if (!res.ok) throw new Error(`Failed to fetch ${category} products`);

		const data = await res.json();

		return {
			category,
			products: Array.isArray(data.products) ? data.products : [],
		};
	} catch (error) {
		return rejectWithValue({
			category,
			message: error.message,
		});
	}
});

const allProductSlice = createSlice({
	name: 'product',

	initialState: {
		// Legacy data - kept for compatibility.
		products: [],
		loading: false,
		error: null,

		// New category-based catalogue.
		categories: [],
		categoriesLoading: false,
		categoriesError: null,
		productsByCategory: {},
		loadingByCategory: {},
		errorByCategory: {},
	},

	reducers: {},

	extraReducers: (builder) => {
		builder
			// Legacy fetchProducts
			.addCase(fetchProducts.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchProducts.fulfilled, (state, action) => {
				state.loading = false;
				state.products = Array.isArray(action.payload) ? action.payload : [];
			})
			.addCase(fetchProducts.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload || action.error.message;
			})

			// Categories
			.addCase(fetchProductCategories.pending, (state) => {
				state.categoriesLoading = true;
				state.categoriesError = null;
			})
			.addCase(fetchProductCategories.fulfilled, (state, action) => {
				state.categoriesLoading = false;
				state.categories = action.payload;
			})
			.addCase(fetchProductCategories.rejected, (state, action) => {
				state.categoriesLoading = false;
				state.categoriesError = action.payload || action.error.message;
			})

			// Products by category
			.addCase(fetchProductsByCategory.pending, (state, action) => {
				const category = action.meta.arg;
				state.loadingByCategory[category] = true;
				state.errorByCategory[category] = null;
			})
			.addCase(fetchProductsByCategory.fulfilled, (state, action) => {
				const { category, products } = action.payload;

				state.loadingByCategory[category] = false;
				state.productsByCategory[category] = products;
			})
			.addCase(fetchProductsByCategory.rejected, (state, action) => {
				const { category, message } = action.payload || {};

				if (category) {
					state.loadingByCategory[category] = false;
					state.errorByCategory[category] = message || action.error.message;
				}
			});
	},
});

export default allProductSlice.reducer;
