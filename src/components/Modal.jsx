import React from 'react';

const Modal = ({ isModelOpen, setIsModelOpen, children }) => {
    if (!isModelOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsModelOpen(false)} >
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative animate-scaleIn"
                onClick={(e) => e.stopPropagation()} >

                <button className="absolute top-3 right-3 text-gray-500 text-2xl hover:text-black transition"
                    onClick={() => setIsModelOpen(false)}>
                    &times;
                </button>


                <div>{children}</div>
            </div>
        </div>);
};

export default Modal;