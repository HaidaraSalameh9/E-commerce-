import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import { LuArrowDown, LuArrowRight, LuChevronLeft, LuChevronRight, LuRefreshCw, LuSparkles } from 'react-icons/lu';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

import { fetchProductCategories, fetchProductsByCategory } from '../app/features/allProductSlice';
import { getCustomProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const OTHER_SLUG = 'other-products';

/**
 * "Women's Dresses", "womens_dresses", " WOMENS-dresses " -> "womens-dresses".
 * Used on BOTH sides (DummyJSON slugs and Firebase categories) so they match.
 */
const normalizeCategory = (category = '') =>
	String(category ?? '')
		.trim()
		.toLowerCase()
		.replace(/['’`]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const formatCategoryName = (category = '') =>
	String(category)
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

// A Firebase product's category may be a string or (defensively) an object.
const readCategory = (product) => {
	const value = product?.category;
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object') return value.slug || value.name || '';
	return '';
};

// DummyJSON returns { slug, name, url }; tolerate plain strings as well.
const toCategory = (category) => {
	if (typeof category === 'string') {
		const slug = normalizeCategory(category);
		return slug ? { slug, rawSlug: category, name: formatCategoryName(slug) } : null;
	}
	const rawSlug = category?.slug || category?.name || '';
	const slug = normalizeCategory(rawSlug);
	return slug ? { slug, rawSlug, name: category?.name || formatCategoryName(slug) } : null;
};

// Adds `source` only when missing, and caches the result per original object so
// rebuilding sections never hands ProductCard a brand-new object for the same product.
const sourceCache = new WeakMap();
const withSource = (product, fallback) => {
	if (product.source) return product;
	let tagged = sourceCache.get(product);
	if (!tagged) {
		tagged = { ...product, source: fallback };
		sourceCache.set(product, tagged);
	}
	return tagged;
};

const getProductKey = (product, index) => `${product?.source || 'item'}-${product?.id ?? product?._id ?? product?.productId ?? `i${index}`}`;

const scrollToId = (id) => {
	const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
	if (!el) return;
	const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
};

// One shared in-flight request, so React StrictMode / re-mounts never fire the
// Firebase call twice at the same time.
let customRequest = null;
const requestCustomProducts = () => {
	if (!customRequest) {
		customRequest = Promise.resolve(getCustomProducts()).finally(() => {
			customRequest = null;
		});
	}
	return customRequest;
};

/**
 * Pure merge of the two sources into display sections.
 * - DummyJSON categories keep API order; matching Firebase products are appended.
 * - Firebase-only categories get their own section; uncategorised -> "Other Products".
 * - Every product keeps all of its original properties (only `source` is added when missing).
 */
const buildSections = ({ categories, productsByCategory, loadingByCategory, errorByCategory, customProducts }) => {
	const customGroups = new Map();

	customProducts.forEach((product) => {
		if (!product) return;
		const slug = normalizeCategory(readCategory(product)) || OTHER_SLUG;
		if (!customGroups.has(slug)) customGroups.set(slug, []);
		customGroups.get(slug).push(withSource(product, 'firebase'));
	});

	const seen = new Set();
	const sections = [];

	categories.forEach((raw) => {
		const category = toCategory(raw);
		if (!category || seen.has(category.slug)) return;
		seen.add(category.slug);

		// Redux is keyed by the slug exactly as the API returned it.
		const key = category.rawSlug;
		const apiProducts = productsByCategory[key] ?? productsByCategory[category.slug];
		const loaded = apiProducts !== undefined;
		// A stale error never overrides data that did load.
		const error = Boolean(errorByCategory[key] ?? errorByCategory[category.slug]) && !loaded;
		const loading = Boolean(loadingByCategory[key] ?? loadingByCategory[category.slug]) || (!loaded && !error);

		sections.push({
			slug: category.slug,
			fetchKey: key,
			name: category.name,
			loading,
			error,
			products: [...(apiProducts || EMPTY_ARRAY).filter(Boolean).map((product) => withSource(product, 'dummyjson')), ...(customGroups.get(category.slug) || EMPTY_ARRAY)],
		});
		customGroups.delete(category.slug);
	});

	// Firebase-only categories (Other Products always last)
	const extra = [...customGroups.entries()].sort(([a], [b]) => (a === OTHER_SLUG) - (b === OTHER_SLUG));
	extra.forEach(([slug, products]) => {
		sections.push({
			slug,
			fetchKey: null,
			name: slug === OTHER_SLUG ? 'Other Products' : formatCategoryName(slug),
			loading: false,
			error: false,
			products,
		});
	});

	return sections;
};

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.ap-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes ap-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes ap-shimmer { from { background-position: -240% 0; } to { background-position: 240% 0; } }
@keyframes ap-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes ap-spin { to { transform: rotate(360deg); } }

.ap-reveal { animation: ap-rise .8s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 110ms + 80ms); }
.ap-float { animation: ap-float 7s ease-in-out infinite; }
.ap-spin { animation: ap-spin .9s linear infinite; }
.ap-shimmer {
	background-color: #e7e5e4;
	background-image: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.75) 50%, transparent 80%);
	background-size: 60% 100%;
	background-repeat: no-repeat;
	animation: ap-shimmer 1.8s ease-in-out infinite;
}
.ap-shimmer-dark { background-color: rgba(255,255,255,.1); background-image: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.18) 50%, transparent 80%); }

