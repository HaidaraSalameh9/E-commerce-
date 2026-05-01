import React from "react";
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";

const Contact = () => {
    return (
        <div className="bg-gray-100 min-h-screen py-12 px-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-gray-800 mb-3">
                        Contact Us
                    </h1>
                    <p className="text-gray-500">
                        We'd love to hear from you. Please fill out this form.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-10">

                    {/* Left - Contact Info */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-4">
                                <FaPhoneAlt className="text-black" />
                                <div>
                                    <h3 className="font-semibold text-gray-800">Phone</h3>
                                    <p className="text-sm text-gray-500">+123 456 789</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-4">
                                <FaEnvelope className="text-black" />
                                <div>
                                    <h3 className="font-semibold text-gray-800">Email</h3>
                                    <p className="text-sm text-gray-500">
                                        haidarhsalamh@gmail.com
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-4">
                                <FaMapMarkerAlt className="text-black" />
                                <div>
                                    <h3 className="font-semibold text-gray-800">Location</h3>
                                    <p className="text-sm text-gray-500">
                                        New York, USA
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right - Form */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm">
                        <form className="space-y-5">

                            <div>
                                <label className="block text-sm mb-1 text-gray-600">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Your name"
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="block text-sm mb-1 text-gray-600">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="Your email"
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="block text-sm mb-1 text-gray-600">
                                    Message
                                </label>
                                <textarea
                                    rows="5"
                                    placeholder="Write your message..."
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-black"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition"
                            >
                                Send Message
                            </button>

                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Contact;