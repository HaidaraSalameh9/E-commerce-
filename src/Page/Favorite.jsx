import React from 'react';
import { useSelector } from 'react-redux';

import { FaArrowRight, FaHeart } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import { Link } from 'react-router';

const Favorite = () => {
    const products = useSelector(state => state.favorite.product);

    if (products.length === 0) {
        return (
            <div className="text-center mt-20 text-gray-500 flex flex-col items-center gap-4">
                <h2 className="text-2xl font-semibold">No favorites yet</h2>

                <Link
                    to="/products"
                    className="bg-black text-white px-2 py-2 rounded-lg hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md
                    flex items-center gap-2"
                >
                    Add some products to your favorites <FaArrowRight />
                </Link>
            </div>
        );
    }

    return (
        <div className="">
            <h1 className="text-2xl font-bold mb-6 text-gray-700  text-center">My Wishlist</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((product, index) => (
                    <ProductCard product={product} key={index} />
                ))}
            </div>
        </div>
    );
};

export default Favorite;