import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';
import { Link } from 'react-router';
import {
	Crown,
	ChevronRight,
	DollarSign,
	PackageCheck,
	ShoppingBag,
	TrendingUp,
	Search,
	RefreshCw,
	CalendarDays,
	ArrowUpDown,
	Clock,
	CheckCircle2,
	AlertCircle,
	ArrowLeft,
	CreditCard,
	Layers,
} from 'lucide-react';

import { getOwnerDeliveredRevenue } from '../services/ownerOrderService';

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.oc-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes oc-pulse { 0% { transform: scale(1); opacity: .75; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes oc-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.oc-ring { animation: oc-pulse 2.8s ease-out infinite; }
.oc-rise { animation: oc-rise .7s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 90ms + 80ms); }

@media (prefers-reduced-motion: reduce) {
	.oc-ring, .oc-rise { animation: none; }
	.oc-card { transition: none !important; }
}
`;

const formatPrice = (price) => {
	return `$${Number(price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getOrderDate = (date) => {
	if (!date) return null;

	if (typeof date.toDate === 'function') {
		return date.toDate();
	}

	if (typeof date === 'object' && date.seconds) {
		return new Date(date.seconds * 1000);
	}

	const parsed = new Date(date);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (date) => {
	const parsed = getOrderDate(date);
	if (!parsed) return '—';

	return parsed.toLocaleDateString('en-US', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
};

const getCustomerInitials = (name) => {
	if (!name || name === 'Unknown Customer') return 'U';

	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase();
};

export default function OwnerDeliveredRevenue() {
	const { getToken, isLoaded, isSignedIn } = useAuth();

	const [orders, setOrders] = useState([]);
	const [serverRevenue, setServerRevenue] = useState(0);
	const [serverCount, setServerCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Filters and sorting
	const [search, setSearch] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest
	const [selectedOrder, setSelectedOrder] = useState(null);

	const loadRevenueData = useCallback(async () => {
		if (!isLoaded) return;

		if (!isSignedIn) {
			setOrders([]);
			setError('Please sign in first.');
			setLoading(false);
			return;
		}

		setLoading(true);
		setError('');

		try {
			const data = await getOwnerDeliveredRevenue(getToken);
			const deliveredOrders = Array.isArray(data.orders) ? data.orders : [];

			// Strict front-end verification: ensure ONLY delivered orders are kept
			const verifiedOrders = deliveredOrders.filter(
				(order) => (order.status || '').toLowerCase().trim() === 'delivered'
			);

			setOrders(verifiedOrders);
			setServerRevenue(typeof data.totalDeliveredRevenue === 'number' ? data.totalDeliveredRevenue : 0);
			setServerCount(typeof data.totalDeliveredOrders === 'number' ? data.totalDeliveredOrders : verifiedOrders.length);
		} catch (err) {
			setError(err.message || 'Could not load delivered orders revenue.');
		} finally {
			setLoading(false);
		}
	}, [getToken, isLoaded, isSignedIn]);

	useEffect(() => {
		loadRevenueData();
	}, [loadRevenueData]);

	// Filter and sort delivered orders
	const filteredOrders = useMemo(() => {
		let result = orders.filter((order) => {
			const searchValue = search.trim().toLowerCase();
			const customerName = order.customer?.name || '';
			const customerEmail = order.customer?.email || '';
			const orderNum = order.orderNumber || '';
			const orderId = order.orderId || '';

			const matchesSearch =
				!searchValue ||
				customerName.toLowerCase().includes(searchValue) ||
				customerEmail.toLowerCase().includes(searchValue) ||
				orderNum.toLowerCase().includes(searchValue) ||
				orderId.toLowerCase().includes(searchValue);

			if (!matchesSearch) return false;

			const orderDate = getOrderDate(order.createdAt);
			if (dateFrom && orderDate) {
				const fromDate = new Date(dateFrom);
				fromDate.setHours(0, 0, 0, 0);
				if (orderDate < fromDate) return false;
			}

			if (dateTo && orderDate) {
				const toDate = new Date(dateTo);
				toDate.setHours(23, 59, 59, 999);
				if (orderDate > toDate) return false;
			}

			return true;
		});

		result.sort((a, b) => {
			if (sortBy === 'highest') {
				return Number(b.totalPrice || 0) - Number(a.totalPrice || 0);
			}
			if (sortBy === 'lowest') {
				return Number(a.totalPrice || 0) - Number(b.totalPrice || 0);
			}
			const dateA = getOrderDate(a.createdAt)?.getTime() || 0;
			const dateB = getOrderDate(b.createdAt)?.getTime() || 0;
			if (sortBy === 'oldest') {
				return dateA - dateB;
			}
			return dateB - dateA; // newest
		});

		return result;
	}, [orders, search, dateFrom, dateTo, sortBy]);

	// Calculate client-side totals (safety check against double-counting and verification)
	const stats = useMemo(() => {
		const seen = new Set();
		let totalRevenue = 0;
		let validOrderCount = 0;

		orders.forEach((order) => {
			const id = order.orderId || order.orderNumber;
			if (!id || seen.has(id)) return;
			seen.add(id);

			const price = Number(order.totalPrice || 0);
			if (Number.isFinite(price) && price >= 0) {
				totalRevenue += price;
				validOrderCount += 1;
			}
		});

		// Prefer server's authoritative revenue if calculated
		const finalRevenue = serverRevenue > 0 ? serverRevenue : totalRevenue;
		const finalCount = serverCount > 0 ? serverCount : validOrderCount;
		const averageValue = finalCount > 0 ? finalRevenue / finalCount : 0;

		return {
			totalDeliveredRevenue: finalRevenue,
			totalDeliveredOrders: finalCount,
			averageDeliveredOrderValue: averageValue,
		};
	}, [orders, serverRevenue, serverCount]);

	return (
		<section className='min-h-[80vh] bg-stone-100'>
			<style>{STYLES}</style>

			{/* Hero / Header Section matching Owner Dashboard */}
			<header className='relative overflow-hidden bg-stone-950 text-white'>
				<div
					className='pointer-events-none absolute inset-0'
					style={{
						background:
							'radial-gradient(60% 90% at 90% 0%, rgba(251,191,36,.24), transparent 60%), radial-gradient(45% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)',
					}}
				/>
				<div
					className='pointer-events-none absolute inset-0 opacity-[.06]'
					style={{
						backgroundImage:
							'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
						backgroundSize: '44px 44px',
					}}
				/>

				<div className='relative mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-10'>
					{/* Breadcrumb */}
					<nav
						aria-label='Breadcrumb'
						className='flex items-center gap-2 text-xs font-medium text-stone-400'>
						<Link
							to='/owner'
							className='flex items-center gap-1.5 transition hover:text-white'>
							<Crown
								size={15}
								aria-hidden='true'
								className='text-amber-400'
							/>
							<span>Owner Dashboard</span>
						</Link>
						<ChevronRight
							size={13}
							aria-hidden='true'
						/>
						<span
							aria-current='page'
							className='font-semibold text-stone-100'>
							Delivered Orders Revenue
						</span>
					</nav>

					<div className='mt-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
						<div>
							<p className='mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 ring-1 ring-white/15'>
								<Crown
									size={13}
									aria-hidden='true'
									className='text-amber-400'
								/>
								Owner Financial Statistics
							</p>

							<h1 className='oc-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl'>
								Delivered Orders Revenue
								<span className='text-amber-400'>.</span>
							</h1>

							<p className='mt-3 max-w-2xl text-sm leading-relaxed text-stone-300 sm:text-base'>
								Calculated exclusively for orders with <strong className='text-amber-300'>delivered</strong> status.
								Excludes pending, processing, shipped, and cancelled orders.
							</p>
						</div>

						<div className='flex items-center gap-3'>
							<Link
								to='/owner'
								className='inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-stone-200 backdrop-blur-sm transition hover:bg-white/10'>
								<ArrowLeft size={15} />
								Back to Dashboard
							</Link>

							<button
								type='button'
								onClick={loadRevenueData}
								disabled={loading}
								className='inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-stone-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:opacity-60'>
								<RefreshCw
									size={14}
									className={loading ? 'animate-spin' : ''}
								/>
								Refresh Stats
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<div className='relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-16 sm:-mt-12 sm:px-6 lg:px-10'>
				{/* Error State */}
				{error && (
					<div className='mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 shadow-sm'>
						<div className='flex items-center gap-3'>
							<AlertCircle
								size={20}
								className='shrink-0 text-red-600'
							/>
							<span>{error}</span>
						</div>
						<button
							type='button'
							onClick={loadRevenueData}
							className='rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-900 hover:bg-red-200'>
							Try Again
						</button>
					</div>
				)}

				{/* Top Stat Cards */}
				<div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
					{/* Stat 1: Total Delivered Revenue */}
					<div
						className='oc-rise relative overflow-hidden rounded-[26px] border border-stone-200 bg-white p-6 shadow-[0_16px_36px_-24px_rgba(28,25,23,.3)]'
						style={{ '--i': 1 }}>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-bold tracking-[0.18em] text-stone-400 uppercase'>
								TOTAL DELIVERED REVENUE
							</span>
							<div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200'>
								<DollarSign
									size={22}
									strokeWidth={2.2}
								/>
							</div>
						</div>

						<div className='mt-4'>
							{loading ? (
								<div className='h-9 w-36 animate-pulse rounded-lg bg-stone-100' />
							) : (
								<h2 className='oc-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
									{formatPrice(stats.totalDeliveredRevenue)}
								</h2>
							)}
							<p className='mt-2 flex items-center gap-1.5 text-xs text-stone-500'>
								<span className='inline-block h-2 w-2 rounded-full bg-emerald-500' />
								Sum of all completed & delivered customer orders
							</p>
						</div>
					</div>

					{/* Stat 2: Total Delivered Orders */}
					<div
						className='oc-rise relative overflow-hidden rounded-[26px] border border-stone-200 bg-white p-6 shadow-[0_16px_36px_-24px_rgba(28,25,23,.3)]'
						style={{ '--i': 2 }}>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-bold tracking-[0.18em] text-stone-400 uppercase'>
								TOTAL DELIVERED ORDERS
							</span>
							<div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'>
								<PackageCheck
									size={22}
									strokeWidth={2}
								/>
							</div>
						</div>

						<div className='mt-4'>
							{loading ? (
								<div className='h-9 w-20 animate-pulse rounded-lg bg-stone-100' />
							) : (
								<h2 className='oc-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
									{stats.totalDeliveredOrders}
								</h2>
							)}
							<p className='mt-2 text-xs text-stone-500'>
								Orders with confirmed delivery status
							</p>
						</div>
					</div>

					{/* Stat 3: Average Order Value */}
					<div
						className='oc-rise relative overflow-hidden rounded-[26px] border border-stone-200 bg-white p-6 shadow-[0_16px_36px_-24px_rgba(28,25,23,.3)] sm:col-span-2 lg:col-span-1'
						style={{ '--i': 3 }}>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-bold tracking-[0.18em] text-stone-400 uppercase'>
								AVERAGE DELIVERED ORDER
							</span>
							<div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-amber-300 ring-1 ring-stone-900'>
								<TrendingUp
									size={22}
									strokeWidth={2}
								/>
							</div>
						</div>

						<div className='mt-4'>
							{loading ? (
								<div className='h-9 w-28 animate-pulse rounded-lg bg-stone-100' />
							) : (
								<h2 className='oc-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
									{formatPrice(stats.averageDeliveredOrderValue)}
								</h2>
							)}
							<p className='mt-2 text-xs text-stone-500'>
								Average revenue per delivered shipment
							</p>
						</div>
					</div>
				</div>

				{/* Search & Filters Card */}
				<div className='mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm'>
					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div>
							<h3 className='font-bold text-stone-900'>Delivered Orders Filter</h3>
							<p className='mt-0.5 text-xs text-stone-500'>
								Find specific delivered orders by order number, ID, customer name, or date.
							</p>
						</div>

						<span className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
							Filtered: {filteredOrders.length} of {orders.length} orders
						</span>
					</div>

					<div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
						{/* Search Input */}
						<div className='relative'>
							<Search
								size={16}
								className='absolute left-3 top-1/2 -translate-y-1/2 text-stone-400'
							/>
							<input
								type='text'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder='Search order # or customer...'
								className='h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs outline-none transition focus:border-amber-400 focus:bg-white'
							/>
						</div>

						{/* Date From */}
						<div className='relative'>
							<CalendarDays
								size={15}
								className='absolute left-3 top-1/2 -translate-y-1/2 text-stone-400'
							/>
							<input
								type='date'
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className='h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs text-stone-700 outline-none transition focus:border-amber-400 focus:bg-white'
								placeholder='From Date'
							/>
						</div>

						{/* Date To */}
						<div className='relative'>
							<CalendarDays
								size={15}
								className='absolute left-3 top-1/2 -translate-y-1/2 text-stone-400'
							/>
							<input
								type='date'
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className='h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs text-stone-700 outline-none transition focus:border-amber-400 focus:bg-white'
								placeholder='To Date'
							/>
						</div>

						{/* Sort Dropdown */}
						<div className='relative'>
							<ArrowUpDown
								size={15}
								className='absolute left-3 top-1/2 -translate-y-1/2 text-stone-400'
							/>
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								className='h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs text-stone-700 outline-none transition focus:border-amber-400 focus:bg-white'>
								<option value='newest'>Date: Newest First</option>
								<option value='oldest'>Date: Oldest First</option>
								<option value='highest'>Price: Highest First</option>
								<option value='lowest'>Price: Lowest First</option>
							</select>
						</div>
					</div>
				</div>

				{/* Orders Table Container */}
				<div className='mt-6 overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-sm'>
					{/* Header */}
					<div className='flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5 sm:px-7'>
						<div>
							<h3 className='oc-display text-lg font-bold text-stone-900'>Delivered Orders List</h3>
							<p className='mt-0.5 text-xs text-stone-500'>
								Showing verified delivered orders and associated revenue values.
							</p>
						</div>

						<div className='flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700'>
							<CheckCircle2
								size={15}
								className='text-emerald-500'
							/>
							<span>Only 'delivered' status orders displayed</span>
						</div>
					</div>

					{/* Desktop Table View */}
					<div className='hidden overflow-x-auto md:block'>
						<table className='w-full text-left text-xs'>
							<thead className='bg-stone-50 font-semibold uppercase tracking-wider text-stone-400'>
								<tr>
									<th className='px-6 py-4'>Order Info</th>
									<th className='px-6 py-4'>Customer</th>
									<th className='px-6 py-4'>Delivery Status</th>
									<th className='px-6 py-4'>Date</th>
									<th className='px-6 py-4 text-right'>Total Price</th>
									<th className='px-6 py-4 text-center'>Details</th>
								</tr>
							</thead>

							<tbody className='divide-y divide-stone-100'>
								{loading ? (
									Array.from({ length: 5 }).map((_, idx) => (
										<tr key={idx}>
											{Array.from({ length: 6 }).map((_, cellIdx) => (
												<td
													key={cellIdx}
													className='px-6 py-5'>
													<div className='h-4 animate-pulse rounded bg-stone-100' />
												</td>
											))}
										</tr>
									))
								) : filteredOrders.length === 0 ? (
									<tr>
										<td
											colSpan={6}
											className='px-6 py-16 text-center'>
											<ShoppingBag
												size={36}
												className='mx-auto text-stone-300'
											/>
											<h4 className='mt-3 text-sm font-bold text-stone-700'>No Delivered Orders Found</h4>
											<p className='mt-1 text-xs text-stone-400'>
												{orders.length === 0
													? 'There are no delivered orders recorded in the store yet.'
													: 'No delivered orders match your search and filter criteria.'}
											</p>
										</td>
									</tr>
								) : (
									filteredOrders.map((order) => {
										const customerName = order.customer?.name || 'Unknown Customer';
										const customerEmail = order.customer?.email || 'No email';
										const orderNumber = order.orderNumber || order.orderId;

										return (
											<tr
												key={order.orderId || orderNumber}
												className='transition hover:bg-stone-50/70'>
												{/* Order Number / ID */}
												<td className='px-6 py-4'>
													<p className='font-bold text-stone-900'>{orderNumber}</p>
													<p className='mt-0.5 font-mono text-[11px] text-stone-400'>ID: {order.orderId}</p>
												</td>

												{/* Customer */}
												<td className='px-6 py-4'>
													<div className='flex items-center gap-3'>
														{order.customer?.imageUrl ? (
															<img
																src={order.customer.imageUrl}
																alt={customerName}
																referrerPolicy='no-referrer'
																className='h-8 w-8 rounded-full object-cover ring-1 ring-stone-200'
															/>
														) : (
															<div className='flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-amber-300'>
																{getCustomerInitials(customerName)}
															</div>
														)}
														<div className='min-w-0 max-w-[200px]'>
															<p className='truncate font-semibold text-stone-800'>{customerName}</p>
															<p className='truncate text-[11px] text-stone-400'>{customerEmail}</p>
														</div>
													</div>
												</td>

												{/* Status Badge */}
												<td className='px-6 py-4'>
													<span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'>
														<span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
														delivered
													</span>
												</td>

												{/* Date */}
												<td className='whitespace-nowrap px-6 py-4 text-stone-500'>
													<span className='flex items-center gap-1.5'>
														<Clock size={13} />
														{formatDate(order.createdAt)}
													</span>
												</td>

												{/* Total Price */}
												<td className='whitespace-nowrap px-6 py-4 text-right font-mono text-sm font-bold text-stone-900'>
													{formatPrice(order.totalPrice)}
												</td>

												{/* Action */}
												<td className='whitespace-nowrap px-6 py-4 text-center'>
													<button
														type='button'
														onClick={() => setSelectedOrder(order)}
														className='rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-stone-900 hover:text-stone-900'>
														View
													</button>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{/* Mobile Card View (for responsive devices) */}
					<div className='divide-y divide-stone-100 md:hidden'>
						{loading ? (
							Array.from({ length: 3 }).map((_, idx) => (
								<div
									key={idx}
									className='space-y-3 p-5'>
									<div className='h-4 w-32 animate-pulse rounded bg-stone-100' />
									<div className='h-4 w-48 animate-pulse rounded bg-stone-100' />
									<div className='h-4 w-24 animate-pulse rounded bg-stone-100' />
								</div>
							))
						) : filteredOrders.length === 0 ? (
							<div className='p-8 text-center text-stone-400'>
								<ShoppingBag
									size={32}
									className='mx-auto text-stone-300'
								/>
								<p className='mt-2 text-sm font-bold text-stone-700'>No Delivered Orders</p>
							</div>
						) : (
							filteredOrders.map((order) => {
								const customerName = order.customer?.name || 'Unknown Customer';
								const orderNumber = order.orderNumber || order.orderId;

								return (
									<div
										key={order.orderId || orderNumber}
										className='space-y-3 p-5'>
										<div className='flex items-center justify-between'>
											<span className='font-bold text-stone-900'>{orderNumber}</span>
											<span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700'>
												delivered
											</span>
										</div>

										<div className='flex items-center justify-between text-xs text-stone-500'>
											<span>Customer: {customerName}</span>
											<span className='font-mono font-bold text-stone-900'>{formatPrice(order.totalPrice)}</span>
										</div>

										<div className='flex items-center justify-between text-xs text-stone-400'>
											<span>Date: {formatDate(order.createdAt)}</span>
											<button
												type='button'
												onClick={() => setSelectedOrder(order)}
												className='font-semibold text-amber-600 underline'>
												View Details
											</button>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>
			</div>

			{/* Order Detail Modal */}
			{selectedOrder && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm'
					onClick={(e) => {
						if (e.target === e.currentTarget) setSelectedOrder(null);
					}}>
					<div
						role='dialog'
						aria-modal='true'
						className='relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl animate-in zoom-in-95 duration-200'>
						{/* Header */}
						<div className='flex items-center justify-between border-b border-stone-200 bg-stone-950 p-6 text-white'>
							<div>
								<div className='flex items-center gap-2'>
									<span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400'>
										Delivered
									</span>
									<span className='text-xs text-stone-400'>Order Revenue Details</span>
								</div>
								<h3 className='oc-display mt-2 text-xl font-bold'>
									{selectedOrder.orderNumber || selectedOrder.orderId}
								</h3>
							</div>

							<button
								type='button'
								onClick={() => setSelectedOrder(null)}
								className='rounded-xl border border-white/10 p-2 text-stone-400 transition hover:bg-white/10 hover:text-white'>
								✕
							</button>
						</div>

						{/* Modal Content */}
						<div className='flex-1 space-y-6 overflow-y-auto p-6 text-sm text-stone-700'>
							{/* Financial Summary */}
							<div className='rounded-2xl border border-stone-200 bg-stone-50 p-4'>
								<p className='text-xs font-semibold uppercase tracking-wider text-stone-400'>Delivered Total</p>
								<p className='oc-display mt-1 text-3xl font-bold text-stone-900'>
									{formatPrice(selectedOrder.totalPrice)}
								</p>
								<p className='mt-1 text-xs text-stone-500'>
									Payment Method: {selectedOrder.paymentMethod || 'Credit/Debit Card'}
								</p>
							</div>

							{/* Customer Info */}
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<div className='rounded-xl border border-stone-200 p-4'>
									<p className='text-xs font-semibold text-stone-400'>Customer Name</p>
									<p className='mt-1 font-semibold text-stone-900'>
										{selectedOrder.customer?.name || 'Unknown Customer'}
									</p>
									<p className='text-xs text-stone-400'>{selectedOrder.customer?.email || 'No email'}</p>
								</div>

								<div className='rounded-xl border border-stone-200 p-4'>
									<p className='text-xs font-semibold text-stone-400'>Order Date</p>
									<p className='mt-1 font-semibold text-stone-900'>
										{formatDate(selectedOrder.createdAt)}
									</p>
									<p className='text-xs text-stone-400'>ID: {selectedOrder.orderId}</p>
								</div>
							</div>

							{/* Shipping Details */}
							{selectedOrder.shippingInformation && (
								<div className='rounded-xl border border-stone-200 p-4'>
									<p className='text-xs font-semibold text-stone-400'>Shipping Address</p>
									<p className='mt-1 text-stone-800'>
										{selectedOrder.shippingInformation.address}, {selectedOrder.shippingInformation.city}{' '}
										{selectedOrder.shippingInformation.zip}
									</p>
									{selectedOrder.shippingInformation.phone && (
										<p className='text-xs text-stone-400'>Phone: {selectedOrder.shippingInformation.phone}</p>
									)}
								</div>
							)}

							{/* Products List */}
							{Array.isArray(selectedOrder.products) && selectedOrder.products.length > 0 && (
								<div>
									<p className='mb-3 text-xs font-bold uppercase tracking-wider text-stone-400'>
										Purchased Items ({selectedOrder.products.length})
									</p>
									<div className='divide-y divide-stone-100 rounded-xl border border-stone-200'>
										{selectedOrder.products.map((item, idx) => (
											<div
												key={idx}
												className='flex items-center justify-between p-3 text-xs'>
												<div className='min-w-0 max-w-[70%]'>
													<p className='truncate font-semibold text-stone-800'>{item.title}</p>
													<p className='text-stone-400'>Quantity: {item.quantity}</p>
												</div>
												<span className='font-mono font-bold text-stone-900'>
													{formatPrice(item.subtotal || (item.price || 0) * (item.quantity || 1))}
												</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
