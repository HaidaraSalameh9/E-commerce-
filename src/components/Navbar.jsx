import React, { useEffect, useRef, useState } from "react";


import logo from './../../public/logo.png';
import { GiShoppingCart } from "react-icons/gi";
import SearchInput from "./SearchInput";

import { useClerk, useUser, UserButton } from '@clerk/react';

import { Link } from "react-router";
import { useSelector } from "react-redux";
import { FaHeart, FaRegHeart } from "react-icons/fa";
const Navbar = () => {
    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Products', path: '/products' },
        { name: 'Contact', path: '/contact' },
        { name: 'About', path: '/about' },
    ];

    const ref = useRef(null);

    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const { openSignIn } = useClerk();
    const { user } = useUser();


    useEffect(() => {
        const handleScroll = () => {

            setIsScrolled(window.scrollY > 10);

        };
        handleScroll();

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const products = useSelector((state) => state.cart.product);
    const favorites = useSelector((state) => state.favorite.product);

    return (
        <div ref={ref} className=" overflow-y-scroll">

            <nav className={`fixed w-full left-0 top-0 px-2  transition-all duration-500 z-50 ${isScrolled ? "bg-white/90 shadow-md text-gray-700 backdrop-blur-lg py-3 md:py-3" : "py-4 md:py-4"} `}>
                <div className={`container flex items-center justify-between mx-auto`}>
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-95 ">
                        <img src={logo} className={`h-15 w-15 transition-transform duration-300  ${isScrolled ? "scale-90" : "scale-100"}`} />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-4 lg:gap-8">
                        {navLinks.map((link, i) => (
                            <Link key={i} to={link.path} className={`group flex flex-col gap-0.5 ${isScrolled ? "text-gray-700" : "text-white/80"}`}>
                                {link.name}
                                <div className={`${isScrolled ? "bg-gray-700" : "bg-white/80"} h-0.5 w-0 group-hover:w-full transition-all duration-300`} />
                            </Link>
                        ))}

                    </div>

                    {/* Desktop Right */}
                    <div className="hidden md:flex items-center gap-4">
                        {favorites.length > 0 && <Link
                            to="/favorite"
                            className={`relative text-sm p-2 rounded-full border
    transition-all duration-300 cursor-pointer hover:scale-110
    ${isScrolled ? "text-black" : "text-white/80"}
    hover:bg-white/80 hover:text-black`}
                        >
                            <FaHeart className="text-xs" />
                            {favorites.length > 0 && (
                                <span className="absolute -top-1 -right-2 min-w-4.5 h-4.5 px-1 text-[10px] bg-red-600 rounded-full flex justify-center items-center text-white">
                                    {favorites.length}
                                </span>
                            )}
                        </Link>}

                        <SearchInput isScrolled={isScrolled} />
                        <Link to={"/cart"} className={`relative p-2 border border-gray-700 rounded-full
    transition-all duration-300 cursor-pointer hover:scale-110
    ${isScrolled ? "text-black" : "text-white/80"}
    hover:bg-white/80 hover:text-black`}
                        >
                            <GiShoppingCart />

                            {products.length > 0 && (
                                <span className="absolute -top-1 -right-2 min-w-4.5 h-4.5 px-1 text-[10px] bg-red-600 rounded-full flex justify-center items-center text-white">
                                    {products.length}
                                </span>
                            )}
                        </Link>

                        {user ? <UserButton /> : <button onClick={openSignIn} className={`px-8 py-2.5 rounded-full ml-4 transition-all duration-500 ${isScrolled ? "text-white bg-black" : "bg-white text-black"}`}>
                            Login
                        </button>}

                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center gap-3 md:hidden" >
                        {user && <UserButton />}
                        <SearchInput isScrolled={isScrolled} />

                        <Link to={"/cart"} className={`relative p-2 border border-gray-700 rounded-full
    transition-all duration-300 cursor-pointer hover:scale-110
    ${isScrolled ? "text-black" : "text-white"}
    hover:bg-white hover:text-black`}
                        >
                            <GiShoppingCart />

                            {products.length > 0 && (
                                <span className="absolute -top-1 -right-2 min-w-4.5 h-4.5 px-1 text-[10px] bg-red-600 rounded-full flex justify-center items-center text-white">
                                    {products.length}
                                </span>
                            )}
                        </Link>
                        <div className="relative">
                            <svg
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`h-6 w-6 cursor-pointer text-white ${isScrolled ? "invert" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="18" x2="20" y2="18" />
                            </svg>

                            {favorites.length > 0 && <span className="absolute -top-1 -right-2 min-w-4.5 h-4.5 px-1 text-[10px] bg-red-600 rounded-full flex justify-center items-center text-white">
                                {favorites.length}
                            </span>}

                        </div>
                    </div>

                    {/* Mobile Menu */}
                    <div className={`fixed top-0 left-0 w-full h-screen bg-white text-base flex flex-col md:hidden items-center justify-center gap-6 font-medium text-gray-800 transition-all duration-500 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                        <button className="absolute top-4 right-4 " onClick={() => setIsMenuOpen(false)}>
                            <svg className="h-6 w-6 " fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        {navLinks.map((link, i) => (
                            <Link key={i} to={link.path} onClick={() => setIsMenuOpen(false)}>
                                {link.name}
                            </Link>
                        ))}

                        {favorites.length > 0 && <Link className="relative text-sm p-2 rounded-full border" to="/favorite">
                            <FaHeart className={`text-xs cursor-pointer transition-all duration-500 ${isScrolled ? "text-black" : "text-black"}`} />
                            {favorites.length > 0 && (
                                <span className="absolute -top-1 -right-2 min-w-4.5 h-4.5 px-1 text-[10px] bg-red-600 rounded-full flex justify-center items-center text-white">
                                    {favorites.length}
                                </span>
                            )}
                        </Link>}


                        {!user && <button onClick={openSignIn} className="bg-black text-white px-8 py-2.5 rounded-full transition-all duration-500">
                            Login
                        </button>}

                    </div>
                </div>


            </nav>
        </div>



    );
};

export default Navbar;