import React, { useState } from 'react';
import emptyCart from './../assets/empty_cart.png';

import { decreaseQuantity, increaseQuantity, removeFromCart } from '../app/features/cartSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { FaTrashAlt } from 'react-icons/fa';
import { IoTrash } from 'react-icons/io5';
import Modal from '../components/Modal';
import ChangeAddress from '../components/ChangeAddress';


const Cart = ({ address, setAddress }) => {
    const cart = useSelector((state) => state.cart);

    const [isModelOpen, setIsModelOpen] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    return (
        <div className=" mx-auto px-4 md:px-10  py-10">
            {cart.product.length > 0 ? (
                <div className="animate-fadeIn">
                    <h2 className="text-3xl font-bold tracking-wide mb-8 text-gray-900">
                        Shopping Cart
                    </h2>

                    <div className="flex items-center flex-col xl:flex-row xl:items-start justify-center gap-8">

                        {/* PRODUCTS */}
                        <div className="flex-1 w-full overflow-x-auto rounded-xl bg-white shadow border border-gray-100 p-5">
                            <table className="w-full min-w-175 border-separate border-spacing-y-4">
                                <thead>
                                    <tr className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                                        <th className="text-left px-4 py-3">Product</th>
                                        <th className="text-left px-4 py-3">Price</th>
                                        <th className="text-center px-4 py-3">Qty</th>
                                        <th className="text-left px-4 py-3">Subtotal</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {cart.product.map((product) => (
                                        <tr
                                            key={product.id}
                                            className="bg-gray-50 hover:bg-gray-100/70 rounded-xl shadow-sm hover:shadow transition-all duration-300"
                                        >
                                            {/* PRODUCT */}
                                            <td className="px-4 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                                                        <img src={product.image} alt={product.title} className="w-full h-full object-contain p-2" />
                                                    </div>

                                                    <div>
                                                        <h3 className="font-semibold text-gray-800 text-base">
                                                            {product.title}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">
                                                            Premium Product
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* PRICE */}
                                            <td className="px-4 py-5">
                                                <p className="font-semibold text-gray-800 text-base">
                                                    ${product.price.toFixed(2)}
                                                </p>
                                            </td>

                                            {/* QUANTITY */}
                                            <td className="px-4 py-5">
                                                <div className="flex items-center w-fit rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                                    <button
                                                        className="px-4 h-10 bg-black text-white hover:bg-gray-800 transition-all"
                                                        onClick={() => dispatch(decreaseQuantity(product))}
                                                    >
                                                        −
                                                    </button>

                                                    <span className="px-5 font-semibold text-gray-700">
                                                        {product.quantity}
                                                    </span>

                                                    <button
                                                        className="px-4 h-10 bg-black text-white hover:bg-gray-800 transition-all"
                                                        onClick={() => dispatch(increaseQuantity(product))}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>

                                            {/* SUBTOTAL */}
                                            <td className="px-4 py-5">
                                                <div className="flex items-center justify-between gap-6">
                                                    <p className="font-bold text-lg text-gray-900">
                                                        ${(product.quantity * product.price).toFixed(2)}
                                                    </p>

                                                    <button
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-500 transition-all duration-300"
                                                        onClick={() => dispatch(removeFromCart(product))}
                                                    >
                                                        <IoTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* TOTALS */}
                        <div className=" w-full max-w-80 xl:w-95 sticky top-21 bg-white p-7 rounded-xl shadow border border-gray-100 space-y-6">
                            <h3 className="text-xl font-bold text-gray-800">
                                Cart Totals
                            </h3>

                            <div className="flex justify-between text-gray-700 border-b pb-3">
                                <span>Total Items</span>
                                <span className="font-semibold">
                                    {cart.totalQuantity}
                                </span>
                            </div>

                            <div className="space-y-2 border-b pb-4">
                                <p className="text-sm text-gray-500">
                                    Shipping Address
                                </p>

                                <p className="font-medium text-gray-800">
                                    {address}
                                </p>

                                <button
                                    onClick={() => setIsModelOpen(true)}
                                    className="text-sm text-blue-500 hover:underline"
                                >
                                    Change address
                                </button>
                            </div>

                            <div className="flex justify-between text-xl font-bold text-gray-900">
                                <span>Total</span>
                                <span>${cart.totalPrice.toFixed(2)}</span>
                            </div>

                            <button
                                className="w-full bg-black text-white py-3 rounded-2xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-[1.02]"
                                onClick={() => navigate("/checkout")}
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                    <Modal isModelOpen={isModelOpen} setIsModelOpen={setIsModelOpen}>
                        <ChangeAddress address={address} setAddress={setAddress} closeModal={setIsModelOpen} />
                    </Modal>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 ">
                    <img src={emptyCart} alt="Empty Cart" className="h-64 bg-gray-100" />

                </div>
            )}
        </div>
    );
};

export default Cart;


