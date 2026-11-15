import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrders } from '../services/ordersService';

import { FaBoxOpen, FaExclamationTriangle, FaReceipt, FaRegCalendarAlt, FaShoppingCart } from 'react-icons/fa';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const toNumber = (value) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value, digits = 2) =>
	toNumber(value).toLocaleString('en-IN', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

const formatDate = (value) => {
	if (!value) return 'Date unavailable';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

const countItems = (products) => products.reduce((total, product) => total + toNumber(product?.quantity), 0);

/* -------------------------------------------------------------------------- */
/*  Status badge styles                                                       */
/* -------------------------------------------------------------------------- */

const SKY = 'bg-sky-50 text-sky-800 ring-sky-200';
const EMERALD = 'bg-emerald-50 text-emerald-800 ring-emerald-200';
const ROSE = 'bg-rose-50 text-rose-800 ring-rose-200';

const STATUS_STYLES = {
	pending: { chip: 'bg-amber-50 text-amber-800 ring-amber-200', live: true },
	processing: { chip: SKY, live: true },
	confirmed: { chip: SKY, live: false },
	paid: { chip: EMERALD, live: false },
	shipped: { chip: 'bg-violet-50 text-violet-800 ring-violet-200', live: true },
	delivered: { chip: EMERALD, live: false },
	completed: { chip: EMERALD, live: false },
	cancelled: { chip: ROSE, live: false },
	canceled: { chip: ROSE, live: false },
	failed: { chip: ROSE, live: false },
};
const DEFAULT_STATUS = { chip: 'bg-stone-100 text-stone-700 ring-stone-200', live: false };

const StatusBadge = ({ status }) => {
	const style = STATUS_STYLES[String(status || '').toLowerCase()] || DEFAULT_STATUS;

	return (
		<span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${style.chip}`}>
			<span className='relative flex h-2 w-2'>
				{style.live && <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60' />}
				<span className='relative inline-flex h-2 w-2 rounded-full bg-current' />
			</span>
			{status || 'Unknown'}
		</span>
	);
};

/* -------------------------------------------------------------------------- */
/*  Shopping basket                                                           */
/*                                                                            */
/*  Three stacked layers inside one 300×240 coordinate space:                 */
/*    1. back  – ground shadow, handle, dark basket opening, back rim         */
/*    2. items – product images, clipped so they never leave the basket sides */
/*    3. front – woven front wall, front rim, depth shading                   */
/*  Everything is positioned in %, so it scales cleanly on any screen.        */
/* -------------------------------------------------------------------------- */

const FRONT_PATH = 'M38 92 A112 15 0 0 0 262 92 L224 200 Q150 214 76 200 Z';

// Square-ish boxes (height = width × 1.25 because the basket is 300×240).
// Values are % of the basket box. Layouts adapt to 1, 2 or 3 products.
const BASKET_LAYOUTS = {
	1: [{ left: 21, top: 2, width: 58, rotate: -4, z: 2 }],
	2: [
		{ left: 9, top: 10, width: 45, rotate: -11, z: 2 },
		{ left: 43, top: 3, width: 45, rotate: 9, z: 3 },
	],
	3: [
		{ left: 11, top: 17, width: 38, rotate: -15, z: 1 },
		{ left: 51, top: 14, width: 38, rotate: 14, z: 2 },
		{ left: 29, top: 4, width: 42, rotate: 3, z: 3 },
	],
};

const ITEM_CLIP = 'polygon(-10% -25%, 110% -25%, 110% 38.33%, 87.33% 38.33%, 74.67% 83.33%, 25.33% 83.33%, 12.67% 38.33%, -10% 38.33%)';

// Shared gradients / patterns, rendered once and referenced by every basket.
const BasketDefs = () => (
	<svg
		width='0'
		height='0'
		className='absolute'
		aria-hidden='true'
		focusable='false'>
		<defs>
			<linearGradient
				id='mo-gold'
				x1='0'
				y1='0'
				x2='1'
				y2='0'>
				<stop
					offset='0'
					stopColor='#fde68a'
				/>
				<stop
					offset='.35'
					stopColor='#f59e0b'
				/>
				<stop
					offset='.7'
					stopColor='#b45309'
				/>
				<stop
					offset='1'
					stopColor='#fcd34d'
				/>
			</linearGradient>
			<linearGradient
				id='mo-metal'
				x1='0'
				y1='0'
				x2='0'
				y2='1'>
				<stop
					offset='0'
					stopColor='#f5f5f4'
				/>
				<stop
					offset='.5'
					stopColor='#d6d3d1'
				/>
				<stop
					offset='1'
					stopColor='#8b857f'
				/>
			</linearGradient>
			<linearGradient
				id='mo-gloss'
				x1='0'
				y1='0'
				x2='1'
				y2='0'>
				<stop
					offset='0'
					stopColor='#fff'
					stopOpacity='.5'
				/>
				<stop
					offset='.3'
					stopColor='#fff'
					stopOpacity='0'
				/>
				<stop
					offset='.72'
					stopColor='#000'
					stopOpacity='0'
				/>
				<stop
					offset='1'
					stopColor='#000'
					stopOpacity='.35'
				/>
			</linearGradient>
			<linearGradient
				id='mo-interior'
				x1='0'
				y1='0'
				x2='0'
				y2='1'>
				<stop
					offset='0'
					stopColor='#0c0a09'
				/>
				<stop
					offset='1'
					stopColor='#44403c'
				/>
			</linearGradient>
			<linearGradient
				id='mo-occlude'
				x1='0'
				y1='0'
				x2='0'
				y2='1'>
				<stop
					offset='.35'
					stopColor='#000'
					stopOpacity='0'
				/>
				<stop
					offset='1'
					stopColor='#000'
					stopOpacity='.65'
				/>
			</linearGradient>
			<pattern
				id='mo-mesh'
				width='12'
				height='12'
				patternUnits='userSpaceOnUse'>
				<path
					d='M0 0 L12 12 M12 0 L0 12'
					stroke='#1c1917'
					strokeOpacity='.2'
					strokeWidth='1'
					fill='none'
				/>
			</pattern>
			<filter
				id='mo-blur'
				x='-20%'
				y='-80%'
				width='140%'
				height='260%'>
				<feGaussianBlur stdDeviation='6' />
			</filter>
			<clipPath id='mo-front-clip'>
				<path d={FRONT_PATH} />
			</clipPath>
		</defs>
	</svg>
);

const BasketItem = ({ product, layout, index }) => {
	const [failed, setFailed] = useState(false);
	const hasImage = Boolean(product?.thumbnail) && !failed;

	return (
		<div
			className='mo-item absolute'
			style={{
				left: `${layout.left}%`,
				top: `${layout.top}%`,
				width: `${layout.width}%`,
				height: `${layout.width * 1.25}%`,
				zIndex: layout.z,
				'--r': `${layout.rotate}deg`,
				'--d': `${index * 110}ms`,
			}}>
			{hasImage ? (
				<img
					src={product.thumbnail}
					alt={product.title || 'Product'}
					loading='lazy'
					draggable={false}
					onError={() => setFailed(true)}
					className='h-full w-full rounded-lg object-contain'
					style={{ filter: 'drop-shadow(0 10px 8px rgba(0,0,0,.5))' }}
				/>
			) : (
				<div
					role='img'
					aria-label={product?.title || 'Product'}
					className='flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-stone-200 to-stone-400 text-stone-600 shadow-xl'>
					<FaBoxOpen className='h-1/3 w-1/3' />
				</div>
			)}
		</div>
	);
};

const OrderBasket = ({ products = [] }) => {
	const shown = products.slice(0, 3);
	const layout = BASKET_LAYOUTS[shown.length] || [];
	const extra = products.length - shown.length;

	return (
		<div className='mo-basket relative aspect-[300/240] w-full max-w-[340px]'>
			{/* 1 — back layer */}
			<svg
				viewBox='0 0 300 240'
				className='absolute inset-0 z-0 h-full w-full overflow-visible'
				aria-hidden='true'>
				<ellipse
					cx='150'
					cy='217'
					rx='106'
					ry='9'
					fill='#000'
					opacity='.6'
					filter='url(#mo-blur)'
				/>
				<path
					d='M46 94 C40 14 260 14 254 94'
					fill='none'
					stroke='url(#mo-gold)'
					strokeWidth='5'
					strokeLinecap='round'
				/>
				<path
					d='M52 90 C48 24 252 24 248 90'
					fill='none'
					stroke='#fff'
					strokeOpacity='.3'
					strokeWidth='1.2'
					strokeLinecap='round'
				/>
				<ellipse
					cx='150'
					cy='92'
					rx='112'
					ry='15'
					fill='url(#mo-interior)'
				/>
				<path
					d='M38 92 A112 15 0 0 1 262 92'
					fill='none'
					stroke='url(#mo-gold)'
					strokeWidth='5'
					strokeLinecap='round'
				/>
			</svg>

			{/* 2 — products, clipped to the basket sides */}
			<div
				className='absolute inset-0 z-10'
				style={{ clipPath: ITEM_CLIP }}>
				{shown.map((product, index) => (
					<BasketItem
						key={`${product?.productId ?? 'product'}-${index}`}
						product={product}
						layout={layout[index]}
						index={index}
					/>
				))}
			</div>

			{/* 3 — front layer */}
			<svg
				viewBox='0 0 300 240'
				className='pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible'
				aria-hidden='true'>
				<ellipse
					cx='150'
					cy='92'
					rx='112'
					ry='15'
					fill='url(#mo-occlude)'
				/>
				<path
					d={FRONT_PATH}
					fill='url(#mo-metal)'
				/>
				<g clipPath='url(#mo-front-clip)'>
					<rect
						x='30'
						y='85'
						width='240'
						height='135'
						fill='url(#mo-mesh)'
					/>
					{[
						[125, 26],
						[155, 20],
						[182, 14],
					].map(([y, bend]) => (
						<g key={y}>
							<path
								d={`M30 ${y} Q150 ${y + bend} 270 ${y}`}
								fill='none'
								stroke='#78716c'
								strokeOpacity='.6'
								strokeWidth='3'
							/>
							<path
								d={`M30 ${y + 2.5} Q150 ${y + bend + 2.5} 270 ${y + 2.5}`}
								fill='none'
								stroke='#fff'
								strokeOpacity='.55'
								strokeWidth='1'
							/>
						</g>
					))}
				</g>
				<path
					d={FRONT_PATH}
					fill='url(#mo-gloss)'
				/>
				<path
					d='M76 200 Q150 214 224 200 L218 209 Q150 223 82 209 Z'
					fill='#44403c'
				/>
				<path
					d='M76 200 Q150 214 224 200'
					fill='none'
					stroke='url(#mo-gold)'
					strokeWidth='2.5'
				/>
				<path
					d='M38 92 A112 15 0 0 0 262 92'
					fill='none'
					stroke='url(#mo-gold)'
					strokeWidth='6.5'
					strokeLinecap='round'
				/>
				<path
					d='M44 90.5 A106 13 0 0 0 256 90.5'
					fill='none'
					stroke='#fff'
					strokeOpacity='.4'
					strokeWidth='1.2'
					strokeLinecap='round'
				/>
			</svg>

			{extra > 0 && <span className='mo-pop absolute right-[3%] top-[2%] z-30 rounded-full bg-amber-400 px-3 py-1.5 text-sm font-bold text-stone-950 shadow-lg shadow-black/40 ring-4 ring-stone-900/70'>+{extra}</span>}
		</div>
	);
};

/* Dark "display stage" the basket sits on */
const BasketStage = ({ products, showCount = true, className = '' }) => (
	<div
		className={`relative isolate flex items-center justify-center overflow-hidden px-6 py-10 ${className}`}
		style={{ background: 'linear-gradient(160deg,#292524 0%,#1c1917 45%,#0c0a09 100%)' }}>
		<div
			className='pointer-events-none absolute inset-0 opacity-70'
			style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
		/>
		<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
			<div
				className='mo-glow aspect-square w-[88%] rounded-full'
				style={{ background: 'radial-gradient(circle, rgba(251,191,36,.3) 0%, rgba(251,191,36,.09) 45%, transparent 70%)' }}
			/>
		</div>
		<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
			<div className='aspect-square w-[66%] rounded-full border border-white/10' />
		</div>

		{showCount && (
			<span className='absolute left-4 top-4 z-30 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-stone-200 ring-1 ring-white/15 backdrop-blur'>
				{products.length} {products.length === 1 ? 'product' : 'products'}
			</span>
		)}

		<OrderBasket products={products} />
	</div>
);

/* -------------------------------------------------------------------------- */
/*  Order card                                                                */
/* -------------------------------------------------------------------------- */

const OrderCard = ({ order, onView }) => {
	const products = Array.isArray(order.products) ? order.products : [];
	const itemCount = countItems(products);

	return (
		<article
			aria-label={`Order ${order.orderNumber || order.orderId}`}
			className='mo-card overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,.05),0_18px_40px_-24px_rgba(28,25,23,.35)] transition duration-500 hover:-translate-y-1 hover:border-stone-300 hover:shadow-[0_2px_4px_rgba(28,25,23,.06),0_34px_60px_-28px_rgba(28,25,23,.5)] md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
			<BasketStage products={products} />

			<div className='flex flex-col justify-between gap-7 p-6 sm:p-8'>
				<div>
					<div className='flex items-start justify-between gap-4'>
						<div className='min-w-0'>
							<p className='text-xs font-medium text-stone-400'>Order number</p>
							<h2 className='mo-display mt-1 break-all text-xl font-bold tracking-tight text-stone-900 sm:text-2xl'>{order.orderNumber || order.orderId}</h2>
						</div>
						<StatusBadge status={order.status} />
					</div>

					<p className='mt-3 flex items-center gap-2 text-sm text-stone-500'>
						<FaRegCalendarAlt
							className='shrink-0 text-amber-500'
							aria-hidden='true'
						/>
						{formatDate(order.createdAt)}
					</p>

					{products.length > 0 && (
						<ul className='mt-5 space-y-2.5'>
							{products.slice(0, 3).map((product, index) => (
								<li
									key={`${product?.productId ?? 'product'}-${index}`}
									className='flex items-center justify-between gap-3 text-sm'>
									<span className='flex min-w-0 items-center gap-2.5 text-stone-700'>
										<span className='h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400' />
										<span className='truncate'>{product?.title || 'Product'}</span>
									</span>
									{product?.quantity != null && <span className='shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500'>×{product.quantity}</span>}
								</li>
							))}
							{products.length > 3 && <li className='pl-4 text-xs font-medium text-stone-400'>and {products.length - 3} more in this order</li>}
						</ul>
					)}
				</div>

				<div className='border-t border-dashed border-stone-300 pt-5'>
					<div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-4'>
						<div className='flex items-end gap-6'>
							<div>
								<p className='text-xs font-medium text-stone-400'>Items</p>
								<p className='mo-display mt-0.5 text-lg font-bold text-stone-900'>{itemCount}</p>
							</div>
							<div className='h-9 w-px bg-stone-200' />
							<div>
								<p className='text-xs font-medium text-stone-400'>Total</p>
								<p className='mo-display mt-0.5 text-2xl font-bold tracking-tight text-stone-900'>${formatMoney(order.totalPrice)}</p>
							</div>
						</div>

						<button
							type='button'
							onClick={onView}
							className='mo-btn w-full rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[.98] sm:w-auto'>
							View order
						</button>
					</div>
				</div>
			</div>
		</article>
	);
};

/* -------------------------------------------------------------------------- */
/*  Page states                                                               */
/* -------------------------------------------------------------------------- */

const SummaryItem = ({ icon, label, value }) => (
	<div className='flex min-w-0 flex-col items-start gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-5'>
		<span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-sm text-amber-400'>{icon}</span>
		<div className='min-w-0'>
			<p className='text-xs font-medium text-stone-400'>{label}</p>
			<p className='mo-display truncate text-lg font-bold tracking-tight text-stone-900 sm:text-2xl'>{value}</p>
		</div>
	</div>
);

const SummaryStrip = ({ orders }) => {
	const deliveredOrders = orders.filter((order) => order.status?.toLowerCase() === 'delivered');

	const items = deliveredOrders.reduce((total, order) => total + (Array.isArray(order.products) ? countItems(order.products) : 0), 0);

	const spent = deliveredOrders.reduce((total, order) => total + toNumber(order.totalPrice), 0);

	return (
		<div className='grid grid-cols-3 divide-x divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_24px_48px_-24px_rgba(28,25,23,.45)]'>
			<SummaryItem
				icon={<FaReceipt />}
				label='Orders'
				value={orders.length}
			/>
			<SummaryItem
				icon={<FaShoppingCart />}
				label='Items bought'
				value={items}
			/>
			<SummaryItem
				icon={<span className='font-bold'>$</span>}
				label='Total spent'
				value={formatMoney(spent, 0)}
			/>
		</div>
	);
};

const LoadingState = () => (
	<div
		role='status'
		aria-live='polite'
		className='space-y-6'>
		<div className='h-[88px] animate-pulse rounded-2xl border border-stone-200 bg-white sm:h-[96px]' />
		{[0, 1].map((key) => (
			<div
				key={key}
				className='overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
				<div className='animate-pulse'>
					<BasketStage
						products={[]}
						showCount={false}
					/>
				</div>
				<div className='animate-pulse space-y-4 p-6 sm:p-8'>
					<div className='h-3 w-24 rounded-full bg-stone-200' />
					<div className='h-7 w-2/3 rounded-full bg-stone-200' />
					<div className='h-3 w-40 rounded-full bg-stone-100' />
					<div className='space-y-3 pt-4'>
						<div className='h-3 w-full rounded-full bg-stone-100' />
						<div className='h-3 w-5/6 rounded-full bg-stone-100' />
					</div>
					<div className='h-11 w-36 rounded-full bg-stone-200' />
				</div>
			</div>
		))}
		<p className='text-center text-sm text-stone-500'>Loading your orders...</p>
	</div>
);

const ErrorState = ({ message, onBack }) => (
	<div
		role='alert'
		className='rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-[0_24px_48px_-28px_rgba(190,18,60,.35)] sm:p-12'>
		<div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-xl text-rose-500 ring-8 ring-rose-50/60'>
			<FaExclamationTriangle aria-hidden='true' />
		</div>
		<h2 className='mo-display mt-6 text-2xl font-bold tracking-tight text-stone-900'>We couldn’t show your orders</h2>
		<p className='mx-auto mt-2 max-w-md text-rose-700'>{message}</p>
		<button
			type='button'
			onClick={onBack}
			className='mo-btn mt-7 rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'>
			Back to store
		</button>
	</div>
);

const EmptyState = ({ onStart }) => (
	<div className='overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_48px_-28px_rgba(28,25,23,.45)]'>
		<BasketStage
			products={[]}
			showCount={false}
		/>
		<div className='px-6 py-10 text-center sm:py-12'>
			<h2 className='mo-display text-2xl font-bold tracking-tight text-stone-900'>No orders yet</h2>
			<p className='mx-auto mt-2 max-w-md text-stone-500'>Your orders will appear here after checkout.</p>
			<button
				type='button'
				onClick={onStart}
				className='mo-btn mt-7 rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'>
				Start Shopping
			</button>
		</div>
	</div>
);

/* -------------------------------------------------------------------------- */
/*  Styles (scoped, no Tailwind config changes needed)                        */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');

.mo-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes mo-drop {
	from { opacity: 0; transform: translateY(-70%) rotate(calc(var(--r, 0deg) * 2.2)); }
}
@keyframes mo-pop {
	0% { opacity: 0; transform: scale(.4); }
	70% { transform: scale(1.14); }
	100% { opacity: 1; transform: scale(1); }
}

/* Products settle into the basket once on load */
.mo-item {
	transform: rotate(var(--r, 0deg));
	transform-origin: 50% 80%;
	transition: transform .7s cubic-bezier(.2,.8,.2,1);
	transition-delay: var(--d, 0ms);
	animation: mo-drop .9s cubic-bezier(.22,1.15,.4,1) backwards;
	animation-delay: calc(var(--d, 0ms) + 120ms);
}
.mo-pop { animation: mo-pop .6s cubic-bezier(.2,.8,.2,1) .7s backwards; }

/* Card hover: basket lifts, products rise, glow opens up */
.mo-basket { transition: transform .7s cubic-bezier(.2,.8,.2,1); }
.mo-card:hover .mo-basket { transform: translateY(-3px) scale(1.025); }
.mo-card:hover .mo-item { transform: translateY(-7%) rotate(calc(var(--r, 0deg) * 1.15)) scale(1.04); }
.mo-glow { opacity: .8; transition: opacity .6s ease, transform .8s ease; }
.mo-card:hover .mo-glow { opacity: 1; transform: scale(1.08); }

/* Button: gold fill sweeps in */
.mo-btn { position: relative; overflow: hidden; isolation: isolate; transition: color .3s ease, transform .15s ease; }
.mo-btn::before {
	content: ''; position: absolute; inset: 0; z-index: -1;
	background: linear-gradient(90deg, #fcd34d, #f59e0b);
	transform: translateX(-101%);
	transition: transform .45s cubic-bezier(.2,.8,.2,1);
}
.mo-btn:hover, .mo-btn:focus-visible { color: #1c1917; }
.mo-btn:hover::before, .mo-btn:focus-visible::before { transform: none; }

@media (prefers-reduced-motion: reduce) {
	.mo-item, .mo-pop { animation: none; }
	.mo-item, .mo-basket, .mo-glow, .mo-btn, .mo-btn::before { transition: none; }
	.mo-card:hover .mo-item { transform: rotate(var(--r, 0deg)); }
	.mo-card:hover .mo-basket, .mo-card:hover .mo-glow { transform: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const MyOrders = () => {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const navigate = useNavigate();

	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!isLoaded) return;

		if (!isSignedIn) {
			setError('Please sign in to view your orders.');
			setLoading(false);
			return;
		}

		let cancelled = false;

		async function loadOrders() {
			try {
				setLoading(true);
				setError('');

				const result = await getMyOrders(getToken);

				if (!cancelled) {
					setOrders(result);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err.message || 'Could not load your orders.');
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		loadOrders();

		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, getToken]);

	const isLoading = !isLoaded || loading;
	const orderList = Array.isArray(orders) ? orders : [];

	let content;
	if (isLoading) {
		content = <LoadingState />;
	} else if (error) {
		content = (
			<ErrorState
				message={error}
				onBack={() => navigate('/')}
			/>
		);
	} else if (orderList.length === 0) {
		content = <EmptyState onStart={() => navigate('/')} />;
	} else {
		content = (
			<div className='space-y-8'>
				<SummaryStrip orders={orderList} />

				<div>
					<div className='mb-5 flex items-baseline justify-between gap-4 px-1'>
						<h2 className='mo-display text-xl font-bold tracking-tight text-stone-900'>Order history</h2>
						<p className='text-sm text-stone-500'>
							{orderList.length} {orderList.length === 1 ? 'order' : 'orders'}
						</p>
					</div>

					<div className='space-y-6 sm:space-y-8'>
						{orderList.map((order, index) => (
							<OrderCard
								key={order.orderId || order.orderNumber || index}
								order={order}
								onView={() => navigate(`/order-confirmation/${order.orderId}`)}
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<main className='min-h-screen bg-stone-100'>
			<style>{STYLES}</style>
			<BasketDefs />

			<header className='relative overflow-hidden bg-stone-950 text-white'>
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(60% 90% at 88% 0%, rgba(251,191,36,.22), transparent 60%), radial-gradient(45% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
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
				<div className='relative mx-auto max-w-6xl px-4 pb-28 pt-12 sm:px-6 sm:pb-32 sm:pt-16'>
					<h1 className='mo-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>My orders</h1>
					<p className='mt-4 max-w-xl text-base text-stone-300 sm:text-lg'>Every basket you’ve checked out, with its status and total, in one place.</p>
				</div>
			</header>

			<div className='relative z-10 mx-auto -mt-16 max-w-6xl px-4 pb-20 sm:-mt-20 sm:px-6'>{content}</div>
		</main>
	);
};

export default MyOrders;
