import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import { RefreshCw, Search, X, ChevronLeft, ChevronRight, Activity, ShoppingBag, ShoppingCart, Clock, Menu } from 'lucide-react';

import { getAllUserActivities } from '../services/adminActivityService';
import ActivitySidebar from '../components/admin/ActivitySidbar';
import EventDetailsDrawer from '../components/admin/EventDetailsDrawer';
import useSidebarState from '../components/admin/Useactivitysidebar';

/* ------------------------------------------------------------------
 * User profile helpers (duplicated in the other Activity files —
 * each file is self-contained, no shared helper module).
 *
 * The backend stores the customer snapshot on each activity under
 * `customer` ({ name, email, imageUrl }); `user` is checked first in
 * case a future response maps it. Placeholder values the backend
 * writes when its Clerk lookup fails ("Unknown Customer",
 * "Unnamed User", "No email") and any value that IS the user ID are
 * treated as missing — User IDs are never displayed or searched.
 * ------------------------------------------------------------------ */
const UNKNOWN_CUSTOMER_LABEL = 'Unknown customer';
const NO_EMAIL_LABEL = 'No email on file';
const PLACEHOLDER_EMAILS = new Set(['no email', 'no-email', 'unknown', 'n/a', 'na', '—', '-']);
const PLACEHOLDER_NAMES = new Set(['unknown customer', 'unnamed user', 'unknown user', 'customer', 'unknown', 'n/a', '—', '-']);

function cleanProfileValue(value) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function isIdLikeValue(value, userId) {
	const v = cleanProfileValue(value);
	if (!v) return true;
	if (userId && v === userId) return true;
	return /^user_[A-Za-z0-9]+$/.test(v);
}

function getDisplayName(user, userId) {
	if (!user || typeof user !== 'object') return null;
	const joinedName = [cleanProfileValue(user.firstName), cleanProfileValue(user.lastName)].filter(Boolean).join(' ') || null;
	for (const candidate of [user.name, user.fullName, joinedName, user.username]) {
		const value = cleanProfileValue(candidate);
		if (!value) continue;
		if (PLACEHOLDER_NAMES.has(value.toLowerCase())) continue;
		if (isIdLikeValue(value, userId)) continue;
		return value;
	}
	return null;
}

function getDisplayEmail(user, userId) {
	if (!user || typeof user !== 'object') return null;
	const candidates = [
		user.email,
		user.emailAddress,
		user.primaryEmailAddress?.emailAddress,
		user.primaryEmail?.emailAddress,
		Array.isArray(user.emailAddresses) ? user.emailAddresses[0]?.emailAddress : null,
	];
	for (const candidate of candidates) {
		const value = cleanProfileValue(candidate);
		if (!value) continue;
		if (PLACEHOLDER_EMAILS.has(value.toLowerCase())) continue;
		if (isIdLikeValue(value, userId)) continue;
		return value;
	}
	return null;
}

function getDisplayImage(user) {
	if (!user || typeof user !== 'object') return null;
	return cleanProfileValue(user.imageUrl) || cleanProfileValue(user.profileImageUrl) || cleanProfileValue(user.image) || cleanProfileValue(user.avatarUrl) || null;
}

function normalizeActivityUser(user, userId) {
	return {
		name: getDisplayName(user, userId),
		email: getDisplayEmail(user, userId),
		imageUrl: getDisplayImage(user),
	};
}

function getActivityCustomer(activity) {
	if (!activity || typeof activity !== 'object') return null;
	return activity.user || activity.customer || null;
}

function getActivityActor(activity) {
	if (!activity || typeof activity !== 'object') return null;
	if (activity.actor) return activity.actor;
	if (activity.actorUserId && activity.actorUserId === activity.userId) return getActivityCustomer(activity);
	return null;
}

// User search: full name or email only — never User ID.
function matchesUserSearch(user, userId, query) {
	const q = cleanProfileValue(query)?.toLowerCase();
	if (!q) return true;
	const { name, email } = normalizeActivityUser(user, userId);
	return Boolean((name && name.toLowerCase().includes(q)) || (email && email.toLowerCase().includes(q)));
}

