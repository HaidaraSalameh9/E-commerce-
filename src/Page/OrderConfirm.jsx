import { useUser } from "@clerk/react";
import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Order = ({ order }) => {
    const navigate = useNavigate();

    const { user } = useUser();

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-lg text-gray-600">No order found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen  flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-4xl bg-white/80  rounded-3xl  border border-gray-200 overflow-hidden">

                {/* Header */}
                <div className="p-6 flex items-center gap-4 border-b">
                    <FaCheckCircle className="text-black text-4xl" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Order Confirmed</h2>
                        <p className="text-gray-500 text-sm">Your order has been placed successfully</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* Top Info */}
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* Customer Card */}
                        <div className=" rounded-2xl shadow p-4 flex items-center gap-4">
                            <img
                                loading="lazy"
                                src={user.imageUrl}
                                alt="user"
                                className="w-16 h-16 rounded-full object-cover border"
                            />
                            <div>
                                <p className="font-semibold text-gray-900">{order.customer?.name}</p>
                                <p className="text-sm text-gray-500">{order.customer?.email}</p>
                            </div>
                        </div>

                        {/* Order Info */}
                        <div className="bg-white rounded-2xl shadow p-4 space-y-2">
                            <p className="text-gray-500 text-sm">Order Number</p>
                            <p className="font-bold text-lg  text-gray-800">#{order.orderNumber}</p>
                            <p className="text-gray-500 text-sm mt-2">Payment</p>
                            <p className="font-medium text-gray-800">
                                {order.paymentMethod === "cod" ? "Cash On Delivery" : "Debit Card"}
                            </p>
                        </div>
                    </div>

                    {/* Shipping */}
                    <div className="bg-white rounded-2xl shadow p-4">
                        <h3 className="font-semibold text-gray-700 mb-2">Shipping Info</h3>
                        <p className="text-gray-600 text-sm"><span className="font-bold text-gray-800">Address:</span>  {order.shippingInformation?.address}</p>
                        <p className="text-gray-600 text-sm"><span className="font-bold text-gray-800">City:</span> {order.shippingInformation?.city}</p>
                        <p className="text-gray-600 text-sm"><span className="font-bold text-gray-800">ZIP Code:</span> {order.shippingInformation?.zip}</p>
                        <p className="text-gray-600 text-sm"><span className="font-bold text-gray-800">Phone Number:</span>: {order.shippingInformation?.phone}</p>
                    </div>

                    {/* Products */}
                    <div className="bg-white rounded-2xl shadow p-4">
                        <h3 className="font-semibold text-gray-700 mb-4">Products</h3>
                        <div className="space-y-4">
                            {order.products?.map((product, index) => (
                                <div
                                    key={product.id || index}
                                    className="flex items-center justify-between bg-gray-50 p-3 rounded-xl hover:shadow transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={product.image}
                                            loading="lazy"
                                            alt={product.name}
                                            className="w-14 h-14 rounded-lg object-cover" />
                                        <div>
                                            <p className="font-medium text-gray-800">{product.title}</p>
                                            <p className="text-sm text-gray-500">Qty: {product.quantity}</p>
                                        </div>
                                    </div>

                                    <p className="font-semibold text-gray-900">
                                        ${(product.price * product.quantity).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card Details */}
                    {order.paymentMethod === "dc" && order.cardDetails && (
                        <div className="bg-white rounded-2xl shadow p-4">
                            <h3 className="font-semibold text-gray-700 mb-2">Card Info</h3>
                            <p className="text-sm text-gray-600">Holder: {order.cardDetails.cardHolder}</p>
                            <p className="text-sm text-gray-600">
                                Number: **** **** **** {order.cardDetails.cardNumber.slice(-4)}
                            </p>
                            <p className="text-sm text-gray-600">Expiry: {order.cardDetails.expiry}</p>
                        </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center bg-gray-200 font-bold text-lg text-gray-900 p-2 rounded-2xl">
                        <span className="text-lg">Total</span>
                        <span className="text-2xl font-bold">${order.totalPrice.toFixed(2)}</span>
                    </div>

                </div>

                {/* Actions */}
                <div className="p-6 flex justify-end gap-4">
                    <button className="px-3 py-2 rounded-xl bg-gray-300 hover:bg-gray-400 transition">
                        Track Order
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition shadow-lg"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Order;