

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchSearchResults = createAsyncThunk(
    "search/fetchResults",
    async (query) => {
        const res = await fetch(`https://dummyjson.com/products/search?q=${query}`);
        const data = await res.json();
        return data.products;
    }
);

const searchSlice = createSlice({
    name: "search",
    initialState: {
        results: [],
        loading: false,
        error: null,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSearchResults.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchSearchResults.fulfilled, (state, action) => {
                state.loading = false;
                state.results = action.payload;
            })
            .addCase(fetchSearchResults.rejected, (state) => {
                state.loading = false;
                state.error = "Error fetching search results";
            });
    },
});

export default searchSlice.reducer;