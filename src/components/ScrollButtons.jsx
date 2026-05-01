import React, { useEffect, useState } from "react";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

const ScrollButton = () => {
    const [isTop, setIsTop] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            setIsTop(window.scrollY < 300);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleScrollClick = () => {
        if (isTop) {

            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
            });
        } else {

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
    };

    return (
        <button
            onClick={handleScrollClick}
            className="fixed bottom-5 right-5 z-50 bg-black/80 text-white p-4 rounded-full shadow-lg border  hover:bg-gray-800/80 border-white transition-all duration-300 hover:scale-105"
        >
            {isTop ? <FaArrowDown /> : <FaArrowUp />}
        </button>
    );
};

export default ScrollButton;