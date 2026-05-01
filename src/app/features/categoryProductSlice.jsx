import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchCategoryProducts = createAsyncThunk(
    "products/fetchProducts",
    async (category) => {
        const res = await fetch(`https://dummyjson.com/products/category/${category}`);
        const data = await res.json();
        return { category, products: data.products };
    }
);

const categoryProductSlice = createSlice({
    name: "product",
    initialState: {
        productsByCategory: {},
        loadingByCategory: {},
        errorByCategory: {}
    },
    reducers: {},

    extraReducers: (builder) => {
        builder
            .addCase(fetchCategoryProducts.pending, (state, action) => {
                const category = action.meta.arg;
                state.loadingByCategory[category] = true;
                state.errorByCategory[category] = null;
            })

            .addCase(fetchCategoryProducts.fulfilled, (state, action) => {
                const { category, products } = action.payload;
                state.loadingByCategory[category] = false;
                state.productsByCategory[category] = Array.isArray(products)
                    ? products
                    : [];
            })

            .addCase(fetchCategoryProducts.rejected, (state, action) => {
                const category = action.meta.arg;
                state.loadingByCategory[category] = false;
                state.errorByCategory[category] = action.error.message;
            });
    }
});

export default categoryProductSlice.reducer;