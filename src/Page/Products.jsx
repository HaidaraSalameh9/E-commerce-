import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../app/features/allProductSlice';
import Spinner from '../components/Spinner';
import ProductCard from '../components/ProductCard';

const Products = () => {
    const dispatch = useDispatch();
    const { loading, error, products = [] } = useSelector(
        (state) => state.allProducts
    );

    useEffect(() => {
        dispatch(fetchProducts());
    }, [dispatch]);


    if (error && !loading) {
        return <div className='flex justify-center items-center flex-col gap-1 mb-4'>
            <h3 className="text-red-500 text-xl font-bold  text-center">
                Something went wrong <span className='text-black'>{error}</span>
            </h3>
            <p className="text-gray-500">
                Failed to load products. Please try again.
            </p>
            <button onClick={() => dispatch(fetchProducts())} className="px-4 py-2 w-40 bg-black text-white rounded hover:bg-gray-800 transition"  >
                Retry
            </button>
        </div>;
    }


    return (
        <div>
            <h1 className='text-center text-black text-4xl mb-4'> All Product</h1>

            {loading ? <div className="flex justify-center items-center h-64">
                <Spinner />
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {products?.map((product) => (
                    <ProductCard product={product} key={product.id} />
                ))}
            </div>
            }
        </div>
    );
};

export default Products;
