import { useUser, useAuth } from '@clerk/react';
import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaBan, FaBoxOpen, FaBuilding, FaCheck, FaCheckCircle, FaCreditCard, FaHome, FaMailBulk, FaMapMarkerAlt, FaMoneyBillWave, FaPhoneAlt, FaReceipt, FaRegCalendarAlt, FaRegCopy, FaShippingFast, FaTimes, FaTruck } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserOrder } from '../services/ordersService';

import OrderTracking from '../components/orders/OrderTracking';
import CheckoutProgress from '../components/CheckoutProgress';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const CURRENCY = '$'; // unchanged from the original page

const toNumber = (value) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};
const money = (value) => `${CURRENCY}${toNumber(value).toFixed(2)}`;

const formatDate = (value) => {
	if (!value) return 'Date unavailable';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

// Only returns a stamp when the order really has a valid date.
const formatStamp = (value) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const normalizeStatus = (status) =>
	String(status || 'pending')
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_');

/* -------------------------------------------------------------------------- */
/*  Journey stages                                                            */
/*                                                                            */
/*  Purely visual. STATUS_TO_STAGE maps the status your order already has to  */
/*  a stage — nothing is added to the data. Edit the keys if your backend     */
/*  uses different status strings. Unknown statuses show NO progress.         */
/* -------------------------------------------------------------------------- */

const STAGES = [
	{ key: 'placed', label: 'Order placed', icon: FaReceipt, note: 'Waiting for confirmation', hero: ['Order placed', 'We’ve received your order and will confirm it soon.'] },
	{ key: 'confirmed', label: 'Confirmed', icon: FaCheck, note: 'Your order is confirmed', hero: ['Order confirmed', 'Your order is confirmed and getting ready.'] },
	{ key: 'processing', label: 'Processing', icon: FaBoxOpen, note: 'Your items are being packed', hero: ['We’re preparing your order', 'Your items are being picked and packed.'] },
	{ key: 'shipped', label: 'Shipped', icon: FaTruck, note: 'Your order is on its way', hero: ['Your order is on its way', 'It has left us and is heading to you.'] },
	{ key: 'out_for_delivery', label: 'Out for delivery', icon: FaShippingFast, note: 'Almost at your door', hero: ['Almost there', 'Your order is out for delivery.'] },
	{ key: 'delivered', label: 'Delivered', icon: FaHome, note: 'Your order has arrived', hero: ['Delivered', 'Your order has arrived. We hope you love it.'] },
];

const STATUS_TO_STAGE = {
	pending: 0,
	placed: 0,
	confirmed: 1,
	processing: 2,
	shipped: 3,
	out_for_delivery: 4,
	delivered: 5,
	completed: 5,
};

const ROUTE_PCT = [0, 8, 20, 55, 85, 100];
const LAST_STAGE = STAGES.length - 1;

const BADGE = {
	amber: 'bg-amber-50 text-amber-800 ring-amber-200',
	sky: 'bg-sky-50 text-sky-800 ring-sky-200',
	violet: 'bg-violet-50 text-violet-800 ring-violet-200',
	emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
	rose: 'bg-rose-50 text-rose-800 ring-rose-200',
	stone: 'bg-stone-100 text-stone-700 ring-stone-200',
};
const STATUS_BADGE = { pending: BADGE.amber, placed: BADGE.amber, confirmed: BADGE.sky, processing: BADGE.sky, shipped: BADGE.violet, out_for_delivery: BADGE.violet, delivered: BADGE.emerald, completed: BADGE.emerald, cancelled: BADGE.rose, canceled: BADGE.rose };

const StatusBadge = ({ status, live }) => (
	<span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS_BADGE[normalizeStatus(status)] || BADGE.stone}`}>
		<span className='relative flex h-2 w-2'>
			{live && <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60' />}
			<span className='relative inline-flex h-2 w-2 rounded-full bg-current' />
		</span>
		{status || 'Pending'}
	</span>
);

const getHero = (order, current, isCancelled) => {
	if (isCancelled) return { tone: 'cancelled', Icon: FaBan, title: 'Order cancelled', text: 'Your order has been cancelled.' };
	if (current < 0) return { tone: 'active', Icon: FaReceipt, title: 'Order update', text: `Current status: ${order.status}` };
	const stage = STAGES[current];
	return {
		tone: current === LAST_STAGE ? 'delivered' : 'active',
		Icon: current <= 1 ? FaCheckCircle : stage.icon,
		title: stage.hero[0],
		text: stage.hero[1],
	};
};

const TONE_GLOW = {
	active: 'rgba(251,191,36,.24)',
	delivered: 'rgba(16,185,129,.26)',
	cancelled: 'rgba(244,63,94,.24)',
};

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

const CopyButton = ({ value }) => {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(String(value));
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			/* clipboard unavailable – ignore */
		}
	};

	return (
		<button
			type='button'
			onClick={copy}
			aria-live='polite'
			className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-stone-100 ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400'>
			{copied ? <FaCheck className='text-amber-300' /> : <FaRegCopy />}
			{copied ? 'Copied' : 'Copy'}
		</button>
	);
};

const ProductImage = ({ product, title }) => {
	const [failed, setFailed] = useState(false);
	const src = product.thumbnail || product.image || product.images?.[0];

	if (!src || failed) {
		return (
			<FaBoxOpen
				className='h-1/3 w-1/3 text-stone-400'
				aria-label={title}
			/>
		);
	}
	return (
		<img
			src={src}
			alt={title}
			loading='lazy'
			onError={() => setFailed(true)}
			className='oc-thumb max-h-full max-w-full object-contain'
			style={{ filter: 'drop-shadow(0 8px 6px rgba(28,25,23,.25))' }}
		/>
	);
};

const StageNode = ({ stage, state, index, size = 'lg' }) => {
	const Icon = stage.icon;
	const dims = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-base';
	const look =
		state === 'done' ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30' : state === 'current' ? 'bg-stone-900 text-amber-300 shadow-xl shadow-stone-900/30 ring-4 ring-amber-400/40' : 'border-2 border-dashed border-stone-300 bg-white text-stone-400';

	return (
		<span
			className={`oc-node relative z-10 inline-flex shrink-0 items-center justify-center rounded-full transition-all duration-700 ${dims} ${look}`}
			style={{ '--i': index }}>
			{state === 'current' && <span className='oc-pulse absolute inset-0 rounded-full border-2 border-amber-400' />}
			<Icon aria-hidden='true' />
			{state === 'done' && (
				<span className='absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[9px] text-amber-300 ring-2 ring-white'>
					<FaCheck aria-hidden='true' />
				</span>
			)}
		</span>
	);
};

const DASH_H = 'repeating-linear-gradient(90deg,#d6d3d1 0 6px,transparent 6px 12px)';
const DASH_V = 'repeating-linear-gradient(180deg,#d6d3d1 0 6px,transparent 6px 12px)';

/* -------------------------------------------------------------------------- */
/*  Order journey — the centrepiece                                           */
/* -------------------------------------------------------------------------- */

const Journey = ({ order, current }) => {
	const isDelivered = current === LAST_STAGE;
	const stateOf = (i) => (i < current || (i === current && isDelivered) ? 'done' : i === current ? 'current' : 'upcoming');
	const pct = current < 0 ? 0 : (current / LAST_STAGE) * 100;
	const placedAt = formatStamp(order.createdAt);
	const subFor = (i) => (i === 0 ? placedAt : null);
	const CurrentIcon = current >= 0 ? STAGES[current].icon : FaReceipt;

	return (
		<section
			aria-label='Order journey'
			className='relative overflow-hidden rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)] sm:p-8'>
			<div
				className='pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full'
				style={{ background: `radial-gradient(circle, ${isDelivered ? 'rgba(16,185,129,.16)' : 'rgba(251,191,36,.2)'}, transparent 70%)` }}
			/>

			<div className='relative flex flex-wrap items-center justify-between gap-3'>
				<h2 className='oc-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl'>Order journey</h2>
				<span className='inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600'>
					<span className='relative flex h-2 w-2'>
						<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60' />
						<span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-500' />
					</span>
					Live · refreshes every 15 seconds
				</span>
			</div>

			{/* Current stage callout */}
			<div className={`relative mt-6 flex items-center gap-4 rounded-2xl p-4 sm:p-5 ${isDelivered ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-stone-900 text-white'}`}>
				<span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg ${isDelivered ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-stone-950'}`}>
					<CurrentIcon aria-hidden='true' />
				</span>
				<div className='min-w-0'>
					<p className={`text-xs font-medium ${isDelivered ? 'text-emerald-700' : 'text-stone-400'}`}>{isDelivered ? 'Completed' : current >= 0 ? 'Current stage' : 'Current status'}</p>
					<p className={`oc-display text-lg font-bold capitalize sm:text-xl ${isDelivered ? 'text-emerald-900' : ''}`}>{current >= 0 ? STAGES[current].label : order.status}</p>
					<p className={`text-sm ${isDelivered ? 'text-emerald-800' : 'text-stone-300'}`}>{current >= 0 ? STAGES[current].note : 'This status isn’t part of the standard delivery journey.'}</p>
				</div>
			</div>

			{/* Desktop / tablet: horizontal journey */}
			<div className='relative mt-10 hidden md:block'>
				<div
					className='absolute left-[8.333%] right-[8.333%] top-7 h-[3px] -translate-y-1/2 overflow-hidden rounded-full'
					style={{ backgroundImage: DASH_H }}>
					<div
						className='oc-fill relative h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-1000'
						style={{ width: `${pct}%` }}>
						{isDelivered && <span className='oc-sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent' />}
					</div>
				</div>

				<ol className='relative grid grid-cols-6'>
					{STAGES.map((stage, i) => {
						const state = stateOf(i);
						const sub = subFor(i);
						return (
							<li
								key={stage.key}
								aria-current={state === 'current' ? 'step' : undefined}
								className='flex flex-col items-center px-1 text-center'>
								<StageNode
									stage={stage}
									state={state}
									index={i}
								/>
								<p className={`mt-4 text-sm font-semibold ${state === 'upcoming' ? 'text-stone-400' : 'text-stone-900'}`}>{stage.label}</p>
								{sub && <p className='mt-1 text-xs text-stone-500'>{sub}</p>}
								{state === 'current' && <span className='mt-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800'>Now</span>}
							</li>
						);
					})}
				</ol>
			</div>

			{/* Mobile: vertical journey */}
			<ol className='relative mt-8 md:hidden'>
				{STAGES.map((stage, i) => {
					const state = stateOf(i);
					const sub = subFor(i);
					return (
						<li
							key={stage.key}
							aria-current={state === 'current' ? 'step' : undefined}
							className='relative flex gap-4 pb-8 last:pb-0'>
							{i < LAST_STAGE && (
								<span
									aria-hidden='true'
									className={`absolute left-[22px] top-11 h-[calc(100%-2.75rem)] w-[3px] -translate-x-1/2 rounded-full transition-colors duration-700 ${state === 'done' ? 'bg-gradient-to-b from-amber-300 to-amber-500' : ''}`}
									style={state === 'done' ? undefined : { backgroundImage: DASH_V }}
								/>
							)}
							<StageNode
								stage={stage}
								state={state}
								index={i}
								size='sm'
							/>
							<div className='min-w-0 pt-1.5'>
								<p className={`text-sm font-semibold ${state === 'upcoming' ? 'text-stone-400' : 'text-stone-900'}`}>
									{stage.label}
									{state === 'current' && <span className='ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800'>Now</span>}
								</p>
								{sub && <p className='mt-0.5 text-xs text-stone-500'>{sub}</p>}
							</div>
						</li>
					);
				})}
			</ol>
		</section>
	);
};

/* Cancelled orders get their own state — no delivery progress at all */
const CancelledJourney = ({ order }) => {
	const placedAt = formatStamp(order.createdAt);

	return (
		<section
			aria-label='Order journey'
			className='relative overflow-hidden rounded-[28px] border border-rose-200 bg-white p-6 shadow-[0_30px_60px_-30px_rgba(190,18,60,.45)] sm:p-8'
			style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(244,63,94,.045) 0 10px, transparent 10px 20px)' }}>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<h2 className='oc-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl'>Order journey</h2>
				<span className='rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200'>Stopped</span>
			</div>

			<div className='mx-auto mt-10 grid max-w-xl grid-cols-[auto_1fr_auto] items-start gap-x-4'>
				<div className='flex flex-col items-center text-center'>
					<StageNode
						stage={STAGES[0]}
						state='done'
						index={0}
					/>
					<p className='mt-3 text-sm font-semibold text-stone-900'>Order placed</p>
					{placedAt && <p className='mt-1 max-w-[9rem] text-xs text-stone-500'>{placedAt}</p>}
				</div>
				<div
					className='mt-7 h-[3px] -translate-y-1/2 rounded-full'
					style={{ backgroundImage: 'repeating-linear-gradient(90deg,#fda4af 0 6px,transparent 6px 12px)' }}
				/>
				<div className='flex flex-col items-center text-center'>
					<span
						className='oc-node relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-lg text-white shadow-lg shadow-rose-600/30 ring-4 ring-rose-200'
						style={{ '--i': 1 }}>
						<FaTimes aria-hidden='true' />
					</span>
					<p className='mt-3 text-sm font-semibold text-rose-800'>Cancelled</p>
				</div>
			</div>

			<p className='mt-8 rounded-2xl bg-rose-50 p-4 text-center text-sm text-rose-900 ring-1 ring-rose-200'>This order was cancelled, so there’s no delivery to follow. Your order details are kept below for reference.</p>
		</section>
	);
};

