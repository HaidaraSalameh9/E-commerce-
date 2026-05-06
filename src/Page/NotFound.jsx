import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">

            {/* Big 404 */}
            <h1 className="text-8xl font-extrabold text-gray-800 tracking-widest">
                404
            </h1>

            {/* Divider line */}
            <div className="w-24 h-1 bg-red-500 my-4 rounded"></div>

            {/* Message */}
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-700">
                Oops! Page not found
            </h2>

            <p className="text-gray-500 mt-3 max-w-md">
                The page you are looking for might have been removed,
                had its name changed, or is temporarily unavailable.
            </p>

            {/* Buttons */}
            <div className="flex gap-4 mt-6 flex-wrap justify-center">

                <Link
                    to="/"
                    className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-105"
                >
                    Go Home
                </Link>

                <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-400 hover:bg-gray-500 2 rounded-xl text-white py-2 px-4  transition-all duration-300 shadow-md hover:scale-105"
                >
                    Go Back
                </button>

            </div>

        </div>
    );
};

export default NotFound;