.ap-noscrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.ap-noscrollbar::-webkit-scrollbar { display: none; }

/* Room for card shadows / hover lift inside the (clipping) swiper */
.ap-swiper.swiper { padding: 10px 4px 22px; margin: -10px -4px -22px; }

.ap-btn { position: relative; overflow: hidden; isolation: isolate; transition: color .3s ease, transform .15s ease; }
.ap-btn::before {
	content: ''; position: absolute; inset: 0; z-index: -1;
	background: linear-gradient(90deg, #fcd34d, #f59e0b);
	transform: translateX(-101%);
	transition: transform .45s cubic-bezier(.2,.8,.2,1);
}
.ap-btn:hover, .ap-btn:focus-visible { color: #1c1917; }
.ap-btn:hover::before, .ap-btn:focus-visible::before { transform: none; }

.ap-chip { transition: background-color .25s ease, color .25s ease, border-color .25s ease, transform .2s ease; }
.ap-chip:hover { transform: translateY(-1px); }

@media (prefers-reduced-motion: reduce) {
	.ap-reveal, .ap-float, .ap-shimmer { animation: none; }
	.ap-spin { animation-duration: 2.4s; }
	.ap-btn, .ap-btn::before, .ap-chip { transition: none; }
	.ap-chip:hover { transform: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

const HeroStat = ({ icon: Icon, value, label, pending }) => (
	<div className='rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5'>
		<Icon
			className='mb-3 text-xl text-amber-300 sm:mb-5 sm:text-2xl'
			aria-hidden='true'
		/>
		{pending ? <div className='ap-shimmer ap-shimmer-dark h-8 w-16 rounded-lg sm:h-9' /> : <p className='ap-display text-3xl font-bold tracking-tight text-white sm:text-4xl'>{value}</p>}
		<p className='mt-1 text-xs text-stone-400'>{label}</p>
	</div>
);

const CatalogHero = ({ productCount, categoryCount, syncing, onExplore }) => (
	<header className='relative isolate overflow-hidden bg-stone-950 text-white'>
		<div
			className='pointer-events-none absolute inset-0'
			style={{ background: 'radial-gradient(60% 90% at 90% 0%, rgba(251,191,36,.24), transparent 60%), radial-gradient(45% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
		/>
		<div
			className='pointer-events-none absolute inset-0 opacity-[.06]'
			style={{
				backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
				backgroundSize: '44px 44px',
				WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent)',
				maskImage: 'linear-gradient(to bottom, #000, transparent)',
			}}
		/>
		<span
			aria-hidden='true'
			className='ap-float pointer-events-none absolute -right-20 top-24 hidden h-72 w-72 rounded-full border border-amber-400/20 lg:block'
		/>
		<span
			aria-hidden='true'
			className='ap-float pointer-events-none absolute -right-6 top-40 hidden h-44 w-44 rounded-full border border-amber-400/10 lg:block'
			style={{ animationDelay: '-3s' }}
		/>

		<div className='relative mx-auto max-w-[1440px] px-4 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-16 lg:px-12 lg:pb-32 lg:pt-20'>
			<div className='grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14'>
				<div className='min-w-0'>
					<div
						className='ap-reveal inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 ring-1 ring-white/15'
						style={{ '--i': 0 }}>
						<LuSparkles
							className='text-amber-300'
							size={15}
							aria-hidden='true'
						/>
						<span className='text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-300'>The Al-Haidara Collection</span>
					</div>

					<h1
						className='ap-reveal ap-display mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl'
						style={{ '--i': 1 }}>
						Discover
						<span className='block bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent'>what’s next.</span>
					</h1>

					<p
						className='ap-reveal mt-5 max-w-xl text-base leading-7 text-stone-300 sm:text-lg sm:leading-8'
						style={{ '--i': 2 }}>
						A curated collection of technology, essentials and everyday discoveries — organised into collections so you can find exactly what moves your world forward.
					</p>

					<div
						className='ap-reveal mt-8 flex flex-wrap items-center gap-x-6 gap-y-4'
						style={{ '--i': 3 }}>
						<a
							href='#catalog'
							onClick={onExplore}
							className='ap-btn inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-stone-950 shadow-lg shadow-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:scale-[.98]'>
							Explore products
							<LuArrowDown
								size={16}
								aria-hidden='true'
							/>
						</a>
						<Link
							to='/'
							className='group inline-flex items-center gap-2 text-sm font-medium text-stone-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400'>
							Back to home
							<LuArrowRight
								size={16}
								aria-hidden='true'
								className='transition-transform group-hover:translate-x-1'
							/>
						</Link>
					</div>
				</div>

				{/* Live statistics — real numbers from the merged catalogue */}
				<section
					aria-label='Catalogue statistics'
					className='ap-reveal relative overflow-hidden rounded-[28px] p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)] ring-1 ring-white/10 sm:p-7'
					style={{ '--i': 4, background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)' }}>
					<div
						className='pointer-events-none absolute inset-0 opacity-70'
						style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
					/>
					<div
						className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full'
						style={{ background: 'radial-gradient(circle, rgba(251,191,36,.28), transparent 70%)' }}
					/>
					<div className='relative'>
						<div className='flex items-center justify-between gap-3'>
							<h2 className='ap-display text-lg font-bold'>Your marketplace</h2>
							<span
								className='inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-stone-200'
								role='status'>
								<span className='relative flex h-2 w-2'>
									<span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${syncing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
									<span className={`relative inline-flex h-2 w-2 rounded-full ${syncing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
								</span>
								{syncing ? 'Updating' : 'Live'}
							</span>
						</div>

						<div className='mt-5 grid grid-cols-2 gap-3 sm:gap-4'>
							<HeroStat
								icon={FaBoxOpen}
								value={productCount}
								label={productCount === 1 ? 'Available product' : 'Available products'}
								pending={syncing && productCount === 0}
							/>
							<HeroStat
								icon={LuSparkles}
								value={categoryCount}
								label={categoryCount === 1 ? 'Product category' : 'Product categories'}
								pending={syncing && categoryCount === 0}
							/>
						</div>

						<div className='mt-5 border-t border-dashed border-white/20 pt-4'>
							<p className='text-sm font-semibold text-amber-300'>One destination. More possibilities.</p>
							<p className='mt-1 text-xs leading-6 text-stone-400'>Curated collections and exclusive store inventory, together in one place.</p>
						</div>
					</div>
				</section>
			</div>
		</div>

		<div className='h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent' />
	</header>
);

/* ------------------------------ Skeletons ---------------------------------- */

const SLIDE_WIDTH = 'w-[85%] shrink-0 sm:w-[45%] md:w-[38%] lg:w-[30%] xl:w-[23.5%]';

const ProductSkeleton = ({ count = 4 }) => (
	<div
		className='flex gap-3 overflow-hidden sm:gap-4 xl:gap-[22px]'
		aria-hidden='true'>
		{Array.from({ length: count }).map((_, index) => (
			<div
				key={index}
				className={`${SLIDE_WIDTH} overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_18px_40px_-30px_rgba(28,25,23,.35)]`}>
				<div className='ap-shimmer aspect-square rounded-none' />
				<div className='space-y-3 p-4'>
					<div className='ap-shimmer h-3 w-2/3 rounded-full' />
					<div className='ap-shimmer h-4 w-full rounded-full' />
					<div className='ap-shimmer h-4 w-1/2 rounded-full' />
				</div>
			</div>
		))}
	</div>
);

const CategorySkeleton = ({ label }) => (
	<section
		role='status'
		aria-busy='true'
		aria-label={label ? `Loading ${label}` : 'Loading category'}
		className='py-8 sm:py-10'>
		<div className='mb-6 flex items-end justify-between gap-4'>
			<div className='space-y-3'>
				<div className='ap-shimmer h-3 w-24 rounded-full' />
				{label ? <h2 className='ap-display text-2xl font-bold tracking-tight text-stone-300 sm:text-3xl'>{label}</h2> : <div className='ap-shimmer h-8 w-52 rounded-xl' />}
				<div className='ap-shimmer h-3 w-32 rounded-full' />
			</div>
			<div className='flex gap-2'>
				<div className='ap-shimmer h-10 w-10 rounded-full' />
				<div className='ap-shimmer h-10 w-10 rounded-full' />
			</div>
		</div>
		<ProductSkeleton />
		<span className='sr-only'>Loading products…</span>
	</section>
);

/* ------------------------------- States ------------------------------------ */

const CategoryError = ({ name, text, onRetry }) => (
	<section
		role='alert'
		className='my-8 rounded-[28px] border border-rose-200 bg-white p-6 text-center shadow-[0_24px_48px_-30px_rgba(190,18,60,.35)] sm:p-8'
		style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(244,63,94,.04) 0 10px, transparent 10px 20px)' }}>
		<span className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-lg text-rose-500 ring-8 ring-rose-50/60'>
			<FaExclamationTriangle aria-hidden='true' />
		</span>
		<h3 className='ap-display mt-4 text-lg font-bold text-stone-900'>Couldn’t load {name}</h3>
		<p className='mx-auto mt-1 max-w-md text-sm text-stone-500'>{text || 'Something went wrong while loading this collection. Your other categories are unaffected.'}</p>
		<button
			type='button'
			onClick={onRetry}
			className='ap-btn mt-5 inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[.98]'>
			<LuRefreshCw aria-hidden='true' />
			Try again
		</button>
	</section>
);

const EmptyState = () => (
	<div className='rounded-[28px] border border-stone-200 bg-white px-6 py-16 text-center shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)]'>
		<span className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-2xl text-stone-950 shadow-lg shadow-amber-500/30'>
			<FaBoxOpen aria-hidden='true' />
		</span>
		<h3 className='ap-display mt-6 text-xl font-bold text-stone-900'>No products available</h3>
		<p className='mx-auto mt-2 max-w-sm text-sm text-stone-500'>There’s nothing to show right now. New arrivals land here as soon as they’re in stock.</p>
		<Link
			to='/'
			className='ap-btn mt-6 inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'>
			Back to home
			<LuArrowRight aria-hidden='true' />
		</Link>
	</div>
);

// A non-blocking banner: never hides products that did load.
const Notice = ({ title, text, actionLabel, onAction }) => (
	<div
		role='status'
		className='mb-8 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between'>
		<div className='flex items-start gap-3'>
			<FaExclamationTriangle
				className='mt-0.5 shrink-0 text-amber-600'
				aria-hidden='true'
			/>
			<div>
				<p className='text-sm font-semibold text-amber-900'>{title}</p>
				<p className='mt-0.5 text-xs text-amber-800'>{text}</p>
			</div>
		</div>
		<button
			type='button'
			onClick={onAction}
			className='inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500'>
			<LuRefreshCw
				size={14}
				aria-hidden='true'
			/>
			{actionLabel}
		</button>
	</div>
);

/* ---------------------------- Navigation bits ------------------------------ */

const NavButton = ({ direction, label, disabled, onClick }) => {
	const Icon = direction === 'prev' ? LuChevronLeft : LuChevronRight;
	return (
		<button
			type='button'
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			className='flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800 shadow-sm transition hover:border-stone-900 hover:bg-stone-900 hover:text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-stone-300 disabled:hover:bg-white disabled:hover:text-stone-800 sm:h-11 sm:w-11'>
			<Icon
				size={20}
				aria-hidden='true'
			/>
		</button>
	);
};

// Quick-jump chips; only categories that actually have products are listed.

const CategoryNav = ({ sections }) => {
	const navRef = useRef(null);

	const scrollNav = (direction) => {
		if (!navRef.current) return;

		navRef.current.scrollBy({
			left: direction === 'next' ? 250 : -250,
			behavior: 'smooth',
		});
	};

	if (sections.length < 2) return null;

	return (
		<nav
			aria-label='Jump to a category'
			className='mb-2 flex flex-col gap-3'>
			<div className='flex justify-end gap-2'>
				<NavButton
					direction='prev'
					label='Previous categories'
					onClick={() => scrollNav('prev')}
				/>

				<NavButton
					direction='next'
					label='Next categories'
					onClick={() => scrollNav('next')}
				/>
			</div>

			<div
				ref={navRef}
				className='ap-noscrollbar flex min-w-0 gap-2 overflow-x-auto scroll-smooth pb-2'>
				{sections.map((section) => (
					<a
						key={section.slug}
						href={`#category-${section.slug}`}
						onClick={(event) => {
							event.preventDefault();
							scrollToId(`category-${section.slug}`);
						}}
						className='ap-chip shrink-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:border-stone-900 hover:bg-stone-900 hover:text-amber-300'>
						{section.name}
					</a>
				))}
			</div>
		</nav>
	);
};

/* -------------------------------------------------------------------------- */
/*  Category carousel                                                         */
/* -------------------------------------------------------------------------- */

// Module-level constant => stable identity, Swiper never sees a "new" breakpoints object.
const SWIPER_BREAKPOINTS = {
	480: { slidesPerView: 1.7, spaceBetween: 14 },
	640: { slidesPerView: 2.2, spaceBetween: 16 },
	768: { slidesPerView: 2.6, spaceBetween: 18 },
	1024: { slidesPerView: 3.3, spaceBetween: 20 },
	1280: { slidesPerView: 4, spaceBetween: 22 },
};

const INITIAL_NAV = { ready: false, atStart: true, atEnd: true, locked: false };

/**
 * One independent Swiper per category.
 *
 * Why the old buttons failed: button state was only refreshed on slide-change /
 * resize, so it went stale when slides were added later (Firebase products
 * arriving), when a breakpoint changed or when the slider locked/unlocked.
 * Here every relevant Swiper event funnels into ONE sync function that reads the
 * live instance from a ref owned by this component only.
 */
const CategoryCarousel = ({ section, onRetry }) => {
	const { slug, name, products, loading, error, fetchKey } = section;
	const swiperRef = useRef(null);
	const [nav, setNav] = useState(INITIAL_NAV);

	const syncNav = useCallback(() => {
		const swiper = swiperRef.current;
		if (!swiper || swiper.destroyed) return;
		const next = { ready: true, atStart: swiper.isBeginning, atEnd: swiper.isEnd, locked: swiper.isLocked };
		setNav((prev) => (prev.ready === next.ready && prev.atStart === next.atStart && prev.atEnd === next.atEnd && prev.locked === next.locked ? prev : next));
	}, []);

	const handleSwiper = useCallback(
		(swiper) => {
			swiperRef.current = swiper;
			syncNav();
		},
		[syncNav],
	);

	useEffect(
		() => () => {
			swiperRef.current = null;
		},
		[],
	);

	// Move by one "page" of visible cards (at least one), manually only.
	const move = useCallback((direction) => {
		const swiper = swiperRef.current;
		if (!swiper || swiper.destroyed) return;
		const step = Math.max(1, Math.floor(swiper.slidesPerViewDynamic?.() || 1));
		const last = Math.max(0, swiper.slides.length - 1);
		const target = direction === 'next' ? Math.min(swiper.activeIndex + step, last) : Math.max(swiper.activeIndex - step, 0);
		swiper.slideTo(target);
	}, []);

	const handlePrev = useCallback(() => move('prev'), [move]);
	const handleNext = useCallback(() => move('next'), [move]);

	// Keyboard users tabbing into an off-screen card would make the browser scroll
	// the clipped container natively and desync Swiper — bring the slide in properly.
	const handleFocusCapture = useCallback((event) => {
		const swiper = swiperRef.current;
		if (!swiper || swiper.destroyed) return;
		const slide = event.target?.closest?.('.swiper-slide');
		if (!slide) return;
		swiper.el.scrollLeft = 0;
		if (slide.classList.contains('swiper-slide-visible')) return;
		const index = Array.prototype.indexOf.call(swiper.slides, slide);
		if (index >= 0) swiper.slideTo(index);
	}, []);

	const count = products.length;

	return (
		<section
			id={`category-${slug}`}
			aria-labelledby={`category-${slug}-title`}
			className='scroll-mt-6 py-8 sm:py-10'>
			<div className='mb-6 flex items-end justify-between gap-4'>
				<div className='min-w-0'>
					<div className='mb-2 flex items-center gap-2'>
						<span className='h-1.5 w-1.5 rounded-full bg-amber-500' />
						<span className='text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400'>Collection</span>
					</div>
					<h2
						id={`category-${slug}-title`}
						className='ap-display break-words text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl lg:text-4xl'>
						{name}
					</h2>
					<div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500'>
						<span>
							{count} {count === 1 ? 'product' : 'products'}
						</span>
						{loading && (
							<span
								role='status'
								className='inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200'>
								<LuRefreshCw
									size={12}
									className='ap-spin'
									aria-hidden='true'
								/>
								Loading more
							</span>
						)}
					</div>
				</div>

				{/* Hidden only when every card already fits on screen */}
				{!nav.locked && (
					<div className='flex shrink-0 items-center gap-2'>
						<NavButton
							direction='prev'
							label={`Previous ${name} products`}
							disabled={!nav.ready || nav.atStart}
							onClick={handlePrev}
						/>
						<NavButton
							direction='next'
							label={`Next ${name} products`}
							disabled={!nav.ready || nav.atEnd}
							onClick={handleNext}
						/>
					</div>
				)}
			</div>

			<div onFocusCapture={handleFocusCapture}>
				<Swiper
					className='ap-swiper'
					slidesPerView={1.15}
					spaceBetween={12}
					breakpoints={SWIPER_BREAKPOINTS}
					speed={450}
					/* Manual only: no Autoplay module is imported, and these are explicitly off. */
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
					{products.map((product, index) => (
						<SwiperSlide
							key={getProductKey(product, index)}
							className='!h-auto'>
							<div className='h-full'>
								<ProductCard product={product} />
							</div>
						</SwiperSlide>
					))}
				</Swiper>
			</div>

			{/* Partial failure: keep the products that did load, offer a retry */}
			{error && fetchKey && (
				<p className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-800'>
					Some products in this category could not be loaded.
					<button
						type='button'
						onClick={() => onRetry(fetchKey)}
						className='font-semibold underline underline-offset-2 hover:text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500'>
						Retry
					</button>
				</p>
			)}
		</section>
	);
};

// Decides which state a category is in; only the carousel owns Swiper state.
const CategorySection = ({ section, onRetry }) => {
	if (section.products.length > 0) {
		return (
			<CategoryCarousel
				section={section}
				onRetry={onRetry}
			/>
		);
	}
	if (section.loading) return <CategorySkeleton label={section.name} />;
	if (section.error && section.fetchKey) {
		return (
			<CategoryError
				name={section.name}
				onRetry={() => onRetry(section.fetchKey)}
			/>
		);
	}
	return null; // loaded but genuinely empty
};

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const useMergedCatalog = () => {
	const dispatch = useDispatch();
	const slice = useSelector((state) => state.allProducts) || EMPTY_OBJECT;
	const { categories = EMPTY_ARRAY, categoriesLoading = false, categoriesError = null, productsByCategory = EMPTY_OBJECT, loadingByCategory = EMPTY_OBJECT, errorByCategory = EMPTY_OBJECT } = slice;

	const [custom, setCustom] = useState({ products: EMPTY_ARRAY, loading: true, error: false });
	const activeRef = useRef(true);

	// DummyJSON category names
	useEffect(() => {
		if (categories.length === 0 && !categoriesLoading && !categoriesError) {
			dispatch(fetchProductCategories());
		}
	}, [dispatch, categories.length, categoriesLoading, categoriesError]);

	// DummyJSON products — one request per category, only when not loaded/loading/failed
	useEffect(() => {
		categories.forEach((raw) => {
			const category = toCategory(raw);
			if (!category) return;
			const key = category.rawSlug;
			if (productsByCategory[key] === undefined && !loadingByCategory[key] && !errorByCategory[key]) {
				dispatch(fetchProductsByCategory(key));
			}
		});
	}, [categories, productsByCategory, loadingByCategory, errorByCategory, dispatch]);

	// Firebase custom products
	const loadCustom = useCallback(async () => {
		setCustom((prev) => (prev.loading && !prev.error ? prev : { ...prev, loading: true, error: false }));
		try {
			const data = await requestCustomProducts();
			if (!activeRef.current) return;
			const list = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : EMPTY_ARRAY;
			setCustom({ products: list, loading: false, error: false });
		} catch (err) {
			if (!activeRef.current) return;
			console.error('Failed to load custom products:', err);
			setCustom((prev) => ({ ...prev, loading: false, error: true }));
		}
	}, []);

	useEffect(() => {
		activeRef.current = true;
		loadCustom();
		return () => {
			activeRef.current = false;
		};
	}, [loadCustom]);

	const retryCategories = useCallback(() => dispatch(fetchProductCategories()), [dispatch]);
	const retryCategory = useCallback((key) => dispatch(fetchProductsByCategory(key)), [dispatch]);

	// Memoised: rebuilding on every render would hand ProductCard fresh arrays.
	const sections = useMemo(() => buildSections({ categories, productsByCategory, loadingByCategory, errorByCategory, customProducts: custom.products }), [categories, productsByCategory, loadingByCategory, errorByCategory, custom.products]);

	const { productCount, categoryCount, syncing } = useMemo(() => {
		const visible = sections.filter((section) => section.products.length > 0);
		return {
			productCount: visible.reduce((total, section) => total + section.products.length, 0),
			categoryCount: visible.length,
			syncing: Boolean(categoriesLoading) || custom.loading || sections.some((section) => section.loading),
		};
	}, [sections, categoriesLoading, custom.loading]);

	const categoriesFailed = Boolean(categoriesError) && categories.length === 0;

	return {
		sections,
		productCount,
		categoryCount,
		syncing,
		custom,
		categoriesFailed,
		// Page-level states
		fatal: categoriesFailed && !custom.loading && productCount === 0,
		showSkeletons: categories.length === 0 && !categoriesError,
		showEmpty: !syncing && !categoriesFailed && productCount === 0,
		retryCategories,
		retryCategory,
		retryCustom: loadCustom,
	};
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const AllProducts = () => {
	const { sections, productCount, categoryCount, syncing, custom, categoriesFailed, fatal, showSkeletons, showEmpty, retryCategories, retryCategory, retryCustom } = useMergedCatalog();

	const visibleSections = useMemo(() => sections.filter((section) => section.products.length > 0), [sections]);

	const handleExplore = useCallback((event) => {
		event.preventDefault();
		scrollToId('catalog');
	}, []);

	return (
		<main className='min-h-screen overflow-x-hidden bg-stone-100 text-stone-900'>
			<style>{STYLES}</style>

			<CatalogHero
				productCount={productCount}
				categoryCount={categoryCount}
				syncing={syncing}
				onExplore={handleExplore}
			/>

			<section
				id='catalog'
				aria-labelledby='catalog-title'
				className='relative z-10 -mt-8 scroll-mt-4 rounded-t-[32px] bg-stone-100 sm:-mt-10'>
				<div className='mx-auto max-w-[1440px] px-4 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12'>
					<div className='mb-6 flex flex-col justify-between gap-5 border-b border-stone-200 pb-7 sm:flex-row sm:items-end'>
						<div>
							<div className='mb-3 flex items-center gap-2'>
								<span className='h-1.5 w-1.5 rounded-full bg-amber-500' />
								<span className='text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400'>Browse our collections</span>
							</div>
							<h2
								id='catalog-title'
								className='ap-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
								All Products
							</h2>
							<p className='mt-2 max-w-lg text-sm leading-6 text-stone-500'>Every collection in one place — swipe through a category or jump straight to the one you’re after.</p>
						</div>

						{productCount > 0 && (
							<div className='flex flex-wrap items-center gap-2'>
								<span className='rounded-full bg-white px-4 py-2 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200'>
									{productCount} {productCount === 1 ? 'Product' : 'Products'}
								</span>
								<span className='rounded-full bg-white px-4 py-2 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200'>
									{categoryCount} {categoryCount === 1 ? 'Category' : 'Categories'}
								</span>
							</div>
						)}
					</div>

					<CategoryNav sections={visibleSections} />

					{/* Non-blocking notices — products that did load always stay visible */}
					{custom.error && !custom.loading && (
						<Notice
							title='Some store products could not be loaded.'
							text='Products from the other collections are still available.'
							actionLabel='Retry'
							onAction={retryCustom}
						/>
					)}
					{categoriesFailed && !fatal && (
						<Notice
							title='The main collections could not be loaded.'
							text='Showing the store products that are available.'
							actionLabel='Retry'
							onAction={retryCategories}
						/>
					)}

					{fatal ? (
						<CategoryError
							name='the catalogue'
							text='We couldn’t load the product collections. Please check your connection and try again.'
							onRetry={retryCategories}
						/>
					) : (
						<>
							<div className='divide-y divide-stone-200'>
								{sections.map((section) => (
									<CategorySection
										key={section.slug}
										section={section}
										onRetry={retryCategory}
									/>
								))}
								{showSkeletons && (
									<>
										<CategorySkeleton />
										<CategorySkeleton />
									</>
								)}
							</div>
							{showEmpty && <EmptyState />}
						</>
					)}
				</div>
			</section>
		</main>
	);
};

export default AllProducts;
