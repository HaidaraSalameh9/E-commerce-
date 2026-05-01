import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    product: [],
    totalQuantity: 0,
    totalPrice: 0,
    maxQuantity: 8, // max quantity per product
    maxProducts: 15, // max different products in cart
};

export const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addToCart(state, action) {
            const newItem = action.payload;
            const existingItem = state.product.find(
                item => item.id === newItem.id
            );

            const itemQuantity = newItem.quantity || 1;


            if (existingItem) {
                if (existingItem.quantity + itemQuantity > state.maxQuantity) {
                    alert(`Maximum quantity is ${state.maxQuantity} items for each product`);
                    return;
                }

                existingItem.quantity += itemQuantity;
                existingItem.totalPrice += newItem.price * itemQuantity;
            } else {
                if (state.product.length >= state.maxProducts) {
                    alert(`You can add only ${state.maxProducts} products to the cart`);
                    return;
                }

                if (itemQuantity > state.maxQuantity) {
                    alert(`Maximum quantity is ${state.maxQuantity} items for each product`);
                    return;
                }

                state.product.push({
                    id: newItem.id,
                    title: newItem.title,
                    price: newItem.price,
                    image: newItem.images[0],
                    quantity: itemQuantity,
                    totalPrice: newItem.price * itemQuantity
                });
            }

            state.totalQuantity += itemQuantity;
            state.totalPrice += newItem.price * itemQuantity;
        },

        removeFromCart(state, action) {
            const id = action.payload.id;
            const findItem = state.product.find(item => item.id === id);

            if (findItem) {
                state.totalQuantity -= findItem.quantity;
                state.totalPrice -= findItem.totalPrice;
                state.product = state.product.filter(item => item.id !== id);
            }
        },

        increaseQuantity(state, action) {
            const id = action.payload;
            const findItem = state.product.find(
                (item) => item.id === id.id
            );

            if (findItem) {
                if (findItem.quantity >= state.maxQuantity) {
                    alert(`Maximum quantity is ${state.maxQuantity} items for each product`);
                    return;
                }

                findItem.quantity++;
                findItem.totalPrice += findItem.price;
                state.totalQuantity++;
                state.totalPrice += findItem.price;
            }
        },
        decreaseQuantity(state, action) {
            const id = action.payload;
            const findItem = state.product.find(
                (item) => item.id === id.id
            );

            if (findItem && findItem.quantity > 1) {
                findItem.quantity--;
                findItem.totalPrice -= findItem.price;
                state.totalQuantity--;
                state.totalPrice -= findItem.price;
            }
        },
    },

}
);

export const { addToCart, removeFromCart, increaseQuantity, decreaseQuantity } = cartSlice.actions;

export default cartSlice.reducer;