/* -------------------------------------------------------------------------- */
/*  Summary, products, delivery                                               */
/* -------------------------------------------------------------------------- */

const SummaryRow = ({ label, children }) => (
	<div className='flex items-center justify-between gap-4 border-b border-white/10 py-3 text-sm'>
		<span className='text-stone-400'>{label}</span>
		<span className='min-w-0 text-right font-medium text-white'>{children}</span>
	</div>
);

const SummaryCard = ({ order, orderLabel, totalPrice, live }) => {
	const PayIcon = order.paymentMethod === 'cod' ? FaMoneyBillWave : FaCreditCard;
	const payment = order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'dc' ? 'Debit Card' : order.paymentMethod || 'N/A';

	return (
		<section
			aria-label='Order summary'
			className='relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.8)] sm:p-7'
			style={{ background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)' }}>
			<div
				className='pointer-events-none absolute inset-0 opacity-70'
				style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
			/>
			<div
				className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full'
				style={{ background: 'radial-gradient(circle, rgba(251,191,36,.28), transparent 70%)' }}
			/>
			<div className='relative'>
				<h2 className='oc-display text-lg font-bold'>Order summary</h2>
				<div className='mt-3 border-t border-white/10'>
					<SummaryRow label='Order number'>#{orderLabel}</SummaryRow>
					<SummaryRow label='Order date'>
						<span className='inline-flex items-center gap-2'>
							<FaRegCalendarAlt
								className='text-amber-400'
								aria-hidden='true'
							/>
							{formatDate(order.createdAt)}
						</span>
					</SummaryRow>
					<SummaryRow label='Payment'>
						<span className='inline-flex items-center gap-2'>
							<PayIcon
								className='text-amber-400'
								aria-hidden='true'
							/>
							{payment}
						</span>
					</SummaryRow>
					<SummaryRow label='Status'>
						<StatusBadge
							status={order.status}
							live={live}
						/>
					</SummaryRow>
				</div>
				<div className='mt-6 border-t border-dashed border-white/20 pt-5'>
					<p className='text-xs font-medium text-stone-400'>Total</p>
					<p className='oc-display mt-1 text-4xl font-bold tracking-tight text-amber-300'>{money(totalPrice)}</p>
				</div>
			</div>
		</section>
	);
};

const DeliveryRow = ({ icon, label, value }) => (
	<div className='flex items-start gap-3'>
		<span className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-sm text-stone-600'>{icon}</span>
		<div className='min-w-0'>
			<p className='text-xs font-medium text-stone-400'>{label}</p>
			<p className='break-words text-sm font-medium text-stone-800'>{value}</p>
		</div>
	</div>
);

const DeliveryCard = ({ order, customerName, customerEmail, customerImage, current, isCancelled }) => {
	const shipping = order.shippingInformation;
	const pct = current >= 0 ? ROUTE_PCT[current] : 0;
	const delivered = current === LAST_STAGE;
	const showTruck = current === 3 || current === 4;

	return (
		<section
			aria-label='Delivery information'
			className='rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] sm:p-7'>
			<h2 className='oc-display text-lg font-bold text-stone-900'>Delivery</h2>

			<div className='mt-4 flex items-center gap-3'>
				{customerImage ? (
					<img
						src={customerImage}
						alt=''
						loading='lazy'
						className='h-12 w-12 rounded-full border border-stone-200 object-cover'
					/>
				) : (
					<span className='flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 font-bold text-amber-300'>{customerName.charAt(0).toUpperCase()}</span>
				)}
				<div className='min-w-0'>
					<p className='truncate font-semibold text-stone-900'>{customerName}</p>
					{customerEmail && <p className='truncate text-sm text-stone-500'>{customerEmail}</p>}
				</div>
			</div>

			{/* Route — mirrors the journey stage above, nothing more */}
			<div className='mt-6 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200'>
				{isCancelled ? (
					<p className='text-sm text-stone-500'>No delivery for a cancelled order.</p>
				) : (
					<>
						<div className='flex items-center gap-3'>
							<span className='h-3 w-3 shrink-0 rounded-full bg-stone-900' />
							<div
								className='relative h-[3px] flex-1 rounded-full'
								style={{ backgroundImage: DASH_H }}>
								<div
									className='h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-1000'
									style={{ width: `${pct}%` }}
								/>
								{showTruck && (
									<span
										className='absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-stone-900 text-xs text-amber-300 ring-2 ring-white transition-[left] duration-1000'
										style={{ left: `${pct}%` }}>
										<FaTruck aria-hidden='true' />
									</span>
								)}
							</div>
							<FaMapMarkerAlt
								className={`shrink-0 text-lg ${delivered ? 'text-emerald-600' : 'text-stone-400'}`}
								aria-hidden='true'
							/>
						</div>
						<div className='mt-2 flex justify-between text-xs text-stone-500'>
							<span>Al-Haidara</span>
							<span>{current >= 0 ? STAGES[current].label : 'Status pending'}</span>
							<span>You</span>
						</div>
					</>
				)}
			</div>

			<div className='mt-6 space-y-4'>
				<DeliveryRow
					icon={<FaMapMarkerAlt />}
					label='Address'
					value={shipping?.address || 'N/A'}
				/>
				<div className='grid grid-cols-2 gap-4'>
					<DeliveryRow
						icon={<FaBuilding />}
						label='City'
						value={shipping?.city || 'N/A'}
					/>
					<DeliveryRow
						icon={<FaMailBulk />}
						label='ZIP code'
						value={shipping?.zip || 'N/A'}
					/>
				</div>
				<DeliveryRow
					icon={<FaPhoneAlt />}
					label='Phone number'
					value={shipping?.phone || 'N/A'}
				/>
			</div>
		</section>
	);
};

const ProductsCard = ({ products }) => {
	const itemCount = products.reduce((total, product) => total + toNumber(product?.quantity), 0);

	return (
		<section
			aria-label='Products'
			className='rounded-[28px] border border-stone-200 bg-white p-4 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] sm:p-7'>
			<div className='flex items-baseline justify-between gap-4 px-2 sm:px-0'>
				<h2 className='oc-display text-xl font-bold tracking-tight text-stone-900'>Your items</h2>
				<p className='text-sm text-stone-500'>
					{itemCount} {itemCount === 1 ? 'item' : 'items'}
				</p>
			</div>

			<div className='mt-4 divide-y divide-stone-100'>
				{products.map((product, index) => {
					const quantity = toNumber(product.quantity);
					const price = toNumber(product.price);
					const subtotal = toNumber(product.subtotal ?? price * quantity);
					const title = product.title || 'Product';

					return (
						<div
							key={product.productId || product.id || index}
							className='oc-item flex gap-4 rounded-2xl p-2 transition-colors hover:bg-stone-50 sm:gap-5 sm:p-3'>
							<div className='flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 p-2.5 ring-1 ring-stone-200/80 sm:h-28 sm:w-28'>
								<ProductImage
									product={product}
									title={title}
								/>
							</div>

							<div className='flex min-w-0 flex-1 flex-col justify-between'>
								<p className='break-words font-semibold leading-snug text-stone-900'>{title}</p>
								<div className='mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2'>
									<div className='flex flex-wrap items-center gap-2 text-sm'>
										<span className='rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white'>Qty {quantity}</span>
										<span className='text-stone-500'>{money(price)} each</span>
									</div>
									<div className='text-right'>
										<p className='text-xs text-stone-400'>Subtotal</p>
										<p className='oc-display text-lg font-bold text-stone-900'>{money(subtotal)}</p>
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
};

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.oc-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes oc-grow { from { transform: scaleX(0); } }
@keyframes oc-pulse { 0% { transform: scale(1); opacity: .75; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes oc-pop { 0% { opacity: 0; transform: scale(.5); } 70% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
@keyframes oc-sheen { from { transform: translateX(-120%); } to { transform: translateX(320%); } }

/* The journey builds itself once on load: line fills, nodes pop in order */
.oc-fill { transform-origin: left; animation: oc-grow 1.3s cubic-bezier(.2,.8,.2,1) .25s backwards; }
.oc-node { animation: oc-pop .6s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 140ms + 100ms); }
.oc-pulse { animation: oc-pulse 2.2s ease-out infinite; }
.oc-sheen { animation: oc-sheen 2.4s ease-in-out 1.6s 1 both; }
.oc-ring { animation: oc-pulse 2.8s ease-out infinite; }

.oc-item .oc-thumb { transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.oc-item:hover .oc-thumb { transform: translateY(-4px) rotate(-3deg) scale(1.06); }

.oc-btn { position: relative; overflow: hidden; isolation: isolate; transition: color .3s ease, transform .15s ease; }
.oc-btn::before {
	content: ''; position: absolute; inset: 0; z-index: -1;
	background: linear-gradient(90deg, #fcd34d, #f59e0b);
	transform: translateX(-101%);
	transition: transform .45s cubic-bezier(.2,.8,.2,1);
}
.oc-btn:hover, .oc-btn:focus-visible { color: #1c1917; }
.oc-btn:hover::before, .oc-btn:focus-visible::before { transform: none; }

@media (prefers-reduced-motion: reduce) {
	.oc-fill, .oc-node, .oc-pulse, .oc-sheen, .oc-ring { animation: none; }
	.oc-item .oc-thumb, .oc-btn, .oc-btn::before { transition: none; }
	.oc-item:hover .oc-thumb { transform: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const OrderConfirm = () => {
	const { orderId } = useParams();
	const { user } = useUser();
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const navigate = useNavigate();

	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const handleOrderUpdated = (updatedOrder) => {
		setOrder(updatedOrder);
	};

	useEffect(() => {
		if (!isLoaded) return;

		if (!isSignedIn) {
			setError('Please sign in to view this order.');
			setLoading(false);
			return;
		}

		let cancelled = false;

		const loadOrder = async () => {
			try {
				setLoading(true);
				setError('');

				const savedOrder = await getUserOrder(orderId, getToken);

				if (!cancelled) {
					setOrder(savedOrder);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err.message || 'Could not load this order.');
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		};

		loadOrder();

		return () => {
			cancelled = true;
		};
	}, [orderId, getToken, isLoaded, isSignedIn]);

	useEffect(() => {
		if (!isLoaded || !isSignedIn || !orderId) return;

		const interval = setInterval(async () => {
			try {
				const latestOrder = await getUserOrder(orderId, getToken);
				setOrder(latestOrder);
			} catch (error) {
				console.error('Order status refresh failed:', error);
			}
		}, 15000);

		return () => clearInterval(interval);
	}, [orderId, getToken, isLoaded, isSignedIn]);

	if (!isLoaded || loading) {
		return (
			<main className='min-h-screen bg-stone-100'>
				<style>{STYLES}</style>
				<div className='h-64 bg-stone-950' />
				<div className='mx-auto -mt-24 max-w-6xl px-4 sm:px-6'>
					<div
						role='status'
						className='animate-pulse rounded-[28px] border border-stone-200 bg-white p-8'>
						<div className='h-6 w-48 rounded-full bg-stone-200' />
						<div className='mt-8 h-24 rounded-2xl bg-stone-100' />
						<p className='mt-6 text-center text-lg text-stone-600'>Loading order...</p>
					</div>
				</div>
			</main>
		);
	}

	if (error || !order) {
		return (
			<main className='flex min-h-screen items-center justify-center bg-stone-100 px-4'>
				<style>{STYLES}</style>
				<div
					role='alert'
					className='w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-[0_24px_48px_-28px_rgba(190,18,60,.35)]'>
					<span className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-xl text-rose-500 ring-8 ring-rose-50/60'>
						<FaBan aria-hidden='true' />
					</span>
					<p className='mt-5 text-lg text-rose-700'>{error || 'Order not found.'}</p>
					<div className='mt-7 flex flex-wrap justify-center gap-3'>
						<button
							type='button'
							onClick={() => navigate('/')}
							className='oc-btn rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'>
							Back to Home
						</button>
						<button
							type='button'
							onClick={() => navigate('/my-orders')}
							className='rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50'>
							My Orders
						</button>
					</div>
				</div>
			</main>
		);
	}

	const customerName = order.customer?.name || user?.fullName || 'Customer';

	const customerEmail = order.customer?.email || user?.primaryEmailAddress?.emailAddress || '';

	const customerImage = user?.imageUrl || '';

	const totalPrice = Number(order.totalPrice ?? 0);

	const products = Array.isArray(order.products) ? order.products : [];
	const orderLabel = order.orderNumber || order.orderId;
	const statusKey = normalizeStatus(order.status);
	const isCancelled = statusKey === 'cancelled' || statusKey === 'canceled';
	const current = isCancelled ? -1 : (STATUS_TO_STAGE[statusKey] ?? -1);
	const hero = getHero(order, current, isCancelled);
	const HeroIcon = hero.Icon;
	const live = !isCancelled && current >= 0 && current < LAST_STAGE;

	return (
		<main className='min-h-screen bg-stone-100'>
			<style>{STYLES}</style>

			{/* Hero */}
			<header className='relative overflow-hidden bg-stone-950 text-white'>
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: `radial-gradient(60% 90% at 90% 0%, ${TONE_GLOW[hero.tone]}, transparent 60%), radial-gradient(45% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)` }}
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
				<div className='relative mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 sm:pb-36 sm:pt-10'>
					<button
						type='button'
						onClick={() => navigate('/my-orders')}
						className='inline-flex items-center gap-2 text-sm text-stone-300 transition hover:text-white'>
						<FaArrowLeft aria-hidden='true' /> My orders
					</button>

					<div className='mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8'>
						<div className='relative h-20 w-20 shrink-0 sm:h-24 sm:w-24'>
							{hero.tone === 'active' && <span className='oc-ring absolute inset-0 rounded-[28px] border-2 border-amber-400/70' />}
							<span
								className={`relative flex h-full w-full items-center justify-center rounded-[28px] text-3xl shadow-2xl sm:text-4xl ${hero.tone === 'cancelled' ? 'bg-rose-600 text-white shadow-rose-900/40' : hero.tone === 'delivered' ? 'bg-emerald-500 text-white shadow-emerald-900/40' : 'bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950 shadow-amber-900/40'}`}>
								<HeroIcon aria-hidden='true' />
							</span>
						</div>

						<div className='min-w-0'>
							<h1 className='oc-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>{hero.title}</h1>
							<p className='mt-3 max-w-xl text-base text-stone-300 sm:text-lg'>{hero.text}</p>

							<div className='mt-5 inline-flex max-w-full flex-wrap items-center gap-3 rounded-full bg-white/5 py-1.5 pl-5 pr-1.5 ring-1 ring-white/15'>
								<span className='text-sm text-stone-400'>Order</span>
								<span className='oc-display break-all text-lg font-bold'>#{orderLabel}</span>
								<CopyButton value={orderLabel} />
							</div>
						</div>
					</div>

					<CheckoutProgress
						current='confirmation'
						className='mt-10'
					/>
				</div>
			</header>

			<div className='relative z-10 mx-auto -mt-24 max-w-6xl space-y-6 px-4 pb-20 sm:-mt-28 sm:space-y-8 sm:px-6'>
				{isCancelled ? (
					<CancelledJourney order={order} />
				) : (
					<Journey
						order={order}
						current={current}
					/>
				)}

				{/* Existing tracking component — props and callbacks unchanged */}
				<section
					aria-label='Tracking details'
					className='rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] sm:p-7'>
					<h2 className='oc-display mb-4 text-lg font-bold text-stone-900'>Tracking details</h2>
					<OrderTracking
						order={order}
						getToken={getToken}
						onOrderUpdated={handleOrderUpdated}
					/>
				</section>

				<div className='grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start'>
					<aside className='order-first space-y-6 lg:sticky lg:top-6 lg:order-last sm:space-y-8'>
						<SummaryCard
							order={order}
							orderLabel={orderLabel}
							totalPrice={totalPrice}
							live={live}
						/>
						<DeliveryCard
							order={order}
							customerName={customerName}
							customerEmail={customerEmail}
							customerImage={customerImage}
							current={current}
							isCancelled={isCancelled}
						/>
					</aside>
					<ProductsCard products={products} />
				</div>

				{/* Actions */}
				<div className='flex flex-wrap justify-end gap-3'>
					<button
						type='button'
						onClick={() => navigate('/my-orders')}
						className='rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'>
						My Orders
					</button>
					<button
						type='button'
						onClick={() => navigate('/')}
						className='oc-btn rounded-full bg-stone-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[.98]'>
						Continue Shopping
					</button>
				</div>
			</div>
		</main>
	);
};

export default OrderConfirm;
