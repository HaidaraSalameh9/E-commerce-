import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';
import { Menu, RefreshCw, TrendingUp } from 'lucide-react';

import { getAllUserActivities } from '../services/adminActivityService';
import ActivityStats from '../components/admin/ActivityStats';
import ActivitySidebar from '../components/admin/ActivitySidbar';
import ActivityTimeline from '../components/admin/ActivityTimeline';
import ActivityFilters from '../components/admin/ActivityFilters';
import useSidebarState from '../components/admin/Useactivitysidebar';

function shortDay(date) {
	return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

export default function AdminActivity() {
	const { getToken } = useAuth();

	const [activities, setActivities] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [search, setSearch] = useState('');
	const [type, setType] = useState('all');
	const [date, setDate] = useState('');

	// Shared with ActivitySidebar: one toggle button in the header controls it,
	// and the desktop (collapsed) state persists across Admin pages.
	// The hook lives in ../components/admin/Useactivitysidebar.js and is
	// shared by every admin page, so collapse state stays consistent.
	const { collapsed, mobileOpen, toggle, closeMobile } = useSidebarState();

	useEffect(() => {
		let ignore = false;

		async function loadActivities() {
			try {
				setLoading(true);
				setError('');

				// Window raised 20 → 100: the old stats were computed from
				// only the first 20 activities, so every count under-reported
				// as soon as the store passed 20 events. Same endpoint,
				// same shape — just a wider, honest window.
				const data = await getAllUserActivities(getToken, { limit: 100 });

				if (!ignore) {
					setActivities(data.activities || []);
				}
			} catch (err) {
				if (!ignore) {
					setError(err.message || 'Something went wrong.');
				}
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		}

		loadActivities();

		return () => {
			ignore = true;
		};
	}, [getToken]);

	// Every number below is derived from the loaded activities only.
	// Revenue stays null here: order totals do not exist in the activity
	// log, so ActivityStats renders "—" with an explanation instead of
	// an invented total. If metadata gains a total/amount field later,
	// sum it here and pass it as stats.revenue — no other change needed.
	const stats = useMemo(() => {
		const orderActivities = activities.filter((activity) => activity.type?.startsWith('order_'));
		const created = orderActivities.filter((activity) => activity.type === 'order_created');
		const completed = orderActivities.filter(
			(activity) =>
				activity.type === 'order_status_updated' &&
				['completed', 'delivered', 'fulfilled'].includes((activity.metadata?.newStatus || '').toLowerCase()),
		).length;

		return {
			events: activities.length,
			users: new Set(activities.map((activity) => activity.userId).filter(Boolean)).size,
			orders: orderActivities.length,
			cart: activities.filter((activity) => activity.type?.startsWith('cart_')).length,
			pending: Math.max(0, created.length - completed),
			completed,
			products: new Set(activities.map((activity) => activity.metadata?.title).filter(Boolean)).size,
			revenue: null,
		};
	}, [activities]);

	// Orders created per day, last 14 days — real activity, no chart lib.
	const trend = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const days = [];
		for (let i = 13; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			days.push({ key: d.toISOString().slice(0, 10), label: shortDay(d), value: 0 });
		}
		const byKey = new Map(days.map((day) => [day.key, day]));
		for (const activity of activities) {
			if (activity.type !== 'order_created' || !activity.createdAt) continue;
			const bucket = byKey.get(new Date(activity.createdAt).toISOString().slice(0, 10));
			if (bucket) bucket.value += 1;
		}
		return days;
	}, [activities]);

	// Most-mentioned product titles in carts and orders.
	const bestSellers = useMemo(() => {
		const counts = new Map();
		for (const activity of activities) {
			const title = activity.metadata?.title;
			if (title && (activity.type === 'cart_added' || activity.type === 'order_created')) {
				counts.set(title, (counts.get(title) || 0) + 1);
			}
		}
		return [...counts.entries()]
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([title, count]) => ({ title, count }));
	}, [activities]);

	const trendMax = Math.max(1, ...trend.map((day) => day.value));
	const bestMax = Math.max(1, ...bestSellers.map((item) => item.count));

	async function handleRefresh() {
		try {
			setLoading(true);
			setError('');

			const data = await getAllUserActivities(getToken, { limit: 100 });

			setActivities(data.activities || []);
		} catch (err) {
			setError(err.message || 'Could not refresh activities.');
		} finally {
			setLoading(false);
		}
	}

	const filteredActivities = useMemo(() => {
		return activities.filter((activity) => {
			const matchesSearch = !search || activity.userId?.toLowerCase().includes(search.toLowerCase()) || activity.user?.name?.toLowerCase().includes(search.toLowerCase()) || activity.user?.email?.toLowerCase().includes(search.toLowerCase());

			const matchesType = type === 'all' || (type === 'order' && activity.type?.startsWith('order_')) || (type === 'cart' && activity.type?.startsWith('cart_')) || activity.type === type;

			const matchesDate = !date || (activity.createdAt && new Date(activity.createdAt).toISOString().slice(0, 10) === date);

			return matchesSearch && matchesType && matchesDate;
		});
	}, [activities, search, type, date]);

	return (
		<div className='min-h-screen bg-[#0a0a09] text-stone-100'>
			<ActivitySidebar
				collapsed={collapsed}
				mobileOpen={mobileOpen}
				onToggle={toggle}
				onCloseMobile={closeMobile}
			/>

			<main className={`min-h-screen transition-[padding-left] duration-500 ease-soft ${collapsed ? 'lg:pl-[78px]' : 'lg:pl-[260px]'}`}>
				{/* Header — sticky, 76px like the sidebar brand row, dark */}
				<header className='sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-white/10 bg-[#0a0a09]/90 px-4 backdrop-blur-md sm:px-8'>
					<div className='flex min-w-0 items-center gap-3'>
						<button
							type='button'
							onClick={toggle}
							aria-label={mobileOpen ? 'Close sidebar' : 'Toggle sidebar'}
							className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500'>
							<Menu
								size={18}
								aria-hidden='true'
							/>
						</button>

						<div className='min-w-0'>
							<p className='truncate text-xs text-stone-500'>Workspace / Activity Center</p>
							<h2 className='truncate text-sm font-semibold text-stone-100'>Overview</h2>
						</div>
					</div>

					<span className='hidden shrink-0 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 sm:flex'>
						<span
							aria-hidden='true'
							className='h-2 w-2 rounded-full bg-emerald-400'
						/>
						System Online
					</span>
				</header>

				{/* Content */}
				<div
					className='space-y-8 p-4 sm:p-8'
					style={{
						backgroundImage:
							'radial-gradient(60% 40% at 85% 0%, rgba(212,175,55,0.08), transparent 65%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
						backgroundSize: 'auto, 56px 56px, 56px 56px',
					}}>
					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div>
							<p className='text-[11px] font-bold tracking-[0.22em] text-brass-300'>PULSE · ACTIVITY CENTER</p>
							<h1 className='mt-2 animate-rise font-display text-2xl font-bold tracking-tight text-stone-50 sm:text-3xl'>Activity Overview</h1>

							<p
								className='mt-2 animate-rise text-sm text-stone-400'
								style={{ animationDelay: '60ms' }}>
								Monitor customer behavior and track everything happening across your store.
							</p>
						</div>

						<button
							type='button'
							onClick={handleRefresh}
							disabled={loading}
							className='flex items-center gap-2 rounded-xl bg-gradient-to-r from-brass-300 to-brass-500 px-4 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-brass-500/20 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500 disabled:cursor-not-allowed disabled:opacity-60'>
							<RefreshCw
								size={16}
								className={loading ? 'animate-spin' : ''}
								aria-hidden='true'
							/>
							Refresh
						</button>
					</div>

					{/* Error */}
					{error && (
						<div
							role='alert'
							className='rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-300'>
							{error}
						</div>
					)}

					{/* Statistics */}
					{loading ? (
						<div
							role='status'
							aria-live='polite'
							className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
							<span className='sr-only'>Loading activity...</span>
							{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
								<div
									key={item}
									className='h-40 animate-pulse rounded-card border border-white/10 bg-white/5'
								/>
							))}
						</div>
					) : (
						<ActivityStats stats={stats} />
					)}

					{/* Orders trend + best sellers — both from the loaded activities */}
					<div className='grid grid-cols-1 gap-5 xl:grid-cols-5'>
						<section className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card sm:p-6 xl:col-span-3'>
							<div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
								<div>
									<h2 className='font-display text-lg font-bold text-stone-100'>Orders trend</h2>
									<p className='mt-1 text-xs text-stone-500'>Orders created per day · last 14 days</p>
								</div>
								<span className='flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-stone-400'>
									<TrendingUp
										size={14}
										className='text-brass-300'
										aria-hidden='true'
									/>
									{trend.reduce((sum, day) => sum + day.value, 0)} orders in period
								</span>
							</div>

							{loading ? (
								<div className='h-40 animate-pulse rounded-2xl bg-white/5' />
							) : trend.every((day) => day.value === 0) ? (
								<div className='flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center'>
									<p className='text-sm font-medium text-stone-300'>No orders in the last 14 days</p>
									<p className='mt-1 max-w-[280px] text-xs text-stone-500'>New orders will fill this chart automatically.</p>
								</div>
							) : (
								<div className='flex h-40 items-end gap-1.5 sm:gap-2.5'>
									{trend.map((day) => (
										<div
											key={day.key}
											className='group flex min-w-0 flex-1 flex-col items-center gap-2'>
											<span className='text-[11px] font-semibold text-stone-300 opacity-0 transition group-hover:opacity-100'>{day.value}</span>
											<div
												className='w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-brass-500 to-brass-300 transition-all duration-300 group-hover:brightness-110'
												style={{ height: `${Math.max(4, (day.value / trendMax) * 120)}px`, opacity: 0.5 + 0.5 * (day.value / trendMax) }}
												title={`${day.label}: ${day.value} orders`}
											/>
											<span className='truncate text-[9px] text-stone-500 sm:text-[10px]'>{day.label}</span>
										</div>
									))}
								</div>
							)}
						</section>

						<section className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card sm:p-6 xl:col-span-2'>
							<h2 className='font-display text-lg font-bold text-stone-100'>Best-selling products</h2>
							<p className='mt-1 text-xs text-stone-500'>Most-mentioned products in carts &amp; orders</p>

							{loading ? (
								<div className='mt-5 h-40 animate-pulse rounded-2xl bg-white/5' />
							) : bestSellers.length === 0 ? (
								<div className='mt-5 flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center'>
									<p className='text-sm font-medium text-stone-300'>No product activity yet</p>
									<p className='mt-1 max-w-[260px] text-xs text-stone-500'>Products will rank here once they appear in carts or orders.</p>
								</div>
							) : (
								<ul className='mt-5 space-y-4'>
									{bestSellers.map((item, index) => (
										<li key={item.title}>
											<div className='flex items-baseline justify-between gap-3'>
												<p className='min-w-0 truncate text-sm font-medium text-stone-100'>
													<span className='mr-2 font-display font-bold text-brass-300'>{index + 1}.</span>
													{item.title}
												</p>
												<span className='shrink-0 text-xs font-semibold text-stone-400'>
													{item.count} {item.count === 1 ? 'mention' : 'mentions'}
												</span>
											</div>
											<div className='mt-2 h-2 overflow-hidden rounded-full bg-white/5'>
												<div
													className='h-full rounded-full bg-gradient-to-r from-brass-500 to-brass-300'
													style={{ width: `${(item.count / bestMax) * 100}%` }}
												/>
											</div>
										</li>
									))}
								</ul>
							)}
						</section>
					</div>

					<ActivityFilters
						search={search}
						setSearch={setSearch}
						type={type}
						setType={setType}
						date={date}
						setDate={setDate}
					/>

					<ActivityTimeline activities={filteredActivities} />
				</div>
			</main>
		</div>
	);
}
