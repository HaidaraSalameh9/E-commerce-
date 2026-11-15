import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { FaBoxOpen, FaChevronLeft, FaChevronRight, FaExclamationTriangle } from 'react-icons/fa';
import ProductCard from './ProductCard';
import useInView from '../hooks/useInView';
import { getProductKey } from '../utils/catalogSelectors';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

/* -------------------------------------------------------------------------- */
/*  Date formatting — every date shown comes from a product's real createdAt  */
/* -------------------------------------------------------------------------- */

const formatDay = (ms, withYear) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(ms);

const currentYear = () => new Date().getFullYear();

// "Added 28 Oct" — the year appears only when it isn't this year
const formatAdded = (ms) => `Added ${formatDay(ms, new Date(ms).getFullYear() !== currentYear())}`;

// "3 Oct – 28 Oct", or a single date when everything was added on the same day
const formatRange = (items) => {
	const times = items.map((item) => item.createdAt);
	const min = Math.min(...times);
	const max = Math.max(...times);

	if (new Date(min).toDateString() === new Date(max).toDateString()) {
		return formatDay(max, new Date(max).getFullYear() !== currentYear());
	}

	const crossesYears = new Date(min).getFullYear() !== new Date(max).getFullYear();
	const showEndYear = new Date(max).getFullYear() !== currentYear();

	return `${formatDay(min, crossesYears)} – ${formatDay(max, showEndYear || crossesYears)}`;
};

/* -------------------------------------------------------------------------- */
/*  Shared styles                                                             */
/* -------------------------------------------------------------------------- */

const CTA =
	'inline-block rounded-full bg-stone-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stone-900/20 transition duration-300 hover:bg-brass-400 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-500 active:scale-95';

// Responsive settings for the mobile-only New Arrivals carousel.
const SWIPER_BREAKPOINTS = {
	480: { slidesPerView: 1.2, spaceBetween: 14 },
	560: { slidesPerView: 1.3, spaceBetween: 16 },
	620: { slidesPerView: 1.4, spaceBetween: 18 },
};

// Same breakpoint as Tailwind's `sm:`. Used so only ONE product layout is mounted
// (the Swiper below 640px, the staggered grid from 640px up) instead of rendering
// every ProductCard twice and hiding one copy with CSS.
const TABLET_UP_QUERY = '(min-width: 640px)';

const useTabletUp = () => {
	const [matches, setMatches] = useState(() => (typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia(TABLET_UP_QUERY).matches));

	useEffect(() => {
		if (!window.matchMedia) return undefined;
		const query = window.matchMedia(TABLET_UP_QUERY);
		const onChange = (event) => setMatches(event.matches);

		setMatches(query.matches);

		// Safari < 14 only supports addListener/removeListener
		if (query.addEventListener) {
			query.addEventListener('change', onChange);
			return () => query.removeEventListener('change', onChange);
		}
		query.addListener(onChange);
		return () => query.removeListener(onChange);
	}, []);

	return matches;
};

/* -------------------------------------------------------------------------- */
/*  States                                                                    */
/* -------------------------------------------------------------------------- */

const SkeletonCard = () => (
	<div className='rounded-[28px] border border-stone-200 bg-white p-2 shadow-card'>
		<div className='aspect-[5/4] animate-pulse rounded-[20px] bg-stone-200' />
		<div className='space-y-3 p-4 sm:p-5'>
			<div className='h-3 w-1/2 animate-pulse rounded-full bg-stone-100' />
			<div className='h-4 w-4/5 animate-pulse rounded-full bg-stone-200' />
			<div className='h-7 w-1/3 animate-pulse rounded-full bg-stone-200' />
			<div className='h-11 w-full animate-pulse rounded-full bg-stone-200' />
		</div>
	</div>
);

const LoadingState = () => (
	<div
		role='status'
		aria-live='polite'
		className='grid gap-6 pb-20 sm:grid-cols-2'>
		<span className='sr-only'>Loading new arrivals...</span>
		{[0, 1, 2, 3].map((i) => (
			<div
				key={i}
				className={`${i > 0 ? 'hidden sm:block' : ''} sm:even:translate-y-14`}>
				<SkeletonCard />
			</div>
		))}
	</div>
);

const MessageCard = ({ icon: Icon, tone, border, children }) => (
	<div className={`flex min-h-[26rem] flex-col items-center justify-center gap-5 rounded-card border bg-white px-6 py-14 text-center shadow-card ${border}`}>
		<span className={`flex h-14 w-14 items-center justify-center rounded-full text-xl ring-8 ${tone}`}>
			<Icon aria-hidden='true' />
		</span>
		{children}
	</div>
);

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/*                                                                            */
/*  items   – [{ product, createdAt }] already selected & sorted by Home       */
/*            (Firebase products only, valid dates, newest first, max 6)      */
/* -------------------------------------------------------------------------- */

