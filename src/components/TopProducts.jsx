import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategoryProducts } from '../app/features/categoryProductSlice';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import { FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

const EMPTY_ARRAY = [];
const MIN_RATING = 2.5;

const categories = [
	{ key: 'groceries', label: 'Groceries' },
	{ key: 'furniture', label: 'Furniture' },
	{ key: 'fragrances', label: 'Fragrances' },
	{ key: 'beauty', label: 'Beauty' },
];

/* -------------------------------------------------------------------------- */
/*  Carousel helpers                                                          */
/*                                                                            */
/*  Swiper's loop mode needs more slides than it shows at once, otherwise it  */
/*  warns and misbehaves. Some categories only have ~5 products, so below     */
/*  LOOP_MIN the list is repeated (the repeats are hidden from assistive tech */
/*  and made inert). Fewer than 3 products → no loop, no marquee.             */
/* -------------------------------------------------------------------------- */

const LOOP_MIN = 8;

const buildSlides = (items) => {
	if (items.length < 3) return items.map((product) => ({ product, key: String(product.id), copy: 0 }));

	const copies = Math.ceil(LOOP_MIN / items.length);
	return Array.from({ length: copies }).flatMap((_, copy) => items.map((product) => ({ product, key: `${product.id}-${copy}`, copy })));
};

const BREAKPOINTS = {
	0: { slidesPerView: 1.15 },
	640: { slidesPerView: 1.8 },
	768: { slidesPerView: 2.2 },
	1024: { slidesPerView: 2.8 },
	1280: { slidesPerView: 3.4 },
};

const ARROW_BTN =
	'flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-lg text-white/80 ring-1 ring-white/15 transition duration-300 hover:bg-brass-400 hover:text-ink hover:ring-brass-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 active:scale-95';

const BTN_PRIMARY =
	'rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-8 py-3 text-sm font-bold text-ink shadow-lg shadow-brass-500/25 transition duration-300 hover:from-brass-200 hover:to-brass-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95';

/* -------------------------------------------------------------------------- */
/*  States                                                                    */
/* -------------------------------------------------------------------------- */

// Mirrors the ProductCard structure so nothing jumps when real cards arrive
const SkeletonCard = ({ className = '' }) => (
	<div className={`rounded-[28px] bg-white/[.06] p-2 ring-1 ring-white/10 ${className}`}>
		<div className='aspect-[5/4] animate-pulse rounded-[20px] bg-white/10' />
		<div className='space-y-3 p-4 sm:p-5'>
			<div className='h-3 w-1/2 animate-pulse rounded-full bg-white/10' />
			<div className='h-4 w-4/5 animate-pulse rounded-full bg-white/10' />
			<div className='h-7 w-1/3 animate-pulse rounded-full bg-white/10' />
			<div className='h-11 w-full animate-pulse rounded-full bg-white/10' />
		</div>
	</div>
);

const LoadingState = () => (
	<div
		role='status'
		aria-live='polite'
		className='grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-3'>
		<span className='sr-only'>Loading products...</span>
		<SkeletonCard />
		<SkeletonCard className='hidden sm:block' />
		<SkeletonCard className='hidden lg:block' />
	</div>
);

const MessageState = ({ icon: Icon, tone, children }) => (
	<div className='flex min-h-[20rem] flex-col items-center justify-center gap-5 rounded-3xl bg-white/[.04] px-6 py-12 text-center ring-1 ring-white/10'>
		<span className={`flex h-14 w-14 items-center justify-center rounded-full text-xl ring-8 ${tone}`}>
			<Icon aria-hidden='true' />
		</span>
		{children}
	</div>
);

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

const TopProducts = () => {
	const dispatch = useDispatch();

	const { productsByCategory, loadingByCategory, errorByCategory } = useSelector((state) => state.categoryProducts);

	const [selected, setSelected] = useState('groceries');

	const products = productsByCategory[selected] || EMPTY_ARRAY;
	const loading = loadingByCategory[selected];
	const error = errorByCategory[selected];

	useEffect(() => {
		if (!productsByCategory[selected]) {
			dispatch(fetchCategoryProducts(selected));
		}
	}, [dispatch, selected, productsByCategory]);

	const filteredProducts = useMemo(() => {
		return products.filter((p) => p.rating > MIN_RATING);
	}, [products]);

	const swiperRef = useRef(null);
	const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

	const slides = useMemo(() => buildSlides(filteredProducts), [filteredProducts]);

	const activeIndex = categories.findIndex((cat) => cat.key === selected);
	const activeLabel = categories[activeIndex]?.label;

	const showError = error && !loading;
	// also "loading" before the first request has started, so the empty message never flashes
	const isLoading = loading || (!productsByCategory[selected] && !error);
	const showCarousel = !isLoading && !showError && filteredProducts.length > 0;

	// continuous marquee only when there are enough products and motion is welcome
	const loop = filteredProducts.length >= 3;
	const marquee = loop && !reduceMotion;

	return (
		<section
			aria-labelledby='top-products-title'
			className='bg-paper pb-20 text-charcoal sm:pb-28'>
			<div className='mx-auto max-w-6xl px-4 sm:px-6'>
				<div className='relative overflow-hidden rounded-card bg-gradient-to-b from-graphite to-ink px-5 pb-8 pt-10 ring-1 ring-white/10 sm:px-10 sm:pb-12 sm:pt-14 lg:px-14'>
					{/* same atmosphere as the Footer, Hero and Navbar */}
					<div
						className='pointer-events-none absolute inset-0'
						style={{ background: 'radial-gradient(50% 60% at 0% 0%, rgba(251,191,36,.16), transparent 60%), radial-gradient(40% 50% at 100% 100%, rgba(120,113,108,.2), transparent 60%)' }}
					/>
					<div
						className='pointer-events-none absolute inset-0 opacity-[.05]'
						style={{
							backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
							backgroundSize: '44px 44px',
							WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
							maskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
						}}
					/>
					<span
						aria-hidden='true'
						className='pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-brass-300/60 to-transparent'
					/>

					<div className='relative'>
						{/* Heading + category rail */}
						<div className='flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between'>
							<h2
								id='top-products-title'
								className='font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl'>
								Product
								<br />
								<span className='font-medium text-stone-400'>of the week</span>
							</h2>

							<div
								role='radiogroup'
								aria-label='Product category'
								className='relative grid w-full grid-cols-4 rounded-full bg-white/5 p-1.5 ring-1 ring-white/10 sm:w-auto sm:min-w-[28rem]'>
								{/* the brass pill slides to the active category */}
								<span
									aria-hidden='true'
									className='absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/4)] rounded-full bg-gradient-to-r from-brass-300 to-brass-500 shadow-lg shadow-brass-500/25 transition-transform duration-500 ease-soft'
									style={{ transform: `translateX(${activeIndex * 100}%)` }}
								/>

								{categories.map((cat) => (
									<label
										key={cat.key}
										className='relative z-10 cursor-pointer'>
										<input
											type='radio'
											name='top-products-category'
											value={cat.key}
											className='peer sr-only'
											checked={selected === cat.key}
											onChange={() => setSelected(cat.key)}
										/>
										<span
											className={`block rounded-full px-1 py-3 text-center text-[13px] transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white sm:px-5 sm:text-sm ${selected === cat.key ? 'font-bold text-ink' : 'font-medium text-stone-300 hover:text-white'}`}>
											{cat.label}
										</span>
									</label>
								))}
							</div>
						</div>

						{/* Count + arrows */}
						<div className='mt-10 flex min-h-11 items-center justify-between gap-4'>
							<p
								aria-live='polite'
								className='text-sm text-stone-400'>
								{showCarousel ? `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'} in ${activeLabel}` : '\u00a0'}
							</p>

							{showCarousel && (
								<div className='hidden items-center gap-2 sm:flex'>
									<button
										type='button'
										aria-label='Previous products'
										onClick={() => swiperRef.current?.slidePrev(500)}
										className={ARROW_BTN}>
										<LuChevronLeft />
									</button>
									<button
										type='button'
										aria-label='Next products'
										onClick={() => swiperRef.current?.slideNext(500)}
										className={ARROW_BTN}>
										<LuChevronRight />
									</button>
								</div>
							)}
						</div>

						{/* Products / states */}
						<div className='mt-2'>
							{isLoading ? (
								<LoadingState />
							) : showError ? (
								<MessageState
									icon={FaExclamationTriangle}
									tone='bg-rose-500/10 text-rose-400 ring-rose-500/10'>
									<div role='alert'>
										<h3 className='text-xl font-bold text-rose-400'>
											Something went wrong <span className='text-white'>{error}</span>
										</h3>
									</div>
									<button
										type='button'
										onClick={() => dispatch(fetchCategoryProducts(selected))}
										className={BTN_PRIMARY}>
										Retry
									</button>
								</MessageState>
							) : filteredProducts.length === 0 ? (
								<MessageState
									icon={FaBoxOpen}
									tone='bg-white/5 text-stone-400 ring-white/5'>
									<p className='text-stone-300'>No products found in this category</p>
								</MessageState>
							) : (
								<div
									className={marquee ? '[mask-image:linear-gradient(to_right,transparent,#000_4%,#000_96%,transparent)]' : undefined}
									onFocus={marquee ? () => swiperRef.current?.autoplay?.pause() : undefined}
									onBlur={marquee ? () => swiperRef.current?.autoplay?.resume() : undefined}>
									<Swiper
										key={selected}
										modules={[Autoplay]}
										onSwiper={(swiper) => {
											swiperRef.current = swiper;
										}}
										loop={loop}
										speed={marquee ? 5000 : 600}
										spaceBetween={20}
										grabCursor
										centerInsufficientSlides
										autoplay={marquee ? { delay: 0, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
										breakpoints={BREAKPOINTS}
										className='pb-10 pt-4'
										// scoped to this carousel (Swiper's own CSS variable) — no global rule needed
										style={marquee ? { '--swiper-wrapper-transition-timing-function': 'linear' } : undefined}>
										{slides.map(({ product, key, copy }) => (
											<SwiperSlide
												key={key}
												className='h-auto!'
												aria-hidden={copy > 0 || undefined}
												inert={copy > 0}>
												<ProductCard product={product} />
											</SwiperSlide>
										))}
									</Swiper>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default TopProducts;
