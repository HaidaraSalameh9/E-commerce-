import React, { useState, useRef, useEffect } from 'react';

const ChangeAddress = ({ address, setAddress, closeModal }) => {
    const [newAddress, setNewAddress] = useState(address || "");
    const [focused, setFocused] = useState(false);
    const inputRef = useRef();

    useEffect(() => {
        inputRef.current.focus();
    }, []);




    const onClose = () => {
        if (!newAddress.trim()) return;
        setAddress(newAddress);
        closeModal(false);
    };

    return (
        <div>
            <div
                className={`flex items-center rounded-full px-3 py-1 border transition-all duration-300 ${focused ? "w-52 border-gray-800" : "w-40 border-gray-300"
                    }`}
            >
                <input
                    ref={inputRef}
                    className="w-full outline-none bg-transparent text-sm px-2 text-black placeholder:text-gray-600"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onClose()}
                    type="text"
                    placeholder="Change Address"
                />
            </div>

            <div className="flex justify-end mt-4 gap-2">
                <button
                    onClick={() => closeModal(false)}
                    className="bg-gray-400 hover:bg-gray-500 2 rounded-xl text-white py-2 px-4  transition-all duration-300 shadow-md hover:scale-105"
                >
                    Cancel
                </button>

                <button
                    onClick={onClose}
                    disabled={!newAddress.trim()}
                    className={`bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:scale-105  ${newAddress.trim()
                        ? "bg-black hover:bg-gray-600"
                        : "bg-black/20 cursor-not-allowed"
                        }`}
                >
                    Save Address
                </button>
            </div>
        </div>
    );
};

export default ChangeAddress;