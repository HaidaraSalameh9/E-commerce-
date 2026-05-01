import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';


export const fetchProductDetails = createAsyncThunk(
    "products/fetchProductDetails",
    async (id) => {
        const res = await fetch(`https://dummyjson.com/products/${id}`);
        const data = await res.json();
        return data;
    }
);


const productDetailsSlice = createSlice({
    name: "product",
    initialState: {
        product: null,
        loading: false,
        error: null
    },
    reducers: {},

    extraReducers: (builder) => {
        builder
            .addCase(fetchProductDetails.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchProductDetails.fulfilled, (state, action) => {
                state.loading = false;
                state.product = action.payload;
            })
            .addCase(fetchProductDetails.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    }
});

export default productDetailsSlice.reducer;
