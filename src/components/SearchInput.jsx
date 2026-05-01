import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSearchResults } from "../app/features/searchSlice";
import { useNavigate } from "react-router-dom";

const SearchInput = ({ isScrolled }) => {
    const [focused, setFocused] = useState(false);
    const [query, setQuery] = useState("");
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { results, loading } = useSelector((state) => state.searchProduct);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                dispatch(fetchSearchResults(query));
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [query, dispatch]);

    return (
        <div className="relative">


            <div
                className={`flex items-center rounded-full px-3 py-1 transition-all duration-500 ${focused ? "w-45" : "w-40"}  ${isScrolled
                    ? "bg-gray-100 shadow-md"
                    : "bg-white/80 backdrop-blur-md shadow-lg"
                    }`}
            >
                <svg
                    className={`w-5 h-5 transition-all duration-300 ${focused ? "text-gray-400 scale-80" : "text-gray-500"
                        }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Search products..." onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocused(true)}
                    onBlur={() => {
                        setTimeout(() => setFocused(false), 200);
                    }}
                    className={`outline-none bg-transparent text-sm px-2 transition-all duration-300 w-full
                ${isScrolled
                            ? "text-black placeholder:text-gray-500"
                            : "text-black placeholder:text-gray-600"
                        }`}
                />

            </div>

            {/* 🔥 Live Results */}
            {focused && query && (
                <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-lg mt-2 max-h-64 overflow-y-auto z-50">

                    {loading && (
                        <p className="p-3 text-sm text-gray-500">Loading...</p>
                    )}

                    {!loading && results.length === 0 && (
                        <p className="p-3 text-sm text-gray-500">
                            No results found
                        </p>
                    )}

                    {!loading &&
                        results.map((product) => (
                            <div
                                key={product.id}
                                onMouseDown={() => {
                                    console.log("CLICKED", product.id);
                                    navigate(`/productDetails/${product.id}`);
                                }}
                                className="flex items-center gap-3 p-2 hover:bg-gray-100 cursor-pointer border-b-black"
                            >
                                <img
                                    src={product.images[0]}
                                    alt={product.title}
                                    className="w-10 h-10 object-cover rounded border border-gray-700"
                                />
                                <span className="text-sm text-gray-500">{product.title}</span>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};

export default SearchInput;