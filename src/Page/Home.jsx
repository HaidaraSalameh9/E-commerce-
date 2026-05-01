import React, { useRef } from 'react';
import Hero from '../components/Hero';
import Actual from '../components/Actual';
import TrustedBrand from '../components/TrustedBrand';
import TopProducts from '../components/TopProducts';


import { Swiper, SwiperSlide } from 'swiper/react';

const Home = () => {

    return (
        <>
            <Hero />
            <Actual />
            <TrustedBrand />
            <TopProducts />

        </>
    );
};

export default Home;
