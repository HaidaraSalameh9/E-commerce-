import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductDetails } from '../app/features/productDetailsSlice';
import { useParams } from 'react-router';
import Spinner from '../components/Spinner';
import { addToCart } from '../app/features/cartSlice';
import { FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { addToFavorite } from '../app/features/favoriteSlice';
import { useClerk, useUser } from '@clerk/react';

const ProductDetails = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    const { loading, error, product } = useSelector(
        state => state.singleProduct
    );

    const [quantity, setQuantity] = useState(1);
    const [thumbnail, setThumbnail] = useState(null);

    const { openSignIn } = useClerk();
    const { user } = useUser();



    // fetch product
    useEffect(() => {
        dispatch(fetchProductDetails(id));
    }, [dispatch, id]);

    // set first image after loading
    useEffect(() => {
        if (product?.images?.length > 0) {
            setThumbnail(product.images[0]);
        }
    }, [product]);


    const favorites = useSelector(state => state.favorite.product);

    const isFavorite = favorites.some(item => item.id === product?.id);


    const addProductToCart = (product, quantity) => {
        const confirmAdd = confirm(`Do you want to add ${product.title} to your cart?`);

        if (confirmAdd) {
            dispatch(addToCart({ ...product, quantity }));
            console.log(product);
        }
    };


    if (loading) return <Spinner />;


    if (error && !loading) {
        return (
            <div className='flex justify-center items-center flex-col gap-1 mb-4'>
                <h3 className="text-red-500 text-xl font-bold text-center">
                    Something went wrong <span className='text-black'>{error}</span>
                </h3>
                <p className="text-gray-500">
                    Failed to load product. Please try again.
                </p>
                <button
                    onClick={() => dispatch(fetchProductDetails(id))}
                    className="px-4 py-2 w-40 bg-black text-white rounded hover:bg-gray-800 transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!product) return null;

    return (
        <div className="flex flex-col md:flex-row gap-x-16 text-gray-600">


            <div className="md:w-1/2 py-4  md:px-8 flex flex-col gap-6">


                <div className="border border-gray-400 rounded overflow-hidden flex justify-center items-center bg-gray-200/34 h-80">
                    <img
                        src={thumbnail}
                        alt={product.name}
                        className="h-full object-contain  transition duration-200"
                    />
                </div>

                <div className="flex gap-3 flex-wrap justify-center b">
                    {product.images?.map((image, index) => (
                        <div
                            key={index}
                            onClick={() => setThumbnail(image)}
                            className={`border p-1 rounded cursor-pointer  bg-gray-200 hover:bg-gray-300
                            ${thumbnail === image ? 'border-gray-500' : 'border-gray-300'}`}   >
                            <img src={image} alt={`Thumbnail ${index + 1}`} className="w-16 h-16 object-contain" />
                        </div>
                    ))}
                </div>
            </div>


            <div className="md:w-1/2 py-2 flex flex-col gap-4">

                <h1 className="text-3xl font-bold text-gray-800">{product.title}</h1>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        {Array(5).fill('').map((_, i) => {
                            const fillPercentage = Math.min(
                                Math.max(product.rating - i, 0),
                                1
                            ) * 100;

                            return (
                                <div key={i} className="relative w-4 h-4">

                                    <FaStar className="text-gray-300 absolute top-0 left-0" />


                                    <div
                                        className="absolute top-0 left-0 overflow-hidden"
                                        style={{ width: `${fillPercentage}%` }}
                                    >
                                        <FaStar className="text-yellow-400" />
                                    </div>

                                </div>
                            );
                        })}

                        <span className="ml-2 text-sm">{product.rating}</span>
                    </div>
                    <button onClick={() => dispatch(addToFavorite(product))}
                        className={`hover:scale-105  transition-all duration-300 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200
                             hover:font-bold ${!isFavorite ? "text-gray-600 hover:text-gray-700" : "text-black hover:text-gray-900"}`}>
                        {isFavorite ? <FaHeart /> : <FaRegHeart />}
                    </button>
                </div>


                <div className="mt-4">
                    <p className="text-gray-400 line-through">
                        ${(product.price / (1 - product.discountPercentage / 100)).toFixed(2)}
                    </p>

                    <p className='text-2xl text-gray-600 font-semibold'>
                        ${product.price}
                    </p>


                    <span className="text-gray-500 text-sm">
                        (inclusive of all taxes)
                    </span>
                </div>


                <div>
                    <h3 className="font-semibold mt-4">About Product</h3>
                    <ul className="list-disc ml-5 text-gray-500">
                        {Array.isArray(product.description)
                            ? product.description.map((desc, index) => (
                                <li key={index}>{desc}</li>
                            ))
                            : <li>{product.description}</li>
                        }
                    </ul>
                </div>


                <div className="flex items-center gap-4 mt-6">
                    <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-20 px-3 py-1 text-center border rounded-xl outline-none 
        shadow-sm focus:border-gray-800 focus:w-22
        transition-all duration-200" />

                    {!user ? <button onClick={openSignIn}
                        className="bg-black text-white px-8 py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-105"  >
                        Add to Cart
                    </button> : <button onClick={() => addProductToCart(product, quantity)}
                        className="bg-black text-white px-8 py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-105"  >
                        Add to Cart
                    </button>}
                </div>

            </div>
        </div>
    );
};

export default ProductDetails;