import React, { memo, useRef } from "react";
import { FaHeart, FaRegHeart, FaStar } from "react-icons/fa";

import { LuEye } from "react-icons/lu";
import { GiShoppingCart } from "react-icons/gi";
import { useDispatch, useSelector, } from "react-redux";
import { addToCart } from "../app/features/cartSlice";
import { Link } from "react-router";
import { addToFavorite } from "../app/features/favoriteSlice";
import { useClerk, useUser } from "@clerk/react";




const ProductCard = ({ product }) => {

    const overlayRef = useRef();

    const hoverImage = () => {
        overlayRef.current.style.opacity = "1";
    };

    const leaveImage = () => {
        overlayRef.current.style.opacity = "0";
    };

    const dispatch = useDispatch();

    const favorites = useSelector(state => state.favorite.product);
    const isFavorite = favorites.some(item => item.id === product.id);

    const { openSignIn } = useClerk();
    const { user } = useUser();


    const addProductToCart = (product) => {
        const confirmAdd = confirm(`Do you want to add ${product.title} to your cart?`);

        if (confirmAdd) {
            dispatch(addToCart(product));
        }
    };




    return (

        <div className="relative bg-white rounded-xl  overflow-hidden">

            {/* IMAGE */}
            <div className="h-45 relative overflow-hidden group animated-bg " onMouseEnter={hoverImage} onMouseLeave={leaveImage} >


                {/* 🔥 Animated Gradient Background */}
                <div className="absolute inset-0 animated-bg"></div>

                {/* 🌫️ Overlay on hover */}
                <div
                    ref={overlayRef}
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition duration-300"
                ></div>

                {/* 🖼️ Image */}
                <Link to={`/productDetails/${product.id}`}>
                    <img src={product.images[0]} loading="lazy" alt="product" className="relative z-10 w-full h-full object-contain
                     bg-transparent transition-all duration-500 group-hover:scale-105" />
                </Link>
            </div>

            {/* SALE BADGE */}
            <span className="absolute top-3 left-3 bg-gray-200 text-xs px-2 py-1 rounded">
                Sale
            </span>



            {/* CONTENT */}
            <div className="p-4 space-y-2">

                <p className="text-xs text-gray-400">
                    {product.shippingInformation}
                </p>
                <div className="flex items-center justify-between gap-2">
                    <h4 className="text-lg text-black font-medium">
                        {product.title.length > 25
                            ? product.title.slice(0, 25)
                            : product.title}
                    </h4>

                    <button onClick={() => dispatch(addToFavorite(product))} className={`hover:scale-110 text-xs bg-gray-200 rounded-full p-2  transition-all duration-300 
                          hover:font-bold ${!isFavorite ? "text-gray-600 hover:text-gray-700" : "text-gray-900 hover:text-gray-800"}`}>
                        {isFavorite ? <FaHeart /> : <FaRegHeart />}
                    </button>
                </div>

                <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg text-black font-bold">${product.price}</span>
                        <span className="text-sm text-gray-400 line-through"> ${(product.price / (1 - product.discountPercentage / 100)).toFixed(2)}</span>
                    </div>
                    <button className="hover:scale-110 transition-all   p-2 duration-300 text-gray-600 hover:text-gray-700"><Link to={`/productDetails/${product.id}`}>
                        <LuEye />
                    </Link></button>
                </div>

                <div className="flex items-center  justify-between ">
                    <div className="flex items-center gap-x-2 text-sm text-gray-500">
                        <div className="relative w-4 h-4">
                            <FaStar className="text-gray-300 absolute top-0 left-0" />
                            <div className="absolute top-0 left-0 overflow-hidden"
                                style={{ width: `${(product.rating / 5) * 100}%` }} >
                                <FaStar className="text-yellow-400" />
                            </div>
                        </div>

                        <span>{product.rating}</span>
                        <span>{product.stock} Sold</span>
                    </div>

                    {!user ? <button className=" w-30 flex items-center justify-center gap-2 bg-black text-white  py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-105"
                        onClick={openSignIn}>
                        Add to cart   <GiShoppingCart />
                    </button> :
                        <button className=" w-30 flex items-center justify-center gap-2 bg-black text-white  py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-105"
                            onClick={() => addProductToCart(product)}>
                            Add to cart   <GiShoppingCart />
                        </button>}
                </div>

            </div>

        </div>
    );
};

export default memo(ProductCard);