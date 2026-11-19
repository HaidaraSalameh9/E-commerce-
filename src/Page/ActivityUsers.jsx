import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';
import { Search, X, Users, RefreshCw, ChevronRight, UserRound, Menu } from 'lucide-react';

import UserActivityModal from '../components/admin/UserActivityModal';
import ActivitySidebar from '../components/admin/ActivitySidbar';
import { getAllUserActivities } from '../services/adminActivityService';
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

function formatDate(date) {
	if (!date) return 'Unknown';

	const parsed = new Date(date);

	if (Number.isNaN(parsed.getTime())) return 'Unknown';

	return new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(parsed);
}

export default function ActivityUsers() {
	const { getToken } = useAuth();

	const [activities, setActivities] = useState([]);
	const [cursor, setCursor] = useState(null);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [selectedUser, setSelectedUser] = useState(null);

	// Same sidebar wiring as the Overview and Events pages. Previously
	// this page rendered <ActivitySidebar /> with no props and a fixed
	// pl-[260px] on <main>: the sidebar could never collapse, and on
	// mobile it was hidden with no way to open it while the content was
	// still pushed 260px right.
	const { collapsed, mobileOpen, toggle, closeMobile } = useSidebarState();

	const loadActivities = useCallback(
		async (nextCursor = null) => {
			try {
				if (nextCursor) {
					setLoadingMore(true);
				} else {
					setLoading(true);
				}

				setError('');

				const data = await getAllUserActivities(getToken, {
					limit: 50,
					cursor: nextCursor,
				});

				setActivities((previous) => (nextCursor ? [...previous, ...(data.activities || [])] : data.activities || []));

				setCursor(data.nextCursor || null);
				setHasMore(Boolean(data.nextCursor));
			} catch (err) {
				setError(err.message || 'Could not load users.');
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[getToken],
	);

	useEffect(() => {
		loadActivities();
	}, [loadActivities]);

	const users = useMemo(() => {
		const usersMap = new Map();

		activities.forEach((activity) => {
			if (!activity.userId) return;

			// Resolve display-safe profile data up front. If the API sent
			// an ID (or a placeholder like "No email") where a name/email
			// belongs, the helper returns null instead of leaking the ID
			// into the UI. userId is kept ONLY as the internal map key
			// and for the per-user API call — it is never rendered.
			const profile = normalizeActivityUser(getActivityCustomer(activity), activity.userId);
			const existing = usersMap.get(activity.userId);

			if (!existing) {
				usersMap.set(activity.userId, {
					userId: activity.userId,
					name: profile.name,
					email: profile.email,
					imageUrl: profile.imageUrl,
					activityCount: 1,
					lastActivity: activity.createdAt,
				});
			} else {
				existing.activityCount += 1;

				// Fill in any missing profile fields from later activities.
				// Each field upgrades independently — previously email and
				// avatar only upgraded when the name was missing, so a user
				// whose first activity had a name but no email stayed
				// email-less forever.
				if (!existing.name && profile.name) existing.name = profile.name;
				if (!existing.email && profile.email) existing.email = profile.email;
				if (!existing.imageUrl && profile.imageUrl) existing.imageUrl = profile.imageUrl;

				if (new Date(activity.createdAt) > new Date(existing.lastActivity)) {
					existing.lastActivity = activity.createdAt;
				}
			}
		});

		const searchLower = search.trim().toLowerCase();

		return Array.from(usersMap.values())
			.filter((user) => {
				if (!searchLower) return true;
				// Search matches FULL NAME or EMAIL only — never User ID.
				return Boolean(
					(user.name && user.name.toLowerCase().includes(searchLower)) ||
						(user.email && user.email.toLowerCase().includes(searchLower)),
				);
			})
			.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
	}, [activities, search]);

	const searchTerm = search.trim();

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
							<p className='truncate text-xs text-stone-500'>Workspace / Activity Center / Users</p>
							<h2 className='truncate text-sm font-semibold text-stone-100'>Users Activity</h2>
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
					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div>
							<p className='text-[11px] font-bold tracking-[0.22em] text-brass-300'>PULSE · ACTIVITY CENTER</p>
							<h1 className='mt-2 animate-rise font-display text-2xl font-bold tracking-tight text-stone-50 sm:text-3xl'>Users Activity</h1>
							<p className='mt-2 animate-rise text-sm text-stone-400'>Explore customers and their store interactions.</p>
						</div>

						<button
							type='button'
							onClick={() => loadActivities()}
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

					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5'>
						<div className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card sm:p-6'>
							<div className='flex items-center justify-between'>
								<p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500'>Users Found</p>
								<Users
									className='text-brass-300'
									size={21}
									aria-hidden='true'
								/>
							</div>
							<h3 className='mt-3 font-display text-3xl font-bold tabular-nums text-stone-50'>{users.length}</h3>
							<p className='mt-2 text-xs text-stone-500'>In the activities loaded so far</p>
						</div>

						<div className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card sm:p-6'>
							<div className='flex items-center justify-between'>
								<p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500'>Activities Loaded</p>
								<RefreshCw
									className='text-emerald-400'
									size={21}
									aria-hidden='true'
								/>
							</div>
							<h3 className='mt-3 font-display text-3xl font-bold tabular-nums text-stone-50'>{activities.length}</h3>
							<p className='mt-2 text-xs text-stone-500'>Across all loaded pages</p>
						</div>
					</div>

					<div className='overflow-hidden rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] shadow-card'>
						<div className='flex flex-wrap items-center justify-between gap-4 border-b border-white/5 p-5'>
							<div>
								<h2 className='font-display font-bold text-stone-100'>Customer Directory</h2>
								<p className='mt-1 text-xs text-stone-500'>Select a customer to view their timeline.</p>
							</div>

							<div className='relative w-full sm:max-w-xs'>
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
									placeholder='Search by full name or email...'
									aria-label='Search users by full name or email'
									className='h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-10 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-brass-400 focus:bg-white/[0.06] focus:ring-4 focus:ring-brass-400/15'
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
						</div>

						{error && (
							<div
								role='alert'
								className='m-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-300'>
								{error}
							</div>
						)}

						<div className='overflow-x-auto'>
							<table className='w-full min-w-[640px] text-left'>
								<thead>
									<tr className='border-b border-white/5 text-xs uppercase tracking-wider text-stone-500'>
										<th className='px-6 py-4'>Customer</th>
										<th className='px-6 py-4'>Activities</th>
										<th className='px-6 py-4'>Last Activity</th>
										<th className='px-6 py-4 text-right'>Details</th>
									</tr>
								</thead>

								<tbody className='divide-y divide-white/5'>
									{loading ? (
										Array.from({ length: 4 }).map((_, index) => (
											<tr key={index}>
												<td className='px-6 py-4'>
													<div className='flex items-center gap-3'>
														<div className='h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10' />
														<div className='min-w-0 flex-1 space-y-2'>
															<div className='h-3.5 w-32 animate-pulse rounded bg-white/10' />
															<div className='h-3 w-44 animate-pulse rounded bg-white/5' />
														</div>
													</div>
												</td>
												<td className='px-6 py-4'>
													<div className='h-6 w-10 animate-pulse rounded-lg bg-white/5' />
												</td>
												<td className='px-6 py-4'>
													<div className='h-3.5 w-28 animate-pulse rounded bg-white/5' />
												</td>
												<td className='px-6 py-4'>
													<div className='ml-auto h-8 w-24 animate-pulse rounded-lg bg-white/5' />
												</td>
											</tr>
										))
									) : users.length === 0 ? (
										<tr>
											<td
												colSpan='4'
												className='px-6 py-12 text-center'>
												<UserRound
													className='mx-auto text-stone-600'
													size={30}
													aria-hidden='true'
												/>
												<p className='mt-3 text-sm font-medium text-stone-300'>
													{searchTerm ? 'No users match your search.' : 'No users found.'}
												</p>
												{searchTerm && (
													<p className='mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-500'>
														Nothing matches “{searchTerm}” in the loaded activities. Search matches full name or email only.
													</p>
												)}
											</td>
										</tr>
									) : (
										users.map((user) => (
											<tr
												key={user.userId}
												className='transition hover:bg-white/[0.03]'>
												{/* Avatar + full name + personal email (never User ID) */}
												<td className='px-6 py-4'>
													<div className='flex items-center gap-3'>
														{user.imageUrl ? (
															<img
																src={user.imageUrl}
																alt={user.name || UNKNOWN_CUSTOMER_LABEL}
																className='h-10 w-10 shrink-0 rounded-full object-cover'
															/>
														) : (
															<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass-300 to-brass-500 text-sm font-bold text-ink'>
																{(user.name || '?').slice(0, 1).toUpperCase()}
															</div>
														)}
														<div className='min-w-0'>
															<p
																className='truncate text-sm font-semibold text-stone-100'
																title={user.name || undefined}>
																{user.name || UNKNOWN_CUSTOMER_LABEL}
															</p>
															<p
																className='mt-0.5 truncate text-xs text-stone-500'
																title={user.email || undefined}>
																{user.email || NO_EMAIL_LABEL}
															</p>
														</div>
													</div>
												</td>

												{/* Activity count */}
												<td className='px-6 py-4'>
													<span className='rounded-lg bg-brass-400/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-brass-300'>
														{user.activityCount}
													</span>
												</td>

												{/* Last activity date */}
												<td className='whitespace-nowrap px-6 py-4 text-xs text-stone-500'>{formatDate(user.lastActivity)}</td>

												{/* View timeline button */}
												<td className='px-6 py-4 text-right'>
													<button
														type='button'
														onClick={() => setSelectedUser(user)}
														className='inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-brass-300 transition hover:bg-brass-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
														View Timeline
														<ChevronRight
															size={15}
															aria-hidden='true'
														/>
													</button>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{hasMore && (
							<div className='border-t border-white/5 p-5 text-center'>
								<button
									type='button'
									onClick={() => loadActivities(cursor)}
									disabled={loadingMore}
									className='rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-stone-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50'>
									{loadingMore ? 'Loading...' : 'Load More Users'}
								</button>
							</div>
						)}
					</div>
				</div>
			</main>

			{selectedUser && (
				<UserActivityModal
					user={selectedUser}
					onClose={() => setSelectedUser(null)}
				/>
			)}
		</div>
	);
}
