import React from "react";
import { Link } from "react-router";

const About = () => {
    return (
        <div className="bg-gray-100 min-h-screen py-12 px-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-gray-800 mb-3">
                        About Us
                    </h1>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Discover who we are, what we offer, and why we’re passionate about bringing you the best products across every category.
                    </p>
                </div>

                {/* Story Section */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-10">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                        Our Story
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                        At Al-Haidara, we believe shopping is more than just buying products — it’s a way to express your lifestyle.
                        Since our beginning, we’ve been dedicated to offering a wide range of high-quality products, from fashion to everyday essentials, helping you find everything you need in one place with confidence and ease.
                    </p>
                </div>

                {/* Mission + Vision */}
                <div className="grid md:grid-cols-2 gap-8 mb-10">

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                            Our Mission
                        </h3>
                        <p className="text-gray-600">
                            To deliver high-quality, affordable products for everyone — without compromising on value, variety, or experience.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">
                            Our Vision
                        </h3>
                        <p className="text-gray-600">
                            To become a leading global marketplace that inspires confidence, convenience, and individuality in every shopping experience.
                        </p>
                    </div>

                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 text-center">
                    {[
                        { number: "100K+", label: "Happy Customers" },
                        { number: "5000+", label: "Products" },
                        { number: "500+", label: "Brands" },
                        { number: "5 Years", label: "Experience" },
                    ].map((item, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl shadow-sm p-6"
                        >
                            <h3 className="text-2xl font-bold text-gray-800">
                                {item.number}
                            </h3>
                            <p className="text-gray-500 text-sm">{item.label}</p>
                        </div>
                    ))}
                </div>

                {/* Team Section */}
                <div className="mb-10">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        Our Team
                    </h2>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {[
                            {
                                name: "John Doe",
                                role: "Founder",
                                image: "https://randomuser.me/api/portraits/men/32.jpg"
                            },
                            {
                                name: "Sarah Smith",
                                role: "Designer",
                                image: "https://randomuser.me/api/portraits/women/44.jpg"
                            },
                            {
                                name: "Michael Lee",
                                role: "Marketing",
                                image: "https://randomuser.me/api/portraits/men/46.jpg"
                            },
                        ].map((member, index) => (
                            <div
                                key={index}
                                className="group bg-white rounded-2xl shadow-md p-6 text-center 
            transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                            >
                                {/* Image */}
                                <div className="relative w-24 h-24 mx-auto mb-4">
                                    <img
                                        loading="lazy"
                                        src={member.image}
                                        alt={member.name}
                                        className="w-full h-full object-cover rounded-full border-4 border-gray-100 
                    group-hover:scale-110 transition duration-300"
                                    />
                                </div>

                                {/* Name */}
                                <h4 className="font-semibold text-gray-800 text-lg">
                                    {member.name}
                                </h4>

                                {/* Role */}
                                <p className="text-sm text-gray-500 mb-3">
                                    {member.role}
                                </p>

                                {/* Social Icons (optional) */}
                                <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition duration-300">
                                    <span className="text-gray-400 hover:text-black cursor-pointer text-sm">FB</span>
                                    <span className="text-gray-400 hover:text-black cursor-pointer text-sm">IG</span>
                                    <span className="text-gray-400 hover:text-black cursor-pointer text-sm">TW</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="bg-black text-white rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-semibold mb-3">
                        Join Our Journey
                    </h2>
                    <p className="text-gray-300 mb-5">
                        Be part of our growing community and explore the latest trends.
                    </p>
                    <Link to={"/"}>
                        <button className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200 transition">
                            Shop Now
                        </button>
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default About;