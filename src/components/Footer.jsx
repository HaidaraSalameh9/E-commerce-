import React from "react";
import { FaFacebookF, FaInstagram, FaGithub, FaTwitter } from "react-icons/fa";
import logo from './../../public/logo.png';

const Footer = () => {
    return (
        <footer className="container  mx-auto text-gray-400 pt-12 pb-6 ">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">

                {/* Brand */}
                <div className="sm:col-span-2 lg:col-span-2  sm:text-left">
                    <div className="flex items-center  sm:justify-start gap-3 mb-4">
                        <img
                            src={logo}
                            alt="logo"
                            className="w-10 h-10 object-contain"
                        />

                        <h2 className="logo-text">
                            Al-Haidara
                        </h2>
                    </div>

                    <p className="text-sm mb-5 leading-relaxed text-gray-400">
                        Your all-in-one marketplace. Discover everything you need —
                        from fashion and electronics to everyday essentials.
                    </p>

                    <div className="flex  sm:justify-start gap-3">
                        {[FaTwitter, FaFacebookF, FaInstagram, FaGithub].map((Icon, i) => (
                            <div
                                key={i}
                                className="p-2 border border-gray-700 rounded-full
          hover:bg-white hover:text-black transition-all duration-300
          cursor-pointer hover:scale-110"
                            >
                                <Icon />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Links */}
                {[
                    {
                        title: "Company",
                        links: ["About", "Careers", "Press", "Blog"],
                    },
                    {
                        title: "Support",
                        links: ["Help Center", "Returns", "Shipping", "Contact"],
                    },
                    {
                        title: "Account",
                        links: ["Login", "Register", "Orders", "Wishlist"],
                    },
                    {
                        title: "Legal",
                        links: ["Privacy Policy", "Terms", "Cookies"],
                    },
                ].map((section, index) => (
                    <div
                        key={index}
                        className=" sm:text-left lg:text-right last:lg:text-left"
                    >
                        <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">
                            {section.title}
                        </h3>

                        <ul className="space-y-2 text-sm">
                            {section.links.map((link, i) => (
                                <li key={i}>
                                    <a
                                        href="#"
                                        className="hover:text-white transition duration-200"
                                    >
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Bottom */}
            <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">

                <p className="text-gray-500">
                    © {new Date().getFullYear()} Al-Haidara. All rights reserved.
                </p>

                {/* Payments */}
                <div className="flex gap-4 items-center">
                    <img
                        src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/visa.svg"
                        alt="visa"
                        className="h-6 bg-white p-1 rounded"
                    />
                    <img
                        src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mastercard.svg"
                        alt="mastercard"
                        className="h-6 bg-white p-1 rounded"
                    />
                    <img
                        src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paypal.svg"
                        alt="paypal"
                        className="h-6 bg-white p-1 rounded"
                    />
                    <img
                        src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/applepay.svg"
                        alt="applepay"
                        className="h-6 bg-white p-1 rounded"
                    />
                    <img
                        src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlepay.svg"
                        alt="gpay"
                        className="h-6 bg-white p-1 rounded"
                    />
                </div>
            </div>
        </footer>
    );
};

export default Footer;