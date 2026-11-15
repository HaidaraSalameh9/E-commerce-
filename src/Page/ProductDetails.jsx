import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductDetails } from '../app/features/productDetailsSlice';
import { useParams } from 'react-router-dom';
import Spinner from '../components/Spinner';
import useCartSync from '../hooks/useCartSync';
import { FaStar, FaHeart, FaRegHeart, FaBoxOpen, FaChevronLeft, FaChevronRight, FaMinus, FaPlus, FaTruck, FaExclamationTriangle } from 'react-icons/fa';
import { LuZoomIn } from 'react-icons/lu';
import { GiShoppingCart } from 'react-icons/gi';
import { useClerk, useUser } from '@clerk/react';
import { getCustomProducts } from '../services/productService';
import useFavoritesSync from '../hooks/useFavoritesSync';
import ProductRecommendations from '../components/recommendations/ProductRecommendations';

/* -------------------------------------------------------------------------- */
/*  Design tokens & helpers                                                   */
/* -------------------------------------------------------------------------- */

const DISPLAY_FONT = { fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif" };
const STAGE_BG = { background: 'radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f5f5f4 50%, #e7e5e4 100%)' };

const isNumber = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const money = (value) => `$${Number(value).toFixed(2)}`;

const formatDate = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString([], { dateStyle: 'medium' });
};

