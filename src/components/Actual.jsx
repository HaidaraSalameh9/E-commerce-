
import React from 'react';
import actual_1 from './../assets/actual-1.png';
import actual_2 from './../assets/actual-2.png';
import actual_3 from './../assets/actual-3.png';
import actual_4 from './../assets/actual-4.png';

const Actual = () => {
  return (
    <section className="py-16">
      <h3 className="text-xl text-gray-500 font-light mb-12 tracking-wide">
        Actual Collection
      </h3>


      <div className="grid grid-cols-1 md:grid-cols-11 gap-5 w-full ">

        {/* LEFT BIG */}
        <div className="relative h-70 md:h-90 cursor-pointer group md:col-span-4 overflow-hidden rounded-sm">
          <img
            src={actual_1}
            alt="Woman Collection"
            className="w-full h-full bg-black object-contain grayscale brightness-75 
      transition-all duration-700 group-hover:scale-105 group-hover:brightness-90"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-500"></div>

          <div className="absolute bottom-8 left-8 text-white">
            <h2 className=" text-lg font-light leading-tight tracking-wide">
              Woman <br /> Collection →
            </h2>
          </div>
        </div>

        {/* MIDDLE */}
        <div className="flex md:h-90 flex-col gap-5 md:col-span-3">

          {/* Accessories */}
          <div className="relative cursor-pointer group overflow-hidden rounded-sm h-1/2">
            <img
              src={actual_2}
              alt="Accessories"
              className="w-full h-70 md:h-45 object-contain  grayscale brightness-75 bg-black
        transition-all duration-700 group-hover:scale-105 group-hover:brightness-90"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all"></div>

            <div className="absolute bottom-6 left-6 text-white text-lg tracking-wide">
              Accessories <br /> Collection →
            </div>
          </div>

          {/* Kids */}
          <div className="relative cursor-pointer group overflow-hidden rounded-sm h-1/2">
            <img
              src={actual_3}
              alt="Kids"
              className="w-full h-70 md:h-45 object-contain  grayscale brightness-75 bg-black
        transition-all duration-700 group-hover:scale-105 group-hover:brightness-90"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all"></div>

            <div className="absolute bottom-6 left-6 text-white text-lg tracking-wide">
              Kids <br /> Collection →
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="relative h-70 md:h-90 cursor-pointer md:col-span-4 group overflow-hidden rounded-sm">
          <img
            src={actual_4}
            alt="Man Collection"
            className="w-full h-full object-contain grayscale brightness-75 bg-black
      transition-all duration-700 group-hover:scale-105 group-hover:brightness-90"
          />

          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all"></div>

          <div className="absolute bottom-8 left-8 text-white">
            <h2 className="text-2xl font-light tracking-wide">
              Man <br /> Collection →
            </h2>
          </div>
        </div>

      </div>

    </section>
  );
};

export default Actual;