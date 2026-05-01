import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    product: [],
    maxProducts: 15,

};

export const favoriteSlice = createSlice({
    name: "favorite",
    initialState,
    reducers: {
        addToFavorite(state, action) {
            const newItem = action.payload;

            const existingItem = state.product.find(
                (item) => item.id === newItem.id
            );

            if (existingItem) {
                const confirmAdd = confirm(`Are you sure you want to remove "${existingItem.title}" from your favorites?`);
                if (confirmAdd) state.product = state.product.filter(
                    (item) => item.id !== newItem.id
                );

            } else {
                if (state.product.length >= state.maxProducts) {
                    alert(`You can add only ${state.maxProducts} products to the favorite list`);
                } else {
                    state.product.push({
                        id: newItem.id,
                        title: newItem.title,
                        price: newItem.price,
                        images: newItem.images,
                        shippingInformation: newItem.shippingInformation,
                        discountPercentage: newItem.discountPercentage,
                        rating: newItem.rating,
                        stock: newItem.stock
                    });
                }
            }
        },
    },
});

export const { addToFavorite } = favoriteSlice.actions;
export default favoriteSlice.reducer;