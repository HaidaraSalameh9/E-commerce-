import React, { memo, useState } from 'react';
import { FaBoxOpen, FaHeart, FaRegHeart, FaStar, FaTruck } from 'react-icons/fa';

import { LuEye } from 'react-icons/lu';
import { GiShoppingCart } from 'react-icons/gi';
import { Link } from 'react-router';
import { useClerk, useUser } from '@clerk/react';

import useCartSync from '../hooks/useCartSync';
import useFavoritesSync from '../hooks/useFavoritesSync';

/* -------------------------------------------------------------------------- */
/*  Design tokens                                                             */
/* -------------------------------------------------------------------------- */

// Same display face as My Orders / Order Confirmation. It falls back to the
// system sans-serif if that font hasn't been loaded globally yet.
const DISPLAY_FONT = { fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif" };

const STAGE_BG = { background: 'radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f5f5f4 50%, #e7e5e4 100%)' };
const SPOTLIGHT = { background: 'radial-gradient(circle at 50% 45%, rgba(251,191,36,.24), transparent 55%)' };

const CARD_CLASS =
	'group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white p-2 shadow-[0_1px_2px_rgba(28,25,23,.05),0_14px_30px_-20px_rgba(28,25,23,.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-stone-300 hover:shadow-[0_2px_4px_rgba(28,25,23,.06),0_30px_50px_-24px_rgba(28,25,23,.5)]';

const ROUND_BTN = 'absolute z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-md ring-1 backdrop-blur transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500';

// Gold fill sweeps in from the left on hover.
const ADD_BTN_CLASS =
	"group/btn relative isolate mt-auto flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/20 transition duration-300 before:absolute before:inset-0 before:-z-10 before:-translate-x-full before:bg-gradient-to-r before:from-amber-300 before:to-amber-500 before:transition-transform before:duration-500 before:ease-out before:content-[''] hover:text-stone-950 hover:before:translate-x-0 focus-visible:text-stone-950 focus-visible:before:translate-x-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[.98]";

const isNumber = (value) => value != null && value !== '' && Number.isFinite(Number(value));

const getStockInfo = (stock) => {
	if (!isNumber(stock)) return null;
	const n = Number(stock);
	if (n <= 0) return { label: 'Out of stock', chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' };
	if (n <= 5) return { label: `Only ${n} left`, chip: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' };
	return { label: `${n} in stock`, chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' };
};

/* -------------------------------------------------------------------------- */
/*  Rating stars (supports fractional ratings)                                */
/* -------------------------------------------------------------------------- */

const Stars = ({ rating }) => {
	const pct = Math.max(0, Math.min(100, (rating / 5) * 100));

	return (
		<span
			className='relative inline-flex'
			role='img'
			aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
			<span className='flex gap-0.5 text-stone-300'>
				{[0, 1, 2, 3, 4].map((i) => (
					<FaStar
						key={i}
						className='shrink-0 text-sm'
					/>
				))}
			</span>
			<span
				className='absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden text-amber-400'
				style={{ width: `${pct}%` }}>
				{[0, 1, 2, 3, 4].map((i) => (
					<FaStar
						key={i}
						className='shrink-0 text-sm'
					/>
				))}
			</span>
		</span>
	);
};

/* -------------------------------------------------------------------------- */
/*  Product card                                                              */
/* -------------------------------------------------------------------------- */

const ProductCard = ({ product }) => {
	const { isFavorite, addFavorite, removeFavorite, isSaving } = useFavoritesSync();

	const { openSignIn } = useClerk();
	const { user } = useUser();

	const { addProduct } = useCartSync();

	const [imageFailed, setImageFailed] = useState(false);
	const [burst, setBurst] = useState(false);

	const addProductToCart = async (product) => {
		const confirmAdd = confirm(`Do you want to add ${product.title} to your cart?`);

		if (confirmAdd) {
			await addProduct(product);
		}
	};

	const handleFavorite = async () => {
		if (isFavorite(product.id)) {
			const confirmRemove = confirm(`Are you sure you want to remove "${product.title}" from your favorites?`);

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

	/* ---- derived display values (no new data, only the existing fields) ---- */
	const title = product.title || 'Product';
	const detailsPath = `/productDetails/${product.id}`;
	const image = product.images?.[0];
	const favorite = isFavorite(product.id);

	const hasPrice = isNumber(product.price);
	const price = Number(product.price);
	const discount = Number(product.discountPercentage);
	const hasDiscount = isNumber(product.discountPercentage) && discount > 0 && discount < 100;
	const originalPrice = hasPrice && hasDiscount ? price / (1 - discount / 100) : null;

	const hasRating = isNumber(product.rating);
	const rating = Number(product.rating);
	const stockInfo = getStockInfo(product.stock);

	return (
		<div className={CARD_CLASS}>
			{/* IMAGE STAGE — product "levitates" over a soft studio floor */}
			<div
				className='relative aspect-[5/4] overflow-hidden rounded-[20px]'
				style={STAGE_BG}>
				<div
					className='pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100'
					style={SPOTLIGHT}
				/>
				<div className='pointer-events-none absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-stone-300/60 to-transparent' />
				<div className='pointer-events-none absolute bottom-[15%] left-1/2 h-3 w-3/5 -translate-x-1/2 rounded-full bg-stone-900/30 blur-md transition-all duration-500 group-hover:w-2/5 group-hover:opacity-50' />

				<Link
					to={detailsPath}
					aria-label={`View ${title}`}
					className='absolute inset-x-4 bottom-[18%] top-4 flex items-center justify-center'>
					{image && !imageFailed ? (
						<img
							src={image}
							alt={title}
							loading='lazy'
							onError={() => setImageFailed(true)}
							className='max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:scale-110'
						/>
					) : (
						<FaBoxOpen
							className='h-1/2 w-1/2 text-stone-300'
							aria-hidden='true'
						/>
					)}
				</Link>

				{/* Discount badge — only when the product really has a discount */}
				{hasDiscount && (
					<span
						className='absolute left-3 top-3 z-20 inline-flex items-center rounded-full bg-stone-900 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-lg ring-1 ring-white/20'
						style={DISPLAY_FONT}>
						{Math.round(discount)}% off
					</span>
				)}

				{/* Favorite */}
				<button
					type='button'
					onClick={handleFavorite}
					disabled={isSaving}
					aria-pressed={favorite}
					aria-label={favorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
					className={`${ROUND_BTN} right-3 top-3 disabled:cursor-wait disabled:opacity-60 ${burst ? 'scale-125' : 'hover:scale-110'} ${favorite ? 'bg-stone-900 text-amber-400 ring-stone-900' : 'bg-white/85 text-stone-600 ring-stone-200 hover:bg-white hover:text-stone-900'}`}>
					{burst && <span className='absolute inset-0 animate-ping rounded-full bg-amber-400/60' />}
					{favorite ? <FaHeart className='relative' /> : <FaRegHeart className='relative' />}
				</button>

				{/* Quick view */}
				<Link
					to={detailsPath}
					aria-label={`View details of ${title}`}
					title='View details'
					className={`${ROUND_BTN} bottom-3 right-3 bg-white/85 text-stone-700 ring-stone-200 hover:scale-110 hover:bg-stone-900 hover:text-amber-300`}>
					<LuEye />
				</Link>
			</div>

			{/* CONTENT */}
			<div className='flex flex-1 flex-col gap-3 p-4 sm:p-5'>
				<div className='space-y-1.5'>
					{product.shippingInformation && (
						<p className='flex items-center gap-1.5 text-xs text-stone-500'>
							<FaTruck
								className='shrink-0 text-amber-500'
								aria-hidden='true'
							/>
							<span className='truncate'>{product.shippingInformation}</span>
						</p>
					)}

					<Link to={detailsPath}>
						<h3
							title={title}
							className='line-clamp-2 min-h-[2.75rem] break-words text-base font-semibold leading-snug text-stone-900 transition-colors hover:text-amber-700'
							style={DISPLAY_FONT}>
							{title}
						</h3>
					</Link>
				</div>

				{(hasRating || stockInfo) && (
					<div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2'>
						{hasRating && (
							<div className='flex items-center gap-2'>
								<Stars rating={rating} />
								<span className='text-sm font-semibold text-stone-800'>{rating.toFixed(1)}</span>
							</div>
						)}
						{stockInfo && (
							<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${stockInfo.chip}`}>
								<span className={`h-1.5 w-1.5 rounded-full ${stockInfo.dot}`} />
								{stockInfo.label}
							</span>
						)}
					</div>
				)}

				<div className='flex flex-wrap items-baseline gap-x-2.5'>
					<span
						className='text-2xl font-bold tracking-tight text-stone-900'
						style={DISPLAY_FONT}>
						{hasPrice ? `$${price.toFixed(2)}` : '—'}
					</span>
					{originalPrice && <span className='text-sm text-stone-400 line-through decoration-stone-300 decoration-[1.5px]'>${originalPrice.toFixed(2)}</span>}
				</div>

				<button
					type='button'
					className={ADD_BTN_CLASS}
					onClick={user ? () => addProductToCart(product) : openSignIn}>
					Add to cart
					<GiShoppingCart className='text-lg transition-transform duration-300 group-hover/btn:-rotate-12 group-hover/btn:translate-x-0.5' />
				</button>
			</div>
		</div>
	);
};

export default memo(ProductCard);