const PAGE_SIZE = 20;

function getEventInfo(type) {
	const events = {
		order_created: {
			label: 'Order Created',
			color: 'bg-emerald-400/10 text-emerald-300',
			icon: ShoppingBag,
		},
		order_status_updated: {
			label: 'Order Status Updated',
			color: 'bg-brass-400/15 text-brass-300',
			icon: ShoppingBag,
		},
		cart_added: {
			label: 'Product Added',
			color: 'bg-emerald-400/10 text-emerald-300',
			icon: ShoppingCart,
		},
		cart_removed: {
			label: 'Product Removed',
			color: 'bg-rose-400/10 text-rose-300',
			icon: ShoppingCart,
		},
		cart_quantity_updated: {
			label: 'Quantity Updated',
			color: 'bg-brass-400/15 text-brass-300',
			icon: ShoppingCart,
		},
	};

	// Labels match ActivityTimeline exactly, so the same event reads the
	// same way on the Overview and on this page.
	return (
		events[type] || {
			label: type || 'Unknown Event',
			color: 'bg-white/5 text-stone-300',
			icon: Activity,
		}
	);
}

function formatDate(timestamp) {
	if (!timestamp) return '—';

	const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

	if (Number.isNaN(date.getTime())) return '—';

	return date.toLocaleString('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

export default function ActivityEvents() {
	const { getToken } = useAuth();

	const [activities, setActivities] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [search, setSearch] = useState('');
	const [type, setType] = useState('all');
	const [cursor, setCursor] = useState(null);
	const [nextCursor, setNextCursor] = useState(null);
	const [pageHistory, setPageHistory] = useState([]);
	const [selectedActivity, setSelectedActivity] = useState(null);

	// The sidebar is wired exactly like on the Overview page. Previously
	// this page rendered <ActivitySidebar /> with no props and a fixed
	// pl-[260px] on <main>: the sidebar could never collapse, and on
	// mobile it was hidden with no way to open it while the content was
	// still pushed 260px right — the page was unusable below lg.
	const { collapsed, mobileOpen, toggle, closeMobile } = useSidebarState();

	const loadActivities = useCallback(
		async (currentCursor = null) => {
			try {
				setLoading(true);
				setError('');

				const data = await getAllUserActivities(getToken, {
					limit: PAGE_SIZE,
					cursor: currentCursor,
				});

				setActivities(data.activities || []);
				setNextCursor(data.nextCursor || null);
			} catch (err) {
				setError(err.message || 'Could not load events.');
			} finally {
				setLoading(false);
			}
		},
		[getToken],
	);

	useEffect(() => {
		loadActivities();
	}, [loadActivities]);

	function handleNextPage() {
		if (!nextCursor || loading) return;

		setPageHistory((previous) => [...previous, cursor]);
		setCursor(nextCursor);
		loadActivities(nextCursor);
	}

	function handlePreviousPage() {
		if (pageHistory.length === 0 || loading) return;

		const previousCursor = pageHistory[pageHistory.length - 1];

		setPageHistory((previous) => previous.slice(0, -1));
		setCursor(previousCursor);
		loadActivities(previousCursor);
	}

	function handleRefresh() {
		setCursor(null);
		setPageHistory([]);
		loadActivities(null);
	}

	const searchTerm = search.trim();

	const filteredActivities = activities.filter((activity) => {
		const searchValue = searchTerm.toLowerCase();

		// User search matches FULL NAME or EMAIL only — for the customer
		// and for the admin who performed the action. User IDs are not
		// searchable. Order-number search is kept: it is an existing
		// feature and not a user identifier.
		const matchesSearch =
			!searchValue ||
			matchesUserSearch(getActivityCustomer(activity), activity.userId, searchValue) ||
			matchesUserSearch(getActivityActor(activity), activity.actorUserId, searchValue) ||
			activity.metadata?.orderNumber?.toLowerCase().includes(searchValue);

		const matchesType = type === 'all' || (type === 'order' && activity.type?.startsWith('order_')) || (type === 'cart' && activity.type?.startsWith('cart_')) || activity.type === type;

		return matchesSearch && matchesType;
	});

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

							<h2 className='truncate text-sm font-semibold text-stone-100'>All Events</h2>
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

				<div
					className='space-y-6 p-4 sm:p-8'
					style={{
						backgroundImage:
							'radial-gradient(60% 40% at 85% 0%, rgba(212,175,55,0.08), transparent 65%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
						backgroundSize: 'auto, 56px 56px, 56px 56px',
					}}>
					{/* Page title */}
					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div>
							<p className='text-[11px] font-bold tracking-[0.22em] text-brass-300'>PULSE · ACTIVITY CENTER</p>
							<h1 className='mt-2 animate-rise font-display text-2xl font-bold tracking-tight text-stone-50 sm:text-3xl'>All Events</h1>

							<p className='mt-2 animate-rise text-sm text-stone-400'>View and manage every activity across your store.</p>
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

					{/* Search and filters */}
					<div className='flex flex-wrap items-center gap-3 rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-4 shadow-card'>
						<div className='relative min-w-[220px] flex-1'>
							<Search
								size={17}
								className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500'
								aria-hidden='true'
							/>

							<input
								type='search'
								autoComplete='off'
								inputMode='search'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder='Search by name, email, or order number...'
								aria-label='Search events'
								className='h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-10 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-brass-400 focus:bg-white/[0.06] focus:ring-4 focus:ring-brass-400/15'
							/>

							{search && (
								<button
									type='button'
									onClick={() => setSearch('')}
									aria-label='Clear search'
									className='absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/10 hover:text-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
									<X
										size={14}
										aria-hidden='true'
									/>
								</button>
							)}
						</div>

						<select
							value={type}
							onChange={(e) => setType(e.target.value)}
							aria-label='Filter by event type'
							className='h-11 min-w-[170px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-stone-100 outline-none transition focus:border-brass-400 focus:ring-4 focus:ring-brass-400/15 [&_option]:bg-[#161613] [&_option]:text-stone-100'>
							<option value='all'>All Events</option>
							<option value='order'>Order Events</option>
							<option value='cart'>Cart Events</option>
							<option value='order_created'>Order Created</option>
							<option value='order_status_updated'>Order Status Updated</option>
							<option value='cart_added'>Product Added</option>
							<option value='cart_removed'>Product Removed</option>
							<option value='cart_quantity_updated'>Quantity Updated</option>
						</select>
					</div>

					{/* Error */}
					{error && (
						<div
							role='alert'
							className='rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-300'>
							{error}
						</div>
					)}

					{/* Events table */}
					<div className='overflow-hidden rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] shadow-card'>
						<div className='flex items-center justify-between border-b border-white/5 px-6 py-5'>
							<div>
								<h3 className='font-display font-semibold text-stone-100'>Event History</h3>

								<p className='mt-1 text-xs text-stone-500'>Showing {filteredActivities.length} events on this page</p>
							</div>

							<Activity
								size={20}
								className='text-stone-500'
								aria-hidden='true'
							/>
						</div>

						<div className='overflow-x-auto'>
							<table className='w-full min-w-[850px] text-left'>
								<thead>
									<tr className='border-b border-white/5 text-xs font-semibold uppercase tracking-wider text-stone-500'>
										<th className='px-6 py-4'>Event</th>
										<th className='px-6 py-4'>User</th>
										<th className='px-6 py-4'>Description</th>
										<th className='px-6 py-4'>Order</th>
										<th className='px-6 py-4'>Date</th>
									</tr>
								</thead>

								<tbody className='divide-y divide-white/5'>
									{loading ? (
										Array.from({ length: 5 }).map((_, index) => (
											<tr key={index}>
												{Array.from({ length: 5 }).map((_, cell) => (
													<td
														key={cell}
														className='px-6 py-5'>
														<div className='h-4 animate-pulse rounded bg-white/5' />
													</td>
												))}
											</tr>
										))
									) : filteredActivities.length === 0 ? (
										<tr>
											<td
												colSpan='5'
												className='px-6 py-16 text-center'>
												<Activity
													size={30}
													className='mx-auto text-stone-600'
													aria-hidden='true'
												/>

												<p className='mt-3 text-sm font-medium text-stone-300'>No events found</p>

												<p className='mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-500'>
													{searchTerm
														? `Nothing on this page matches “${searchTerm}”. Search matches full name, email, or order number.`
														: 'Try changing your search or filters.'}
												</p>
											</td>
										</tr>
									) : (
										filteredActivities.map((activity) => {
											const event = getEventInfo(activity.type);
											const EventIcon = event.icon;

											// Display-safe profile: real full name + personal
											// email. Never falls back to a User ID.
											const customer = normalizeActivityUser(getActivityCustomer(activity), activity.userId);
											const actor = normalizeActivityUser(getActivityActor(activity), activity.actorUserId);

											return (
												<tr
													key={activity.id}
													onClick={() => setSelectedActivity(activity)}
													className='cursor-pointer transition hover:bg-white/[0.03]'>
													<td className='px-6 py-5'>
														<span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${event.color}`}>
															<EventIcon
																size={15}
																aria-hidden='true'
															/>
															{event.label}
														</span>
													</td>

													<td className='px-6 py-5'>
														<div className='min-w-0 max-w-[220px]'>
															<p
																className='truncate text-xs font-semibold text-stone-100'
																title={customer.name || undefined}>
																{customer.name || UNKNOWN_CUSTOMER_LABEL}
															</p>
															<p
																className='truncate text-[11px] text-stone-500'
																title={customer.email || undefined}>
																{customer.email || NO_EMAIL_LABEL}
															</p>
															{activity.actorUserId && activity.actorUserId !== activity.userId && (
																<span className='mt-1 inline-block rounded bg-brass-400/10 px-1.5 py-0.5 text-[10px] font-medium text-brass-300'>
																	By: {actor.name || 'Admin'}
																</span>
															)}
														</div>
													</td>

													<td className='max-w-[260px] px-6 py-5'>
														{/* Two lines instead of one truncated line; the full
														    text is in the details drawer on row click. */}
														<p
															className='line-clamp-2 text-sm leading-relaxed text-stone-400'
															title={activity.description || ''}>
															{activity.description || '—'}
														</p>
													</td>

													<td className='px-6 py-5'>
														<span className='text-xs font-medium text-stone-300'>{activity.metadata?.orderNumber || '—'}</span>
													</td>

													<td className='whitespace-nowrap px-6 py-5'>
														<span className='flex items-center gap-2 text-xs text-stone-500'>
															<Clock
																size={14}
																aria-hidden='true'
															/>
															{formatDate(activity.createdAt)}
														</span>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						<div className='flex items-center justify-between border-t border-white/5 px-6 py-4'>
							<p className='text-xs text-stone-500'>{pageHistory.length === 0 ? 'Page 1' : `Page ${pageHistory.length + 1}`}</p>

							<div className='flex items-center gap-2'>
								<button
									type='button'
									onClick={handlePreviousPage}
									disabled={pageHistory.length === 0 || loading}
									className='flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-stone-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40'>
									<ChevronLeft
										size={15}
										aria-hidden='true'
									/>
									Previous
								</button>

								<button
									type='button'
									onClick={handleNextPage}
									disabled={!nextCursor || loading}
									className='flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-stone-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40'>
									Next
									<ChevronRight
										size={15}
										aria-hidden='true'
									/>
								</button>
							</div>
						</div>
					</div>
				</div>
				<EventDetailsDrawer
					activity={selectedActivity}
					onClose={() => setSelectedActivity(null)}
				/>
			</main>
		</div>
	);
}