const NewArrivals = ({ items = [], loading, error, onRetry }) => {
	const [ref, inView] = useInView();
	const swiperRef = useRef(null);
	const [canGoPrev, setCanGoPrev] = useState(false);
	const [canGoNext, setCanGoNext] = useState(false);
	const [locked, setLocked] = useState(false);
	const isTabletUp = useTabletUp();

	// Keep navigation controls synchronized with Swiper state.
	const syncNav = useCallback((swiper) => {
		if (!swiper || swiper.destroyed) return;
		setCanGoPrev(!swiper.isBeginning);
		setCanGoNext(!swiper.isEnd);
		setLocked(Boolean(swiper.isLocked)); // everything already fits -> nothing to swipe
	}, []);

	// A keyboard user tabbing into an off-screen card would make the browser scroll the
	// clipped wrapper natively and leave Swiper out of sync. Undo that scroll and let
	// Swiper bring the focused slide into view instead. Pointer/touch focus is ignored,
	// so tapping a button on the peeking card never makes the carousel jump.
	const handleFocusCapture = useCallback((event) => {
		const swiper = swiperRef.current;
		if (!swiper || swiper.destroyed) return;

		event.currentTarget.scrollLeft = 0;
		if (swiper.el) swiper.el.scrollLeft = 0;

		let keyboardFocus = false;
		try {
			keyboardFocus = Boolean(event.target?.matches?.(':focus-visible'));
		} catch {
			/* :focus-visible unsupported */
		}

		const slide = event.target?.closest?.('.swiper-slide');
		if (!keyboardFocus || !slide) return;

		const index = Array.prototype.indexOf.call(swiper.slides, slide);
		if (index >= 0 && index !== swiper.activeIndex) swiper.slideTo(index);
	}, []);

	const handleSwiper = useCallback(
		(swiper) => {
			swiperRef.current = swiper;
			syncNav(swiper);
		},
		[syncNav],
	);

	const handlePrev = () => {
		if (swiperRef.current && !swiperRef.current.destroyed) {
			swiperRef.current.slidePrev();
		}
	};

	const handleNext = () => {
		if (swiperRef.current && !swiperRef.current.destroyed) {
			swiperRef.current.slideNext();
		}
	};

	// Always show the six newest products, even if the parent passes more.
	const latestItems = [...items].sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).slice(0, 6);

	const count = latestItems.length;
	const ready = !loading && !error && count > 0;

	return (
		<section
			aria-labelledby='new-arrivals-title'
			className='bg-paper pb-20 text-charcoal sm:pb-28'>
			<div className='mx-auto max-w-6xl px-4 sm:px-6'>
				{/* grid-cols-[minmax(0,1fr)]: an explicit shrinkable track below lg, so wide content can never stretch the page */}
				<div className='grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14'>
					{/* ------------------------- intro (sticky on desktop) ------------------------- */}
					<div className='lg:sticky lg:top-28 lg:self-start'>
						<h2
							id='new-arrivals-title'
							className='font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl'>
							New
							<br />
							arrivals
						</h2>

						{ready && (
							<>
								{/* the real count, drawn as a huge outline */}
								<p
									aria-hidden='true'
									className='mt-8 select-none font-display text-[clamp(6rem,16vw,11rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(28,25,23,.2)]'>
									{String(count).padStart(2, '0')}
								</p>

								<div className='mt-4 flex items-start gap-3'>
									<span
										aria-hidden='true'
										className='mt-2.5 h-0.5 w-8 shrink-0 rounded-full bg-brass-500'
									/>
									<p className='text-sm leading-relaxed text-stone-500'>
										{count} new {count === 1 ? 'product' : 'products'}
										<br />
										Added {formatRange(latestItems)}
									</p>
								</div>
							</>
						)}

						<div className='mt-8'>
							<Link
								to='/products'
								className={CTA}>
								Explore all products
							</Link>
						</div>
					</div>

					{/* ----------------------------- products / states ----------------------------- */}
					<div
						ref={ref}
						className='min-w-0'>
						{loading ? (
							<LoadingState />
						) : error ? (
							<MessageCard
								icon={FaExclamationTriangle}
								tone='bg-rose-50 text-rose-500 ring-rose-50/60'
								border='border-rose-200'>
								<div
									role='alert'
									className='space-y-1'>
									<h3 className='font-display text-2xl font-bold text-stone-900'>New arrivals couldn’t be loaded</h3>
									<p className='text-stone-500'>Something went wrong while loading products. Please try again.</p>
								</div>
								<button
									type='button'
									onClick={onRetry}
									className={CTA}>
									Retry
								</button>
							</MessageCard>
						) : count === 0 ? (
							<MessageCard
								icon={FaBoxOpen}
								tone='bg-stone-100 text-stone-400 ring-stone-50'
								border='border-stone-200'>
								<div className='space-y-1'>
									<h3 className='font-display text-2xl font-bold text-stone-900'>No new arrivals right now</h3>
									<p className='text-stone-500'>New products will appear here as they are added.</p>
								</div>
								<Link
									to='/products'
									className={CTA}>
									Browse all products
								</Link>
							</MessageCard>
						) : (
							<>
								{/* Mobile (below 640px): manual Swiper. Mounted only here, so ProductCards are never rendered twice. */}
								{!isTabletUp && (
									<div
										onFocusCapture={handleFocusCapture}
										className='w-full min-w-0 overflow-hidden pt-3 sm:hidden'>
										{/* Hidden when every card already fits: nothing to swipe. 44px buttons = comfortable touch targets. */}
										{!locked && (
											<div className='mb-3 flex items-center justify-between'>
												<p className='text-xs font-medium tracking-wide text-stone-500'>Swipe to explore</p>
												<div className='flex items-center gap-2'>
													<button
														type='button'
														onClick={handlePrev}
														disabled={!canGoPrev}
														aria-label='Previous new arrivals'
														className='flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-stone-900 hover:bg-stone-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-stone-200 disabled:hover:bg-white disabled:hover:text-stone-700'>
														<FaChevronLeft
															size={14}
															aria-hidden='true'
														/>
													</button>
													<button
														type='button'
														onClick={handleNext}
														disabled={!canGoNext}
														aria-label='Next new arrivals'
														className='flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-stone-900 hover:bg-stone-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-stone-200 disabled:hover:bg-white disabled:hover:text-stone-700'>
														<FaChevronRight
															size={14}
															aria-hidden='true'
														/>
													</button>
												</div>
											</div>
										)}
										{/* !pb-10: room for the card shadow, which the clipping wrapper would otherwise cut off in a hard line */}
										<Swiper
											className='!w-full !max-w-full !overflow-visible !pb-10'
											slidesPerView={1.2}
											spaceBetween={12}
											breakpoints={SWIPER_BREAKPOINTS}
											speed={450}
											loop={false}
											autoplay={false}
											watchOverflow
											watchSlidesProgress
											grabCursor
											threshold={5}
											onSwiper={handleSwiper}
											onSlideChange={syncNav}
											onProgress={syncNav}
											onResize={syncNav}
											onBreakpoint={syncNav}
											onUpdate={syncNav}
											onSlidesLengthChange={syncNav}
											onLock={syncNav}
											onUnlock={syncNav}>
											{latestItems.map(({ product, createdAt }, index) => (
												<SwiperSlide
													key={getProductKey(product, 'custom')}
													className='!h-auto'>
													<div
														className={`transition-[clip-path,opacity] duration-1000 ease-soft ${inView ? 'opacity-100 [clip-path:inset(-3rem)]' : 'opacity-0 [clip-path:inset(100%_0_0_0)]'}`}
														style={{ transitionDelay: inView ? `${index * 110}ms` : '0ms' }}>
														<p className='mb-3 flex items-center gap-3 text-xs font-medium text-stone-500'>
															<span
																aria-hidden='true'
																className='h-px w-6 bg-brass-500'
															/>
															{formatAdded(createdAt)}
														</p>
														<ProductCard product={product} />
													</div>
												</SwiperSlide>
											))}
										</Swiper>
									</div>
								)}

								{/* Tablet and desktop (640px and up): the existing staggered grid, unchanged */}
								{isTabletUp && (
									<ul className='hidden gap-x-5 gap-y-8 pb-20 pt-0 sm:grid sm:grid-cols-2 lg:gap-x-7 lg:gap-y-10'>
										{latestItems.map(({ product, createdAt }, index) => (
											<li
												key={getProductKey(product, 'custom')}
												className='min-w-0 sm:even:translate-y-10 lg:even:translate-y-14'>
												{/* one-time wipe reveal; the delay lives here so it never slows card hovers */}
												<div
													className={`transition-[clip-path,opacity] duration-1000 ease-soft ${inView ? 'opacity-100 [clip-path:inset(-3rem)]' : 'opacity-0 [clip-path:inset(100%_0_0_0)]'}`}
													style={{ transitionDelay: inView ? `${index * 110}ms` : '0ms' }}>
													<p className='mb-3 flex items-center gap-3 text-xs font-medium text-stone-500'>
														<span
															aria-hidden='true'
															className='h-px w-6 bg-brass-500'
														/>
														{formatAdded(createdAt)}
													</p>
													<ProductCard product={product} />
												</div>
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</section>
	);
};

export default memo(NewArrivals);
