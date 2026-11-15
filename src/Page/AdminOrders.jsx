import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';

import { RefreshCw, ShoppingBag, Clock, PackageCheck, CheckCircle2, Search, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, AlertCircle, LoaderCircle, Eye, Download, X, SlidersHorizontal, ArrowUpDown, RotateCcw, Mail, Hash, DollarSign, Truck } from 'lucide-react';

import { getAllOrders, updateOrderStatus } from '../services/adminOrderService';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// Same status chips as the OrderConfirm and MyOrders pages. `live` adds the pulsing dot
// for statuses that are still in motion.
const STATUS_STYLES = {
	pending: {
		badge: 'bg-amber-50 text-amber-800 ring-amber-200',
		live: true,
	},
	processing: {
		badge: 'bg-sky-50 text-sky-800 ring-sky-200',
		live: true,
	},
	shipped: {
		badge: 'bg-violet-50 text-violet-800 ring-violet-200',
		live: true,
	},
	delivered: {
		badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
		live: false,
	},
	cancelled: {
		badge: 'bg-rose-50 text-rose-800 ring-rose-200',
		live: false,
	},
};

const PAGE_SIZES = [10, 15, 25, 50];

const getOrderDate = (date) => {
	if (!date) return null;

	if (typeof date.toDate === 'function') {
		return date.toDate();
	}

	if (typeof date === 'object' && date.seconds) {
		return new Date(date.seconds * 1000);
	}

	const parsedDate = new Date(date);

	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDate = (date) => {
	const parsedDate = getOrderDate(date);

	if (!parsedDate) return '—';

	return parsedDate.toLocaleDateString('en-US', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
};

const formatPrice = (price) => {
	return `$${Number(price || 0).toFixed(2)}`;
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

const escapeCSV = (value) => {
	const text = String(value ?? '');

	return `"${text.replace(/"/g, '""')}"`;
};

/* ------------------------------------------------------------------ */
/*  Presentation helpers                                               */
/* ------------------------------------------------------------------ */

const BTN_DARK =
	'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-semibold text-white shadow-lg shadow-stone-900/20 transition duration-300 hover:bg-brass-400 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-stone-900 disabled:hover:text-white';
const BTN_GOLD =
	'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-6 text-sm font-bold text-ink shadow-lg shadow-brass-500/25 transition duration-300 hover:from-brass-200 hover:to-brass-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
const BTN_GHOST_DARK =
	'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition duration-300 hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
const BTN_OUTLINE =
	'inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white font-semibold text-stone-800 transition duration-300 hover:border-stone-900 hover:bg-stone-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-300 disabled:hover:bg-white disabled:hover:text-stone-800';
const FIELD = 'h-11 w-full rounded-xl border border-stone-200 bg-white text-sm text-stone-800 outline-none transition duration-300 placeholder:text-stone-400 focus:border-brass-400 focus:ring-4 focus:ring-brass-400/15';
const CARD = 'rounded-card border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,.05),0_18px_40px_-26px_rgba(28,25,23,.35)]';

const Avatar = ({ customer, name, size = 'h-10 w-10 text-xs' }) =>
	customer?.imageUrl ? (
		<img
			src={customer.imageUrl}
			alt={name}
			className={`${size} shrink-0 rounded-full border border-stone-200 object-cover`}
		/>
	) : (
		<div className={`${size} flex shrink-0 items-center justify-center rounded-full bg-stone-900 font-bold text-amber-300`}>{getCustomerInitials(name)}</div>
	);

const StatusBadge = ({ status }) => {
	const currentStatus = status || 'pending';
	const styles = STATUS_STYLES[currentStatus] || STATUS_STYLES.pending;

	return (
		<span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${styles.badge}`}>
			<span className='relative flex h-2 w-2'>
				{styles.live && <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60' />}
				<span className='relative inline-flex h-2 w-2 rounded-full bg-current' />
			</span>
			{currentStatus}
		</span>
	);
};

// Badge + the inline status select (same behaviour as before: picking a value opens the confirm dialog)
const StatusControl = ({ order, savingOrderId, onChange }) => (
	<div className='flex flex-col items-start gap-2'>
		<StatusBadge status={order.status} />

		<div className='relative'>
			<select
				aria-label={`Change status of order ${order.orderNumber || order.orderId}`}
				value={order.status || 'pending'}
				disabled={savingOrderId !== null || order.status === 'cancelled'}
				onChange={(event) =>
					onChange({
						orderId: order.orderId,
						status: event.target.value,
					})
				}
				className='h-9 w-36 appearance-none rounded-full border border-stone-200 bg-stone-50 py-1 pl-4 pr-9 text-xs font-medium capitalize text-stone-700 outline-none transition duration-300 hover:border-stone-300 focus:border-brass-400 focus:ring-4 focus:ring-brass-400/15 disabled:cursor-not-allowed disabled:opacity-50'>
				{STATUSES.map((status) => (
					<option
						key={status}
						value={status}>
						{status}
					</option>
				))}
			</select>

			<ChevronDown
				size={14}
				aria-hidden='true'
				className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400'
			/>
		</div>

		{savingOrderId === order.orderId && (
			<span className='flex items-center gap-1 text-xs text-stone-500'>
				<LoaderCircle
					size={13}
					className='animate-spin'
				/>
				Saving...
			</span>
		)}
	</div>
);

const StatItem = ({ icon: Icon, title, value, description }) => (
	<div className='flex min-w-0 flex-col items-start gap-3 bg-white p-5 sm:flex-row sm:items-center sm:gap-4 sm:p-6'>
		<span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-400'>
			<Icon
				size={19}
				aria-hidden='true'
			/>
		</span>

		<div className='min-w-0'>
			<p className='text-xs font-medium text-stone-400'>{title}</p>
			<p className='font-display text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl'>{value}</p>
			<p className='mt-0.5 truncate text-xs text-stone-400'>{description}</p>
		</div>
	</div>
);

const SummaryRow = ({ icon: Icon, label, children }) => (
	<div className='flex items-center justify-between gap-4 border-b border-white/10 py-3 text-sm'>
		<span className='flex items-center gap-2 text-stone-400'>
			<Icon
				size={15}
				aria-hidden='true'
				className='text-amber-400'
			/>
			{label}
		</span>
		<span className='min-w-0 text-right font-medium text-white'>{children}</span>
	</div>
);

const AdminOrders = () => {
	const { getToken } = useAuth();

	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	const [savingOrderId, setSavingOrderId] = useState(null);

	// Search and filters
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [sortOrder, setSortOrder] = useState('newest');

	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// Modals
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [pendingStatusChange, setPendingStatusChange] = useState(null);

	// Load orders
	const loadOrders = useCallback(async () => {
		setLoading(true);
		setError('');
		setMessage('');
		try {
			const data = await getAllOrders(getToken);
			setOrders(data);
		} catch (err) {
			setError(err.message || 'Could not load orders.');
		} finally {
			setLoading(false);
		}
	}, [getToken]);

	useEffect(() => {
		loadOrders();
	}, [loadOrders]);

	// Clear notifications automatically
	useEffect(() => {
		if (!message && !error) return;

		const timer = setTimeout(() => {
			setMessage('');
			setError('');
		}, 5000);

		return () => clearTimeout(timer);
	}, [message, error]);

	// Reset pagination when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [search, statusFilter, dateFrom, dateTo, sortOrder, pageSize]);

	// Confirm and update order status
	const handleStatusChange = async () => {
		if (!pendingStatusChange) return;

		const { orderId, status } = pendingStatusChange;

		setSavingOrderId(orderId);
		setError('');
		setMessage('');

		try {
			await updateOrderStatus(orderId, status, getToken);

			setOrders((currentOrders) => currentOrders.map((order) => (order.orderId === orderId ? { ...order, status } : order)));

			setMessage('Order status updated successfully.');
		} catch (err) {
			setError(err.message || 'Could not update order status.');
		} finally {
			setSavingOrderId(null);
			setPendingStatusChange(null);
		}
	};

	// Search, filter and sort
	const filteredOrders = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;

		const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

		return orders
			.filter((order) => {
				const customerName = order.customer?.name || '';
				const customerEmail = order.customer?.email || '';

				const searchableValues = [order.orderNumber, order.orderId, order.userId, customerName, customerEmail];

				const matchesSearch =
					!normalizedSearch ||
					searchableValues.some((value) =>
						String(value || '')
							.toLowerCase()
							.includes(normalizedSearch),
					);

				const currentStatus = order.status || 'pending';

				const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

				const orderDate = getOrderDate(order.createdAt);

				const matchesFromDate = !fromDate || (orderDate && orderDate >= fromDate);

				const matchesToDate = !toDate || (orderDate && orderDate <= toDate);

				return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
			})
			.sort((a, b) => {
				const dateA = getOrderDate(a.createdAt)?.getTime() || 0;
				const dateB = getOrderDate(b.createdAt)?.getTime() || 0;

				return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
			});
	}, [orders, search, statusFilter, dateFrom, dateTo, sortOrder]);

	// Pagination
	const totalPages = Math.ceil(filteredOrders.length / pageSize);

	const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	const startItem = filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

	const endItem = Math.min(currentPage * pageSize, filteredOrders.length);

	// Statistics
	const statistics = [
		{
			title: 'Total Orders',
			value: orders.length,
			icon: ShoppingBag,
			description: 'All customer orders',
		},
		{
			title: 'Pending',
			value: orders.filter((order) => (order.status || 'pending') === 'pending').length,
			icon: Clock,
			description: 'Awaiting processing',
		},
		{
			title: 'Processing',
			value: orders.filter((order) => order.status === 'processing').length,
			icon: PackageCheck,
			description: 'Currently being prepared',
		},
		{
			title: 'Delivered',
			value: orders.filter((order) => order.status === 'delivered').length,
			icon: CheckCircle2,
			description: 'Successfully completed',
		},
	];

	// Reset filters
	const resetFilters = () => {
		setSearch('');
		setStatusFilter('all');
		setDateFrom('');
		setDateTo('');
		setSortOrder('newest');
		setCurrentPage(1);
	};

	const hasActiveFilters = search || statusFilter !== 'all' || dateFrom || dateTo || sortOrder !== 'newest';

	// Export filtered orders
	const exportCSV = () => {
		if (filteredOrders.length === 0) return;

		const headers = ['Order Number', 'Order ID', 'Customer Name', 'Customer Email', 'Total', 'Date', 'Status'];

		const rows = filteredOrders.map((order) => [order.orderNumber || order.orderId, order.orderId, order.customer?.name || 'Unknown Customer', order.customer?.email || 'No email', Number(order.totalPrice || 0).toFixed(2), formatDate(order.createdAt), order.status || 'pending']);

		const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n');

		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		link.href = url;
		link.download = 'store-orders.csv';

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	};

	return (
		<>
			{/* ------------------------------ HERO ------------------------------ */}
			<header className='relative isolate overflow-hidden rounded-b-[2.5rem] bg-ink text-white lg:rounded-b-[4rem]'>
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(55% 80% at 90% 0%, rgba(251,191,36,.2), transparent 60%), radial-gradient(45% 60% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
				/>
				<div
					className='pointer-events-none absolute inset-0 opacity-[.06]'
					style={{
						backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
						backgroundSize: '44px 44px',
						WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 80%)',
						maskImage: 'linear-gradient(to bottom, #000, transparent 80%)',
					}}
				/>
				{/* the real number of orders, drawn as a huge outline */}
				{!loading && orders.length > 0 && (
					<span
						aria-hidden='true'
						className='pointer-events-none absolute -bottom-10 right-2 select-none font-display text-[clamp(8rem,26vw,22rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.08)]'>
						{orders.length}
					</span>
				)}

				<div className='pt-nav'>
					<div className='relative mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 sm:pb-32 sm:pt-14'>
						<nav aria-label='Breadcrumb'>
							<ol className='flex items-center gap-2 text-sm text-stone-400'>
								<li>Admin Dashboard</li>
								<li aria-hidden='true'>/</li>
								<li
									aria-current='page'
									className='text-stone-200'>
									Orders
								</li>
							</ol>
						</nav>

						<h1 className='mt-6 animate-rise font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl'>Orders Management</h1>

						<p
							className='mt-5 max-w-xl animate-rise text-base leading-relaxed text-stone-300'
							style={{ animationDelay: '120ms' }}>
							Manage customer orders, monitor fulfillment, and keep track of every purchase.
						</p>

						<div
							className='mt-8 flex animate-rise flex-wrap gap-3'
							style={{ animationDelay: '240ms' }}>
							<button
								type='button'
								onClick={exportCSV}
								disabled={filteredOrders.length === 0}
								className={BTN_GHOST_DARK}>
								<Download
									size={16}
									aria-hidden='true'
								/>
								Export CSV
							</button>

							<button
								type='button'
								onClick={loadOrders}
								disabled={loading}
								className={BTN_GOLD}>
								<RefreshCw
									size={16}
									aria-hidden='true'
									className={loading ? 'animate-spin' : ''}
								/>
								Refresh
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* ------------------------------ CONTENT ------------------------------ */}
			<main className='relative z-10 mx-auto -mt-16 max-w-7xl px-4 pb-24 sm:-mt-20 sm:px-6 sm:pb-32'>
				{/* Notifications */}
				{error && (
					<div
						role='alert'
						className='mb-5 flex animate-swap items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-rose-200'>
						<AlertCircle
							className='mt-0.5 shrink-0 text-rose-500'
							size={19}
							aria-hidden='true'
						/>
						<div className='min-w-0'>
							<p className='text-sm font-semibold text-rose-700'>Something went wrong</p>
							<p className='mt-1 break-words text-sm text-stone-600'>{error}</p>
						</div>
						<button
							type='button'
							aria-label='Dismiss error'
							onClick={() => setError('')}
							className='ml-auto rounded-full p-1 text-stone-400 transition hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-500'>
							<X size={17} />
						</button>
					</div>
				)}

				{message && (
					<div
						role='status'
						className='mb-5 flex animate-swap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-emerald-200'>
						<CheckCircle2
							size={19}
							className='shrink-0 text-emerald-600'
							aria-hidden='true'
						/>
						<p className='text-sm font-medium text-emerald-800'>{message}</p>
						<button
							type='button'
							aria-label='Dismiss message'
							onClick={() => setMessage('')}
							className='ml-auto rounded-full p-1 text-stone-400 transition hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-500'>
							<X size={17} />
						</button>
					</div>
				)}

				{/* Statistics */}
				<div className={`${CARD} mb-8 overflow-hidden`}>
					<div className='grid grid-cols-2 gap-px bg-stone-200 lg:grid-cols-4'>
						{statistics.map((item) => (
							<StatItem
								key={item.title}
								icon={item.icon}
								title={item.title}
								value={loading ? '—' : item.value}
								description={item.description}
							/>
						))}
					</div>
				</div>

				{/* Main Orders Panel */}
				<div className={`${CARD} overflow-hidden`}>
					{/* Panel Header */}
					<div className='flex flex-col justify-between gap-3 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:p-7'>
						<div>
							<h2 className='font-display text-xl font-bold tracking-tight text-stone-900'>All Orders</h2>

							<p className='mt-1 text-sm text-stone-500'>Search, filter and manage your customer purchases.</p>
						</div>

						<div className='flex items-center gap-2 self-start rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600 sm:self-auto'>
							<ShoppingBag
								size={16}
								aria-hidden='true'
								className='text-brass-500'
							/>
							<span aria-live='polite'>{filteredOrders.length} matching orders</span>
						</div>
					</div>

					{/* Search and Filters */}
					<div className='border-b border-stone-100 bg-stone-50/70 p-5 sm:p-7'>
						<div className='mb-4 flex items-center gap-2'>
							<SlidersHorizontal
								size={17}
								aria-hidden='true'
								className='text-brass-500'
							/>
							<h3 className='font-display text-sm font-bold text-stone-900'>Search & Filters</h3>
						</div>

						{/* Search */}
						<div className='relative mb-4'>
							<Search
								size={18}
								aria-hidden='true'
								className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400'
							/>

							<input
								type='text'
								aria-label='Search orders'
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder='Search by order number, customer name or email...'
								className={`${FIELD} h-12 rounded-full pl-11 pr-11`}
							/>

							{search && (
								<button
									type='button'
									aria-label='Clear search'
									onClick={() => setSearch('')}
									className='absolute right-4 top-1/2 -translate-y-1/2 rounded-full text-stone-400 transition hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-500'>
									<X size={17} />
								</button>
							)}
						</div>

						{/* Filters */}
						<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5'>
							{/* Status */}
							<div>
								<label
									htmlFor='order-status-filter'
									className='mb-2 block text-xs font-semibold text-stone-500'>
									Order Status
								</label>

								<div className='relative'>
									<select
										id='order-status-filter'
										value={statusFilter}
										onChange={(event) => setStatusFilter(event.target.value)}
										className={`${FIELD} appearance-none px-3 pr-9`}>
										<option value='all'>All statuses</option>

										{STATUSES.map((status) => (
											<option
												key={status}
												value={status}>
												{status.charAt(0).toUpperCase() + status.slice(1)}
											</option>
										))}
									</select>

									<ChevronDown
										size={15}
										aria-hidden='true'
										className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400'
									/>
								</div>
							</div>

							{/* From Date */}
							<div>
								<label
									htmlFor='order-date-from'
									className='mb-2 block text-xs font-semibold text-stone-500'>
									From Date
								</label>

								<input
									id='order-date-from'
									type='date'
									value={dateFrom}
									max={dateTo || undefined}
									onChange={(event) => setDateFrom(event.target.value)}
									className={`${FIELD} px-3`}
								/>
							</div>

							{/* To Date */}
							<div>
								<label
									htmlFor='order-date-to'
									className='mb-2 block text-xs font-semibold text-stone-500'>
									To Date
								</label>

								<input
									id='order-date-to'
									type='date'
									value={dateTo}
									min={dateFrom || undefined}
									onChange={(event) => setDateTo(event.target.value)}
									className={`${FIELD} px-3`}
								/>
							</div>

							{/* Sorting */}
							<div>
								<label
									htmlFor='order-sort'
									className='mb-2 block text-xs font-semibold text-stone-500'>
									Sort By
								</label>

								<div className='relative'>
									<select
										id='order-sort'
										value={sortOrder}
										onChange={(event) => setSortOrder(event.target.value)}
										className={`${FIELD} appearance-none px-3 pr-9`}>
										<option value='newest'>Newest first</option>
										<option value='oldest'>Oldest first</option>
									</select>

									<ArrowUpDown
										size={15}
										aria-hidden='true'
										className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400'
									/>
								</div>
							</div>

							{/* Reset */}
							<div className='flex flex-col'>
								<span className='mb-2 block text-xs font-semibold text-stone-500'>Actions</span>

								<button
									type='button'
									onClick={resetFilters}
									disabled={!hasActiveFilters}
									className={`${BTN_OUTLINE} h-11 px-4 text-sm`}>
									<RotateCcw
										size={15}
										aria-hidden='true'
									/>
									Reset Filters
								</button>
							</div>
						</div>
					</div>

					{/* Orders */}
					{loading ? (
						<div
							role='status'
							aria-live='polite'
							className='p-5 sm:p-7'>
							<div className='mb-5 flex items-center gap-3'>
								<span className='flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-amber-400'>
									<LoaderCircle
										size={20}
										className='animate-spin'
										aria-hidden='true'
									/>
								</span>
								<div>
									<p className='font-semibold text-stone-900'>Loading orders</p>
									<p className='text-sm text-stone-500'>Please wait while we retrieve your orders.</p>
								</div>
							</div>

							<div className='space-y-3'>
								{[0, 1, 2, 3].map((item) => (
									<div
										key={item}
										className='h-16 animate-pulse rounded-2xl bg-stone-100'
									/>
								))}
							</div>
						</div>
					) : orders.length === 0 ? (
						<div className='flex flex-col items-center justify-center px-4 py-20 text-center'>
							<div className='mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400 ring-8 ring-stone-50'>
								<ShoppingBag
									size={28}
									aria-hidden='true'
								/>
							</div>

							<h3 className='font-display text-xl font-bold text-stone-900'>No orders found</h3>

							<p className='mt-2 max-w-sm text-sm text-stone-500'>Customer orders will appear here once someone places an order in your store.</p>

							<button
								type='button'
								onClick={loadOrders}
								className={`${BTN_DARK} mt-6`}>
								Refresh orders
							</button>
						</div>
					) : filteredOrders.length === 0 ? (
						<div className='flex flex-col items-center justify-center px-4 py-16 text-center'>
							<div className='mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400 ring-8 ring-stone-50'>
								<Search
									size={26}
									aria-hidden='true'
								/>
							</div>

							<h3 className='font-display text-xl font-bold text-stone-900'>No matching orders</h3>

							<p className='mt-2 text-sm text-stone-500'>Try changing your search or filters.</p>

							<button
								type='button'
								onClick={resetFilters}
								className={`${BTN_DARK} mt-6`}>
								Clear all filters
							</button>
						</div>
					) : (
						<>
							{/* Desktop: table */}
							<div className='hidden overflow-x-auto lg:block'>
								<table className='w-full min-w-[960px] border-collapse text-left'>
									<thead>
										<tr className='border-b border-stone-200 bg-stone-50'>
											{['Order', 'Customer', 'Total', 'Date', 'Status', 'Actions'].map((heading) => (
												<th
													key={heading}
													className='px-6 py-4 text-xs font-semibold text-stone-500'>
													{heading}
												</th>
											))}
										</tr>
									</thead>

									<tbody className='divide-y divide-stone-100'>
										{paginatedOrders.map((order) => {
											const customerName = order.customer?.name || 'Unknown Customer';

											const customerEmail = order.customer?.email || 'No email';

											return (
												<tr
													key={order.orderId}
													className='transition-colors duration-200 hover:bg-stone-50'>
													{/* Order */}
													<td className='px-6 py-5'>
														<p className='font-display font-bold text-stone-900'>{order.orderNumber || order.orderId}</p>

														<p className='mt-1 max-w-[150px] truncate text-xs text-stone-400'>ID: {order.orderId}</p>
													</td>

													{/* Customer */}
													<td className='px-6 py-5'>
														<div className='flex items-center gap-3'>
															<Avatar
																customer={order.customer}
																name={customerName}
															/>

															<div className='min-w-0'>
																<p className='max-w-[180px] truncate text-sm font-semibold text-stone-900'>{customerName}</p>

																<p className='mt-1 flex max-w-[180px] items-center gap-1 truncate text-xs text-stone-500'>
																	<Mail
																		size={12}
																		aria-hidden='true'
																		className='shrink-0 text-stone-400'
																	/>
																	<span className='truncate'>{customerEmail}</span>
																</p>
															</div>
														</div>
													</td>

													{/* Total */}
													<td className='px-6 py-5'>
														<span className='font-display text-base font-bold text-stone-900'>{formatPrice(order.totalPrice)}</span>
													</td>

													{/* Date */}
													<td className='px-6 py-5'>
														<div className='flex items-center gap-2 text-sm text-stone-600'>
															<CalendarDays
																size={15}
																aria-hidden='true'
																className='shrink-0 text-brass-500'
															/>
															{formatDate(order.createdAt)}
														</div>
													</td>

													{/* Status */}
													<td className='px-6 py-5'>
														<StatusControl
															order={order}
															savingOrderId={savingOrderId}
															onChange={setPendingStatusChange}
														/>
													</td>

													{/* Actions */}
													<td className='px-6 py-5'>
														<button
															type='button'
															onClick={() => setSelectedOrder(order)}
															className={`${BTN_OUTLINE} h-9 px-4 text-xs`}>
															<Eye
																size={15}
																aria-hidden='true'
															/>
															View Details
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Tablet & phone: one card per order, no sideways scrolling */}
							<ul className='divide-y divide-stone-100 lg:hidden'>
								{paginatedOrders.map((order) => {
									const customerName = order.customer?.name || 'Unknown Customer';

									const customerEmail = order.customer?.email || 'No email';

									return (
										<li
											key={order.orderId}
											className='p-5 sm:p-6'>
											<div className='flex items-start justify-between gap-3'>
												<div className='min-w-0'>
													<p className='font-display text-lg font-bold text-stone-900'>{order.orderNumber || order.orderId}</p>
													<p className='mt-0.5 truncate text-xs text-stone-400'>ID: {order.orderId}</p>
												</div>

												<span className='font-display text-lg font-bold text-stone-900'>{formatPrice(order.totalPrice)}</span>
											</div>

											<div className='mt-4 flex items-center gap-3'>
												<Avatar
													customer={order.customer}
													name={customerName}
												/>

												<div className='min-w-0'>
													<p className='truncate text-sm font-semibold text-stone-900'>{customerName}</p>

													<p className='mt-1 flex items-center gap-1 text-xs text-stone-500'>
														<Mail
															size={12}
															aria-hidden='true'
															className='shrink-0 text-stone-400'
														/>
														<span className='truncate'>{customerEmail}</span>
													</p>
												</div>
											</div>

											<div className='mt-4 flex items-center gap-2 text-sm text-stone-600'>
												<CalendarDays
													size={15}
													aria-hidden='true'
													className='shrink-0 text-brass-500'
												/>
												{formatDate(order.createdAt)}
											</div>

											<div className='mt-4 flex flex-wrap items-end justify-between gap-3'>
												<StatusControl
													order={order}
													savingOrderId={savingOrderId}
													onChange={setPendingStatusChange}
												/>

												<button
													type='button'
													onClick={() => setSelectedOrder(order)}
													className={`${BTN_OUTLINE} h-10 px-5 text-xs`}>
													<Eye
														size={15}
														aria-hidden='true'
													/>
													View Details
												</button>
											</div>
										</li>
									);
								})}
							</ul>

							{/* Pagination */}
							<div className='flex flex-col justify-between gap-4 border-t border-stone-100 bg-stone-50/70 px-5 py-4 sm:flex-row sm:items-center sm:px-7'>
								<div className='flex flex-wrap items-center gap-3'>
									<p className='text-xs text-stone-500'>
										Showing
										<span className='mx-1 font-semibold text-stone-900'>
											{startItem}-{endItem}
										</span>
										of
										<span className='mx-1 font-semibold text-stone-900'>{filteredOrders.length}</span>
										orders
									</p>

									<div className='flex items-center gap-2'>
										<label
											htmlFor='order-page-size'
											className='text-xs text-stone-500'>
											Rows:
										</label>

										<select
											id='order-page-size'
											value={pageSize}
											onChange={(event) => setPageSize(Number(event.target.value))}
											className='h-8 rounded-full border border-stone-200 bg-white px-3 text-xs text-stone-700 outline-none transition focus:border-brass-400 focus:ring-4 focus:ring-brass-400/15'>
											{PAGE_SIZES.map((size) => (
												<option
													key={size}
													value={size}>
													{size}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className='flex items-center gap-2'>
									<button
										type='button'
										aria-label='Previous page'
										onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
										disabled={currentPage === 1}
										className={`${BTN_OUTLINE} h-9 w-9`}>
										<ChevronLeft
											size={17}
											aria-hidden='true'
										/>
									</button>

									<span className='min-w-[90px] text-center text-xs font-medium text-stone-600'>
										Page {currentPage} of {totalPages}
									</span>

									<button
										type='button'
										aria-label='Next page'
										onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
										disabled={currentPage === totalPages}
										className={`${BTN_OUTLINE} h-9 w-9`}>
										<ChevronRight
											size={17}
											aria-hidden='true'
										/>
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			</main>

			{/* Order Details Modal: the same dark summary card as OrderConfirm */}
			{selectedOrder && (
				<div
					className='fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm'
					onClick={() => setSelectedOrder(null)}>
					<div
						role='dialog'
						aria-modal='true'
						aria-labelledby='order-details-title'
						className='relative max-h-[90vh] w-full max-w-lg animate-swap overflow-y-auto rounded-[28px] bg-gradient-to-b from-graphite to-ink text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)] ring-1 ring-white/10'
						onClick={(event) => event.stopPropagation()}>
						<div
							className='pointer-events-none absolute inset-0'
							style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
						/>
						<div
							className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full'
							style={{ background: 'radial-gradient(circle, rgba(251,191,36,.26), transparent 70%)' }}
						/>

						<div className='relative'>
							<div className='flex items-start justify-between gap-4 p-6 pb-2'>
								<div className='min-w-0'>
									<h2
										id='order-details-title'
										className='font-display text-2xl font-bold'>
										Order Details
									</h2>

									<p className='mt-1 break-all text-sm text-stone-400'>{selectedOrder.orderNumber || selectedOrder.orderId}</p>
								</div>

								<button
									type='button'
									aria-label='Close details'
									onClick={() => setSelectedOrder(null)}
									className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-stone-200 ring-1 ring-white/15 transition hover:bg-brass-400 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
									<X size={18} />
								</button>
							</div>

							<div className='space-y-6 p-6'>
								{/* Customer */}
								<div>
									<p className='mb-3 text-xs font-medium text-stone-400'>Customer information</p>

									<div className='flex items-center gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10'>
										<Avatar
											customer={selectedOrder.customer}
											name={selectedOrder.customer?.name}
											size='h-12 w-12 text-sm'
										/>

										<div className='min-w-0'>
											<p className='truncate font-semibold text-white'>{selectedOrder.customer?.name || 'Unknown Customer'}</p>

											<p className='mt-1 flex items-center gap-1 break-all text-sm text-stone-400'>
												<Mail
													size={13}
													aria-hidden='true'
													className='shrink-0 text-amber-400'
												/>
												{selectedOrder.customer?.email || 'No email'}
											</p>
										</div>
									</div>
								</div>

								{/* Order Information */}
								<div>
									<p className='mb-1 text-xs font-medium text-stone-400'>Order information</p>

									<div className='border-t border-white/10'>
										<SummaryRow
											icon={Hash}
											label='Order ID'>
											<span className='break-all'>{selectedOrder.orderId}</span>
										</SummaryRow>

										<SummaryRow
											icon={CalendarDays}
											label='Order Date'>
											{formatDate(selectedOrder.createdAt)}
										</SummaryRow>

										<SummaryRow
											icon={Truck}
											label='Status'>
											<StatusBadge status={selectedOrder.status} />
										</SummaryRow>
									</div>

									<div className='mt-5 border-t border-dashed border-white/20 pt-5'>
										<p className='flex items-center gap-2 text-xs font-medium text-stone-400'>
											<DollarSign
												size={14}
												aria-hidden='true'
												className='text-amber-400'
											/>
											Total Amount
										</p>
										<p className='mt-1 font-display text-4xl font-bold tracking-tight text-amber-300'>{formatPrice(selectedOrder.totalPrice)}</p>
									</div>
								</div>

								<button
									type='button'
									onClick={() => setSelectedOrder(null)}
									className={`${BTN_GOLD} h-12 w-full text-base`}>
									Close Details
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Status Confirmation Modal */}
			{pendingStatusChange && (
				<div className='fixed inset-0 z-[80] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm'>
					<div
						role='dialog'
						aria-modal='true'
						aria-labelledby='status-confirmation-title'
						className='w-full max-w-sm animate-swap rounded-[28px] bg-white p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)] ring-1 ring-stone-200'>
						<div className='mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-amber-400'>
							<PackageCheck
								size={23}
								aria-hidden='true'
							/>
						</div>

						<h2
							id='status-confirmation-title'
							className='font-display text-xl font-bold text-stone-900'>
							Confirm Status Change
						</h2>

						<p className='mt-2 text-sm leading-6 text-stone-500'>
							Are you sure you want to change this order status to
							<span className='mx-1 font-semibold capitalize text-stone-900'>{pendingStatusChange.status}</span>?
						</p>

						<div className='mt-6 flex gap-3'>
							<button
								type='button'
								disabled={savingOrderId !== null}
								onClick={() => setPendingStatusChange(null)}
								className={`${BTN_OUTLINE} h-11 flex-1 text-sm`}>
								Cancel
							</button>

							<button
								type='button'
								disabled={savingOrderId !== null}
								onClick={handleStatusChange}
								className={`${BTN_GOLD} h-11 flex-1`}>
								{savingOrderId !== null ? 'Saving...' : 'Confirm'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default AdminOrders;