const getStockInfo = (stock) => {
	if (!isNumber(stock)) return null;
	const n = Number(stock);
	if (n <= 0) return { label: 'Out of stock', chip: 'bg-rose-400/10 text-rose-300 ring-rose-400/30', dot: 'bg-rose-400' };
	if (n <= 5) return { label: `Only ${n} left`, chip: 'bg-amber-400/10 text-amber-300 ring-amber-400/30', dot: 'bg-amber-400' };
	return { label: `${n} in stock`, chip: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30', dot: 'bg-emerald-400' };
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');

@keyframes pd-swap { from { opacity: 0; transform: scale(.94); } }
.pd-swap { animation: pd-swap .5s cubic-bezier(.2,.8,.2,1) backwards; }

/* Add to cart: light sweeps across the gold button on hover */
.pd-cta { position: relative; overflow: hidden; isolation: isolate; }
.pd-cta::before {
	content: ''; position: absolute; z-index: -1; top: 0; bottom: 0; left: -60%; width: 40%;
	background: linear-gradient(100deg, transparent, rgba(255,255,255,.6), transparent);
	transform: skewX(-20deg); transition: left .7s ease;
}
.pd-cta:not(:disabled):hover::before { left: 130%; }

@media (prefers-reduced-motion: reduce) {
	.pd-swap { animation: none; }
	.pd-cta::before { transition: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Stars                                                                     */
/* -------------------------------------------------------------------------- */

const Stars = ({ rating, empty = 'text-stone-600', size = 'text-base' }) => (
	<span
		className='inline-flex items-center gap-0.5'
		role='img'
		aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
		{[0, 1, 2, 3, 4].map((i) => {
			const fillPercentage = Math.min(Math.max(rating - i, 0), 1) * 100;

			return (
				<span
					key={i}
					className={`relative inline-block h-[1em] w-[1em] ${size}`}>
					<FaStar className={`absolute left-0 top-0 ${empty}`} />
					<span
						className='absolute left-0 top-0 overflow-hidden text-amber-400'
						style={{ width: `${fillPercentage}%` }}>
						<FaStar />
					</span>
				</span>
			);
		})}
	</span>
);

/* -------------------------------------------------------------------------- */
/*  Gallery                                                                   */
/* -------------------------------------------------------------------------- */

const ARROW_BTN =
	'absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-lg ring-1 ring-stone-200 backdrop-blur transition hover:scale-110 hover:bg-stone-900 hover:text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 lg:opacity-0 lg:group-hover:opacity-100';

const Gallery = ({ product, thumbnail, onSelect }) => {
	const [zoom, setZoom] = useState(null);

	const images = Array.isArray(product.images) ? product.images : [];
	const index = Math.max(0, images.indexOf(thumbnail));
	const multiple = images.length > 1;
	const go = (direction) => onSelect(images[(index + direction + images.length) % images.length]);

	const handleMove = (e) => {
		if (e.pointerType !== 'mouse' || !thumbnail) return;
		const rect = e.currentTarget.getBoundingClientRect();
		setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
	};

	return (
		<div className='min-w-0'>
			<div
				className={`group relative aspect-square overflow-hidden rounded-[32px] shadow-[0_40px_80px_-30px_rgba(0,0,0,.8)] ring-1 ring-white/10 sm:aspect-[5/4] lg:aspect-square ${thumbnail ? 'lg:cursor-zoom-in' : ''}`}
				style={STAGE_BG}
				onPointerMove={handleMove}
				onPointerLeave={() => setZoom(null)}>
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(circle at 50% 45%, rgba(251,191,36,.26), transparent 55%)' }}
				/>
				<div className='pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-stone-300/60 to-transparent' />
				<div className={`pointer-events-none absolute bottom-[12%] left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-full bg-stone-900/30 blur-lg transition-opacity duration-300 ${zoom ? 'opacity-0' : 'opacity-100'}`} />

				<div className='absolute inset-x-6 bottom-[14%] top-6 sm:inset-x-10 sm:top-8'>
					{thumbnail ? (
						<img
							key={thumbnail}
							src={thumbnail}
							loading='lazy'
							alt={product.title}
							draggable={false}
							className='pd-swap h-full w-full object-contain mix-blend-multiply transition-transform duration-300 ease-out'
							style={zoom ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
						/>
					) : (
						<div className='flex h-full flex-col items-center justify-center gap-3 text-stone-400'>
							<FaBoxOpen
								className='text-6xl'
								aria-hidden='true'
							/>
							<p>No image available</p>
						</div>
					)}
				</div>

				{multiple && (
					<>
						<span className='absolute left-4 top-4 z-20 rounded-full bg-stone-900/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur'>
							{index + 1} / {images.length}
						</span>
						<button
							type='button'
							onClick={() => go(-1)}
							aria-label='Previous image'
							className={`${ARROW_BTN} left-3`}>
							<FaChevronLeft aria-hidden='true' />
						</button>
						<button
							type='button'
							onClick={() => go(1)}
							aria-label='Next image'
							className={`${ARROW_BTN} right-3`}>
							<FaChevronRight aria-hidden='true' />
						</button>
					</>
				)}

				{thumbnail && !zoom && (
					<span className='pointer-events-none absolute bottom-4 left-4 z-20 hidden items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200 backdrop-blur lg:flex'>
						<LuZoomIn aria-hidden='true' /> Hover to zoom
					</span>
				)}
			</div>

			{multiple && (
				<div className='mt-4 flex justify-center'>
					<div className='flex max-w-full gap-3 overflow-x-auto p-1.5'>
						{images.map((image, i) => {
							const active = thumbnail === image;

							return (
								<button
									type='button'
									key={`${image}-${i}`}
									onClick={() => onSelect(image)}
									aria-label={`Show image ${i + 1}`}
									aria-pressed={active}
									className={`h-[72px] w-[72px] shrink-0 rounded-2xl bg-stone-100 p-1.5 ring-2 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${active ? 'scale-105 opacity-100 ring-amber-400' : 'opacity-70 ring-white/10 hover:opacity-100 hover:ring-white/40'}`}>
									<img
										src={image}
										loading='lazy'
										alt={`Thumbnail ${i + 1}`}
										className='h-full w-full object-contain mix-blend-multiply'
									/>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const ProductDetails = () => {
	const dispatch = useDispatch();
	const { id } = useParams();

	const { loading: reduxLoading, error: reduxError, product: reduxProduct } = useSelector((state) => state.singleProduct);

	const [customProduct, setCustomProduct] = useState(null);
	const [customProducts, setCustomProducts] = useState([]);
	const [checkingFirebase, setCheckingFirebase] = useState(true);
	const [quantity, setQuantity] = useState(1);
	const [thumbnail, setThumbnail] = useState(null);
	const [burst, setBurst] = useState(false);

	const { openSignIn } = useClerk();
	const { user } = useUser();
	const { addProduct } = useCartSync();
	const { isFavorite, addFavorite, removeFavorite, isSaving } = useFavoritesSync();

	useEffect(() => {
		let cancelled = false;

		const findProduct = async () => {
			setCheckingFirebase(true);
			setCustomProduct(null);

			let loadedCustomProducts = [];
			let firebaseError = null;

			try {
				const data = await getCustomProducts();
				loadedCustomProducts = Array.isArray(data) ? data : [];
			} catch (error) {
				firebaseError = error;
				console.error('Failed to load custom products catalog:', error.message || error);
			}

			if (cancelled) return;

			setCustomProducts(loadedCustomProducts);

			const foundProduct = loadedCustomProducts.find((item) => String(item.id) === String(id));

			if (foundProduct) {
				setCustomProduct(foundProduct);
				setCheckingFirebase(false);
				return;
			}

			// If not found in custom products:
			// Numeric IDs belong to DummyJSON; fetch from DummyJSON
			const isNumericId = /^\d+$/.test(String(id).trim());

			if (isNumericId || !firebaseError) {
				dispatch(fetchProductDetails(id));
			}

			setCheckingFirebase(false);
		};

		findProduct();

		return () => {
			cancelled = true;
		};
	}, [dispatch, id]);

	const product = customProduct || reduxProduct;

	useEffect(() => {
		setThumbnail(product?.images?.[0] || null);
		setQuantity(1);
	}, [product]);

	const handleFavorite = async () => {
		if (isFavorite(product.id)) {
			const confirmRemove = window.confirm(`Are you sure you want to remove "${product.title}" from your favorites?`);

			if (confirmRemove) {
				await removeFavorite(product.id);
			}
		} else {
			const success = await addFavorite(product);

			if (!success) {
				alert('Could not add this product to favorites.');
				return;
			}

			// Little pop + ring when a product is added to favorites
			setBurst(true);
			setTimeout(() => setBurst(false), 700);
		}
	};

	const addProductToCart = async (productToAdd, productQuantity) => {
		const confirmAdd = window.confirm(`Do you want to add ${productToAdd.title} to your cart?`);

		if (confirmAdd) {
			await addProduct({
				...productToAdd,
				quantity: productQuantity,
			});
		}
	};

	const loading = checkingFirebase || reduxLoading;
	const error = customProduct ? null : reduxError;

	if (loading) {
		return <Spinner />;
	}

	if (error && !product) {
		return (
			<main className='flex min-h-[70vh] items-center justify-center bg-stone-100 px-4'>
				<div
					role='alert'
					className='w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-[0_24px_48px_-28px_rgba(190,18,60,.35)]'>
					<span className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-xl text-rose-500 ring-8 ring-rose-50/60'>
						<FaExclamationTriangle aria-hidden='true' />
					</span>
					<h3 className='mt-5 text-xl font-bold text-rose-500'>
						Something went wrong <span className='text-stone-900'>{error}</span>
					</h3>

					<p className='mt-2 text-stone-500'>Failed to load product. Please try again.</p>

					<button
						onClick={() => dispatch(fetchProductDetails(id))}
						className='mt-6 rounded-full bg-stone-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-stone-950'>
						Retry
					</button>
				</div>
			</main>
		);
	}

	if (!product) {
		return <p className='mt-10 text-center text-stone-500'>Product not found.</p>;
	}

	const discountPercentage = Number(product.discountPercentage) || 0;
	const price = Number(product.price) || 0;
	const hasDiscount = discountPercentage > 0 && discountPercentage < 100;

	const originalPrice = hasDiscount ? price / (1 - discountPercentage / 100) : price;

	/* ---- derived display values (existing fields only) ---- */
	const rating = Number(product.rating) || 0;
	const reviews = Array.isArray(product.reviews) ? product.reviews : [];
	const stockInfo = getStockInfo(product.stock);
	const outOfStock = product.stock === 0;
	const favorite = isFavorite(product.id);
	const maxQuantity = product.stock > 0 ? product.stock : undefined;

	const detailRows = [
		['Shipping', product.shippingInformation, FaTruck],
		['Brand', product.brand],
		['SKU', product.sku],
		['Warranty', product.warrantyInformation],
		['Returns', product.returnPolicy],
	].filter(([, value]) => value);

	return (
		<main className='min-h-screen bg-stone-100'>
			<style>{STYLES}</style>

			{/* ------------------------------ HERO ------------------------------ */}
			<header className='relative overflow-hidden bg-stone-950 text-white'>
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(60% 80% at 100% 0%, rgba(251,191,36,.2), transparent 60%), radial-gradient(50% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
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

				<div className='relative mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-16'>
					<Gallery
						product={product}
						thumbnail={thumbnail}
						onSelect={setThumbnail}
					/>

					<div className='flex min-w-0 flex-col gap-6'>
						{/* Title block */}
						<div className='space-y-4'>
							{(product.category || product.brand) && (
								<div className='flex flex-wrap gap-2'>
									{product.category && <span className='rounded-full bg-white/10 px-3 py-1 text-xs font-medium capitalize text-stone-200 ring-1 ring-white/15'>{String(product.category).replace(/-/g, ' ')}</span>}
									{product.brand && <span className='rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-400/30'>{product.brand}</span>}
								</div>
							)}

							<h1
								className='break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl'
								style={DISPLAY_FONT}>
								{product.title}
							</h1>

							<div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
								<Stars rating={rating} />
								<span className='font-semibold'>{rating.toFixed(1)}</span>
								{reviews.length > 0 && (
									<span className='text-sm text-stone-400'>
										({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
									</span>
								)}
							</div>
						</div>

						{/* Price */}
						<div>
							<div className='flex flex-wrap items-end gap-x-4 gap-y-2'>
								<p
									className='text-5xl font-bold tracking-tight text-amber-300'
									style={DISPLAY_FONT}>
									{money(price)}
								</p>
								{hasDiscount && <p className='pb-1 text-lg text-stone-400 line-through decoration-stone-500 decoration-[1.5px]'>{money(originalPrice)}</p>}
								{hasDiscount && (
									<span
										className='mb-1.5 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-stone-950'
										style={DISPLAY_FONT}>
										{Math.round(discountPercentage)}% off
									</span>
								)}
							</div>
							<p className='mt-2 text-sm text-stone-400'>
								{hasDiscount && <span className='font-medium text-emerald-300'>You save {money(originalPrice - price)} · </span>}
								(inclusive of all taxes)
							</p>
						</div>

						{/* Availability */}
						{(stockInfo || product.shippingInformation) && (
							<div className='flex flex-wrap gap-2'>
								{stockInfo && (
									<span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${stockInfo.chip}`}>
										<span className={`h-2 w-2 rounded-full ${stockInfo.dot}`} />
										{stockInfo.label}
									</span>
								)}
								{product.shippingInformation && (
									<span className='inline-flex max-w-full items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm text-stone-300 ring-1 ring-inset ring-white/10'>
										<FaTruck
											className='shrink-0 text-amber-400'
											aria-hidden='true'
										/>
										<span className='truncate'>{product.shippingInformation}</span>
									</span>
								)}
							</div>
						)}

						{/* Purchase panel */}
						<div className='rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur sm:p-5'>
							<div className='flex flex-wrap items-center justify-between gap-4'>
								<div>
									<label
										htmlFor='pd-quantity'
										className='mb-2 block text-xs font-medium text-stone-400'>
										Quantity
									</label>
									<div className='inline-flex items-center rounded-full bg-white/10 ring-1 ring-white/15 focus-within:ring-amber-400'>
										<button
											type='button'
											onClick={() => setQuantity((q) => Math.max(1, q - 1))}
											disabled={quantity <= 1}
											aria-label='Decrease quantity'
											className='flex h-11 w-11 items-center justify-center rounded-full text-stone-200 transition hover:bg-white/10 disabled:opacity-30'>
											<FaMinus className='text-xs' />
										</button>
										<input
											id='pd-quantity'
											type='number'
											min='1'
											max={maxQuantity}
											value={quantity}
											onChange={(e) => {
												const value = Number(e.target.value);

												if (value >= 1) {
													setQuantity(product.stock > 0 ? Math.min(value, product.stock) : value);
												}
											}}
											className='w-14 bg-transparent text-center text-lg font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
										/>
										<button
											type='button'
											onClick={() => setQuantity((q) => (maxQuantity ? Math.min(maxQuantity, q + 1) : q + 1))}
											disabled={maxQuantity !== undefined && quantity >= maxQuantity}
											aria-label='Increase quantity'
											className='flex h-11 w-11 items-center justify-center rounded-full text-stone-200 transition hover:bg-white/10 disabled:opacity-30'>
											<FaPlus className='text-xs' />
										</button>
									</div>
								</div>

								<div className='text-right'>
									<p className='text-xs font-medium text-stone-400'>Total</p>
									<p
										className='text-2xl font-bold tracking-tight'
										style={DISPLAY_FONT}>
										{money(price * quantity)}
									</p>
								</div>
							</div>

							<div className='mt-4 flex items-center gap-3'>
								{!user ? (
									<button
										onClick={() => openSignIn()}
										className='pd-cta flex h-14 flex-1 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-base font-bold text-stone-950 shadow-lg shadow-amber-500/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 active:scale-[.98]'>
										Add to Cart
										<GiShoppingCart className='text-xl' />
									</button>
								) : (
									<button
										onClick={() => addProductToCart(product, quantity)}
										disabled={product.stock === 0}
										className='pd-cta flex h-14 flex-1 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-base font-bold text-stone-950 shadow-lg shadow-amber-500/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg'>
										{outOfStock ? 'Out of Stock' : 'Add to Cart'}
										{!outOfStock && <GiShoppingCart className='text-xl' />}
									</button>
								)}

								<button
									type='button'
									onClick={handleFavorite}
									disabled={isSaving}
									aria-pressed={favorite}
									aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
									className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl ring-1 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-wait disabled:opacity-60 ${burst ? 'scale-125' : 'hover:scale-110'} ${favorite ? 'bg-amber-400 text-stone-950 ring-amber-400' : 'bg-white/10 text-stone-200 ring-white/20 hover:bg-white/20'}`}>
									{burst && <span className='absolute inset-0 animate-ping rounded-full bg-amber-400/60' />}
									{favorite ? <FaHeart className='relative' /> : <FaRegHeart className='relative' />}
								</button>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* ---------------------------- DETAILS ---------------------------- */}
			<div className='mx-auto max-w-6xl space-y-8 px-4 py-12 sm:space-y-10 sm:px-6 sm:py-16'>
				{(product.description || detailRows.length > 0) && (
					<div className='grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start sm:gap-8'>
						{product.description && (
							<section className='rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] sm:p-8'>
								<h2
									className='text-xl font-bold tracking-tight text-stone-900'
									style={DISPLAY_FONT}>
									About this product
								</h2>
								<p className='mt-4 whitespace-pre-line break-words text-base leading-relaxed text-stone-600'>{product.description}</p>
							</section>
						)}

						{detailRows.length > 0 && (
							<section className='rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] sm:p-8'>
								<h2
									className='text-xl font-bold tracking-tight text-stone-900'
									style={DISPLAY_FONT}>
									Shipping &amp; details
								</h2>
								<dl className='mt-4 divide-y divide-dashed divide-stone-200'>
									{detailRows.map(([label, value, Icon]) => (
										<div
											key={label}
											className='flex items-start gap-3 py-3'>
											{Icon && (
												<Icon
													className='mt-0.5 shrink-0 text-amber-500'
													aria-hidden='true'
												/>
											)}
											<dt className='w-20 shrink-0 text-sm text-stone-400'>{label}</dt>
											<dd className='min-w-0 break-words text-sm font-medium text-stone-800'>{String(value)}</dd>
										</div>
									))}
								</dl>
							</section>
						)}
					</div>
				)}

				{reviews.length > 0 && (
					<section aria-label='Customer reviews'>
						<div className='mb-5 flex flex-wrap items-baseline justify-between gap-3 px-1'>
							<h2
								className='text-2xl font-bold tracking-tight text-stone-900'
								style={DISPLAY_FONT}>
								Customer reviews
							</h2>
							<p className='text-sm text-stone-500'>
								{rating.toFixed(1)} average · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
							</p>
						</div>

						<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
							{reviews.map((review, index) => {
								const reviewer = review?.reviewerName || 'Customer';
								const reviewRating = Number(review?.rating) || 0;
								const reviewDate = formatDate(review?.date);

								return (
									<article
										key={`${reviewer}-${index}`}
										className='flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_14px_30px_-22px_rgba(28,25,23,.4)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgba(28,25,23,.45)]'>
										<div className='flex items-center gap-3'>
											<span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 font-bold text-amber-300'>{reviewer.charAt(0).toUpperCase()}</span>
											<div className='min-w-0'>
												<p className='truncate font-semibold text-stone-900'>{reviewer}</p>
												{reviewDate && <p className='text-xs text-stone-400'>{reviewDate}</p>}
											</div>
										</div>
										<Stars
											rating={reviewRating}
											empty='text-stone-200'
											size='text-sm'
										/>
										{review?.comment && <p className='break-words text-sm leading-relaxed text-stone-600'>{review.comment}</p>}
									</article>
								);
							})}
						</div>
					</section>
				)}

				{/* Similar products — existing component, props unchanged */}
				<section
					aria-label='Similar products'
					className='empty:hidden'>
					<ProductRecommendations
						currentProduct={product}
						customProducts={customProducts}
					/>
				</section>
			</div>
		</main>
	);
};

export default ProductDetails;
