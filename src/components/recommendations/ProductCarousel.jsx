import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ProductCard from '../ProductCard';
import { getProductKey } from '../../utils/recommendations';

import 'swiper/css';

const ProductCarousel = ({ title, products }) => {
	const previousRef = useRef(null);
	const nextRef = useRef(null);

	if (!products?.length) return null;

	return (
		<section aria-label={title}>
			<div className='mb-4 flex items-center justify-between gap-3'>
				<h2 className='text-2xl font-bold text-gray-800'>{title}</h2>

				<div className='flex items-center gap-2'>
					<button
						type='button'
						ref={previousRef}
						aria-label={`Previous ${title}`}
						className='flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-800'>
						<FaChevronLeft className='text-xs' />
					</button>
					<button
						type='button'
						ref={nextRef}
						aria-label={`Next ${title}`}
						className='flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-800 transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-800'>
						<FaChevronRight className='text-xs' />
					</button>
				</div>
			</div>

			<Swiper
				modules={[Navigation]}
				navigation={{
					prevEl: previousRef.current,
					nextEl: nextRef.current,
				}}
				onBeforeInit={(swiper) => {
					swiper.params.navigation.prevEl = previousRef.current;
					swiper.params.navigation.nextEl = nextRef.current;
				}}
				spaceBetween={16}
				watchOverflow
				simulateTouch
				breakpoints={{
					0: { slidesPerView: 1.15 },
					640: { slidesPerView: 2 },
					1024: { slidesPerView: 4 },
				}}>
				{products.map((product) => (
					<SwiperSlide
						key={getProductKey(product)}
						className='h-auto'>
						<ProductCard product={product} />
					</SwiperSlide>
				))}
			</Swiper>
		</section>
	);
};

export default ProductCarousel;
