import { useUser } from "@clerk/react";
import React, { useState } from "react";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
const Checkout = ({ setOrder, address }) => {
    const [pillingToggle, setPillingToggle] = useState(true);
    const [shippingToggle, setShippingToggle] = useState(false);
    const [paymentToggle, setPaymentToggle] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cod");
    const { user } = useUser();

    const [shippingInformation, setShippingInformation] = useState({
        address: address,
        city: "",
        zip: "",
        phone: "",
    });

    const [cardInfo, setCardInfo] = useState({
        cardNumber: "",
        cardHolder: "",
        expiry: "",
        cvv: ""
    });
    const navigate = useNavigate();
    const cart = useSelector(state => state.cart);


    const handleOrder = (e) => {
        e.preventDefault();

        if (!user) {
            alert("User not loaded");
            return;
        }

        let newOrder = {
            products: cart.product,
            orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            shippingInformation,
            totalPrice: cart.totalPrice,
            paymentMethod,

            customer: {
                name: user?.fullName || "",
                email: user?.primaryEmailAddress?.emailAddress || ""
            }
        };


        if (paymentMethod === "dc") {
            newOrder = {
                ...newOrder,
                cardDetails: cardInfo
            };
        }

        setOrder(newOrder);
        navigate("/order-confirmation");
    };







    return (
        <form onSubmit={handleOrder} className="container mx-auto py-8  px-4 md:px-16 lg:px-24">
            <h3 className="text-2xl font-semibold mb-4 text-gray-900">CHECKOUT</h3>
            <div className=" space-x-0 flex flex-col lg:flex-row justify-between lg:space-x-10 mt-8 items-center lg:items-start gap-2">
                <div className="w-full lg:w-2/3  bg-white p-4 rounded-md shadow-md border">
                    {/*Pilling  */}
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">

                        {/* Header */}
                        <div onClick={() => setPillingToggle(!pillingToggle)}
                            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Pilling Information
                            </h3>

                            <span
                                className={`text-xl text-gray-600 transition-transform duration-300
      ${pillingToggle ? "rotate-180" : "rotate-0"}
    `}
                            >
                                <FaAngleDown />
                            </span>
                        </div>

                        {/* Content */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${pillingToggle ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`} >
                            <div className="space-y-3 px-4 pb-4">
                                <div>
                                    <label className="font-medium text-gray-700">Name</label>
                                    <input
                                        className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition focus:border-gray-600 
                                        focus:outline-none text-gray-700 disabled:opacity-50 "
                                        type="text"
                                        placeholder="Enter Name"
                                        value={user?.fullName}
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">Email</label>
                                    <input
                                        className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition focus:border-gray-600 
                                        focus:outline-none text-gray-700  disabled:opacity-50  "
                                        type="email"
                                        placeholder="Enter Email"
                                        value={user?.primaryEmailAddress?.emailAddress}
                                        disabled
                                    />
                                </div>

                                <div>
                                    <label className="font-medium text-gray-700">Phone</label>
                                    <input
                                        className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition focus:border-gray-600 
                                        focus:outline-none text-gray-700   "
                                        type="text"
                                        placeholder="Enter Phone" required
                                        onChange={(e) => setShippingInformation({ ...shippingInformation, phone: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/*Shipping  */}
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">

                        {/* Header */}
                        <div onClick={() => setShippingToggle(!shippingToggle)} className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Shipping Information
                            </h3>

                            <span
                                className={`text-xl text-gray-600 transition-transform duration-300 ${shippingToggle ? "rotate-180" : "rotate-0"} `} >
                                <FaAngleDown />
                            </span>
                        </div>


                        {/* Content */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${shippingToggle ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`} >
                            <div className="space-y-3 px-4 pb-4">
                                <div>
                                    <label className="font-medium text-gray-700">Address</label>
                                    <input
                                        className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition focus:border-gray-600 
                                        focus:outline-none text-gray-700 disabled:opacity-50 "
                                        type="text"
                                        name="address"
                                        placeholder="Enter Address"
                                        value={address}
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">City</label>
                                    <input
                                        className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition focus:border-gray-600 
                                        focus:outline-none text-gray-700   "
                                        type="text"
                                        name="city"
                                        placeholder="Enter City Name"
                                        onChange={(e) => setShippingInformation({ ...shippingInformation, city: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700">Zip Code</label>
                                    <input
                                        className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition focus:border-gray-600 
                                        focus:outline-none text-gray-700  "
                                        type="text"
                                        name="zip"
                                        required
                                        placeholder="Enter Zip Code"
                                        onChange={(e) => setShippingInformation({ ...shippingInformation, zip: e.target.value })} />

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="mb-2 rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">

                        {/* Header */}
                        <div
                            onClick={() => setPaymentToggle(!paymentToggle)}
                            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"   >
                            <h3 className="text-lg font-semibold text-gray-800">
                                Payment Method
                            </h3>

                            <span
                                className={`text-xl text-gray-600 transition-transform duration-300 ${paymentToggle ? "rotate-180" : "rotate-0"} `}   >
                                <FaAngleDown />
                            </span>
                        </div>


                        {/* Content */}
                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${paymentToggle ? "max-h-125 opacity-100" : "max-h-0 opacity-0"}`} >
                            <div className="space-y-3 px-4 pb-4">

                                {/* Cash on Delivery */}
                                <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer
                                     hover:bg-blue-50 transition ${paymentMethod === "cod" ? "border-gray-600 hover:bg-white cursor-auto" : ""}`}>
                                    <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")}
                                        className="h-4 w-4 accent-black" />
                                    <span className="font-medium text-gray-700">
                                        Cash On Delivery
                                    </span>
                                </label>

                                {/* Debit Card */}
                                <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer
                                     hover:bg-blue-50 transition ${paymentMethod === "dc" ? "border-gray-600 hover:bg-white cursor-auto" : ""}`}>
                                    <input type="radio" name="payment" checked={paymentMethod === "dc"} onChange={() => setPaymentMethod("dc")}
                                        className="h-4 w-4 accent-black" />
                                    <span className="font-medium text-gray-700">
                                        Debit Card
                                    </span>
                                </label>

                                {paymentMethod === "dc" && (
                                    <div className={`space-y-2 transition duration-1000 ${paymentMethod === "dc" ? "max-h-125 opacity-100" : "max-h-0 opacity-0"}`}>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Debit Card Information</h3>
                                        <div>
                                            <label className="font-medium text-gray-700">Card Number</label>
                                            <input required className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition
                                             focus:border-gray-600  focus:outline-none text-gray-700 " type="text" placeholder="Enter Card Number"
                                                onChange={(e) =>
                                                    setCardInfo({ ...cardInfo, cardNumber: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="font-medium text-gray-700">Card Holder Name</label>
                                            <input placeholder="Card Holder Name" className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition
                                             focus:border-gray-600  focus:outline-none text-gray-700 " type="text"
                                                onChange={(e) =>
                                                    setCardInfo({ ...cardInfo, cardHolder: e.target.value })
                                                } />
                                        </div>
                                        <div>
                                            <div>
                                                <label className="font-medium text-gray-700">Expire Data</label>
                                                <input className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition
                                                 focus:border-gray-600  focus:outline-none text-gray-700 " type="text"
                                                    placeholder="Expire Date"
                                                    onChange={(e) =>
                                                        setCardInfo({ ...cardInfo, expiry: e.target.value })
                                                    } />
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-700">CVV</label>
                                                <input className="w-full border px-3 py-2 rounded-lg p-3  hover:bg-blue-50 transition
                                                 focus:border-gray-600 focus:outline-none text-gray-700 " type="text"
                                                    placeholder="CVV"
                                                    onChange={(e) =>
                                                        setCardInfo({ ...cardInfo, cvv: e.target.value })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>




                <div className="w-96 lg:w-1/3 flex-1 p-3 rounded-xl shadow-md border border-gray-500">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Order Summary
                    </h3>

                    <div className="space-y-3">
                        {cart.product?.map((product) => (
                            <div key={product.id} className="border-b border-gray-500 pb-3 ">
                                <div className="flex items-center justify-between gap-4">
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-500"
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-800 leading-tight">
                                            {product.title.slice(0.25)}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            ${product.price} x {product.quantity}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4">
                        <span className="text-base font-medium text-gray-700">
                            Total Price:
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                            ${cart.totalPrice.toFixed(2)}
                        </span>
                    </div>

                    <button type="submit"
                        className="w-full h-10 bg-black hover:bg-gray-900 rounded-md mt-3 text-white
        transition-all duration-300 ease-in-out shadow-md
        hover:scale-105 active:scale-95"
                    >
                        Place Order
                    </button>
                </div>
            </div>
        </form>
    );
};

export default Checkout;