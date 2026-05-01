import React, { useEffect, useState } from "react";
import hero_1 from "./../assets/hero-1.png";
import hero_2 from "./../assets/hero-2.png";
import hero_3 from "./../assets/hero-3.png";
import hero_4 from "./../assets/hero-4.png";
import hero_5 from "./../assets/hero-5.png";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import { useNavigate } from "react-router";

const images = [
    hero_1,
    hero_2,
    hero_3,
    hero_4,
    hero_5,
];

const Hero = () => {
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        let timeout;

        const interval = setInterval(() => {
            setFade(false); // fade out

            timeout = setTimeout(() => {
                setIndex((prev) => (prev + 1) % images.length);
                setFade(true); // fade in
            }, 400);
        }, 3000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    const navigate = useNavigate();

    return (
        <section className="w-full min-h-screen flex flex-col md:flex-row items-center justify-between">

            {/* LEFT SIDE */}
            <div className="max-w-xl space-y-4 text-center md:text-left">
                <h1 className="text-4xl  font-bold text-gray-900 leading-tight">
                    NEW SUMMER <br /> COLLECTION
                </h1>

                <h2 className="text-2xl text-gray-600 font-medium">
                    30% OFF 2026
                </h2>

                <p className="text-gray-500 text-sm leading-relaxed">
                    The standard chunk of Lorem Ipsum used since the 1500s is reproduced below.
                </p>

                <button onClick={() => navigate("/products")} className="bg-black text-white px-8 py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-105">
                    Shop Now
                </button>

                <div className="h-30 w-30 hidden border-l border-gray-600 md:flex items-end pb-0 p-1 justify-between relative text-gray-600">
                    <FaFacebook className="cursor-pointer hover:text-blue-600 transition-all duration-300 hover:scale-110" />
                    <FaInstagram className="cursor-pointer hover:text-pink-500 transition-all duration-300 hover:scale-110" />
                    <FaTwitter className="cursor-pointer hover:text-sky-500 transition-all duration-300 hover:scale-110" />
                    <span className=" absolute -left-7 top-4 translate-y-[-50%] rotate-90">Scroll</span>
                </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="w-full md:w-1/2 flex justify-center mt-10 md:mt-0">
                <img
                    src={images[index]}
                    alt="hero"
                    className={`w-180 h-full object-cover transition-all duration-700 ease-in-out ${fade ? "opacity-100 scale-100" : "opacity-0 scale-105"
                        }`}
                />
            </div>
        </section>
    );
};

export default Hero;