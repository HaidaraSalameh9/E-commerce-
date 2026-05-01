import React, { useEffect, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategoryProducts } from '../app/features/categoryProductSlice';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import Spinner from './Spinner';


const EMPTY_ARRAY = [];
const MIN_RATING = 2.5;

const categories = [
    { key: "groceries", label: "Groceries" },
    { key: "furniture", label: "Furniture" },
    { key: "fragrances", label: "Fragrances" },
    { key: "beauty", label: "Beauty" },
];

const TopProducts = () => {
    const dispatch = useDispatch();

    const { productsByCategory, loadingByCategory, errorByCategory } =
        useSelector(state => state.categoryProducts);

    const [selected, setSelected] = useState("groceries");


    const products = productsByCategory[selected] || EMPTY_ARRAY;
    const loading = loadingByCategory[selected];
    const error = errorByCategory[selected];


    useEffect(() => {
        if (!productsByCategory[selected]) {
            dispatch(fetchCategoryProducts(selected));
        }
    }, [dispatch, selected, productsByCategory]);


    const filteredProducts = useMemo(() => {
        return products.filter(p => p.rating > MIN_RATING);
    }, [products]);





    if (error && !loading) {
        return (
            <div className='flex justify-center items-center flex-col gap-1 mb-4'>
                <h3 className="text-red-500 text-xl font-bold text-center">
                    Something went wrong <span className='text-black'>{error}</span>
                </h3>
                <button
                    onClick={() => dispatch(fetchCategoryProducts(selected))}
                    className="px-4 py-2 w-40 bg-black text-white rounded hover:bg-gray-800">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <section>
            <h3 className='text-black text-3xl text-center font-bold mb-6'>
                PRODUCT OF THE WEEK
            </h3>

            <div className="flex flex-wrap justify-center gap-3 text-sm mb-8 px-2">
                {categories.map((cat) => (
                    <label
                        key={cat.key}
                        htmlFor={cat.key}
                        className="flex flex-col items-center cursor-pointer group"
                    >
                        <input type="radio" name="options" id={cat.key} className="hidden" checked={selected === cat.key} onChange={() => setSelected(cat.key)}
                        />


                        <span
                            className={`py-2 px-4 sm:px-6 whitespace-nowrap transition-all duration-200 ${selected === cat.key
                                ? "font-bold text-black"
                                : "font-normal text-gray-500"}`}
                        >
                            {cat.label}
                        </span>


                        <span
                            className="block h-[1.5px] bg-gray-800 w-[65%] ml-3  scale-x-0 origin-left  transition-transform duration-300  group-hover:scale-x-90"
                        />
                    </label>
                ))}
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Spinner />
                </div>
            ) : filteredProducts.length === 0 ? (
                <p className="text-center text-gray-500">
                    No products found in this category
                </p>
            ) : (
                <Swiper
                    key={selected}
                    modules={[Autoplay]}
                    loop
                    speed={5000}
                    spaceBetween={20}
                    autoplay={{
                        delay: 0,
                        disableOnInteraction: false,
                    }}
                    breakpoints={{
                        0: { slidesPerView: 1.1 },
                        640: { slidesPerView: 1.7 },
                        768: { slidesPerView: 2.1 },
                        1024: { slidesPerView: 3 },
                        1280: { slidesPerView: 4 },
                    }}
                >
                    {filteredProducts.map((product) => (
                        <SwiperSlide key={product.id}>
                            <ProductCard product={product} />
                        </SwiperSlide>
                    ))}
                </Swiper>
            )}
        </section>
    );
};

export default TopProducts;