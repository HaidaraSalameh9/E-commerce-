import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCustomProducts } from '../../services/productService';

export const fetchSearchResults = createAsyncThunk('search/fetchResults', async (query) => {
	const searchQuery = query.trim().toLowerCase();

	if (!searchQuery) return [];

	// Search both sources simultaneously
	const [dummyResult, firebaseResult] = await Promise.allSettled([
		fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(query)}`).then(async (res) => {
			if (!res.ok) throw new Error('DummyJSON search failed');

			const data = await res.json();
			return data.products || [];
		}),

		getCustomProducts(),
	]);

	const dummyProducts =
		dummyResult.status === 'fulfilled'
			? dummyResult.value.map((product) => ({
					...product,
					source: 'dummyjson',
				}))
			: [];

	const customProducts =
		firebaseResult.status === 'fulfilled'
			? firebaseResult.value
					.filter((product) => !product.status || product.status === 'active')
					.filter((product) => {
						const searchableText = [product.title, product.name, product.brand, product.category, product.description].filter(Boolean).join(' ').toLowerCase();

						return searchableText.includes(searchQuery);
					})
					.map((product) => ({
						...product,
						title: product.title || product.name,
						images: product.images || (product.image ? [product.image] : []),
						source: 'firebase',
					}))
			: [];

	// Throw an error only if both sources fail
	if (dummyResult.status === 'rejected' && firebaseResult.status === 'rejected') {
		throw new Error('Could not search products.');
	}

	return [...dummyProducts, ...customProducts];
});

const searchSlice = createSlice({
	name: 'search',

	initialState: {
		results: [],
		loading: false,
		error: null,
	},

	extraReducers: (builder) => {
		builder
			.addCase(fetchSearchResults.pending, (state) => {
				state.loading = true;
				state.error = null;
			})

			.addCase(fetchSearchResults.fulfilled, (state, action) => {
				state.loading = false;
				state.results = action.payload;
			})

			.addCase(fetchSearchResults.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || 'Error fetching search results';
			});
	},
});

export default searchSlice.reducer;
