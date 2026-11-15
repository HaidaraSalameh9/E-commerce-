import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';
import { Search, Users, RefreshCw, ChevronRight, UserRound, Menu } from 'lucide-react';

import UserActivityModal from '../components/admin/UserActivityModal';
import ActivitySidebar from '../components/admin/ActivitySidbar';
import { getAllUserActivities } from '../services/adminActivityService';
import useSidebarState from '../components/admin/Useactivitysidebar';

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

			const existing = usersMap.get(activity.userId);

			if (!existing) {
				usersMap.set(activity.userId, {
					userId: activity.userId,
					// Carry Clerk profile from the activity.user object (enriched by backend)
					name: activity.user?.name || null,
					email: activity.user?.email || null,
					imageUrl: activity.user?.imageUrl || null,
					activityCount: 1,
					lastActivity: activity.createdAt,
				});
			} else {
				existing.activityCount += 1;

				// Upgrade name/email if we now have a richer profile
				if (!existing.name && activity.user?.name) {
					existing.name = activity.user.name;
					existing.email = activity.user.email || existing.email;
					existing.imageUrl = activity.user.imageUrl || existing.imageUrl;
				}

				if (new Date(activity.createdAt) > new Date(existing.lastActivity)) {
					existing.lastActivity = activity.createdAt;
				}
			}
		});

		const searchLower = search.trim().toLowerCase();

		return Array.from(usersMap.values())
			.filter((user) => {
				if (!searchLower) return true;
				return (
					user.userId.toLowerCase().includes(searchLower) ||
					(user.name && user.name.toLowerCase().includes(searchLower)) ||
					(user.email && user.email.toLowerCase().includes(searchLower))
				);
			})
			.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
	}, [activities, search]);

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

					<div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
						<div className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card'>
							<div className='flex items-center justify-between'>
								<p className='text-sm text-stone-400'>Users Found</p>
								<Users
									className='text-brass-300'
									size={21}
									aria-hidden='true'
								/>
							</div>
							<h3 className='mt-3 font-display text-3xl font-bold text-stone-50'>{users.length}</h3>
							<p className='mt-2 text-xs text-stone-500'>In the activities loaded so far</p>
						</div>

						<div className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card'>
							<div className='flex items-center justify-between'>
								<p className='text-sm text-stone-400'>Activities Loaded</p>
								<RefreshCw
									className='text-emerald-400'
									size={21}
									aria-hidden='true'
								/>
							</div>
							<h3 className='mt-3 font-display text-3xl font-bold text-stone-50'>{activities.length}</h3>
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
									type='text'
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder='Search by name, email, or user ID...'
									aria-label='Search users'
									className='h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-brass-400 focus:bg-white/[0.06] focus:ring-4 focus:ring-brass-400/15'
								/>
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
							<table className='w-full min-w-[750px] text-left'>
								<thead>
									<tr className='border-b border-white/5 text-xs uppercase tracking-wider text-stone-500'>
										<th className='px-6 py-4'>Customer</th>
										<th className='px-6 py-4'>Name / Email</th>
										<th className='px-6 py-4'>Activities</th>
										<th className='px-6 py-4'>Last Activity</th>
										<th className='px-6 py-4 text-right'>Details</th>
									</tr>
								</thead>

								<tbody className='divide-y divide-white/5'>
									{loading ? (
										<tr>
											<td
												colSpan='5'
												className='px-6 py-12 text-center text-sm text-stone-500'>
												Loading users...
											</td>
										</tr>
									) : users.length === 0 ? (
										<tr>
											<td
												colSpan='5'
												className='px-6 py-12 text-center'>
												<UserRound
													className='mx-auto text-stone-600'
													size={30}
													aria-hidden='true'
												/>
												<p className='mt-3 text-sm text-stone-400'>No users found.</p>
											</td>
										</tr>
									) : (
										users.map((user) => (
											<tr
												key={user.userId}
												className='transition hover:bg-white/[0.03]'>
												{/* Avatar + User ID */}
												<td className='px-6 py-4'>
													<div className='flex items-center gap-3'>
														{user.imageUrl ? (
															<img
																src={user.imageUrl}
																alt={user.name || 'Customer'}
																className='h-10 w-10 rounded-full object-cover'
															/>
														) : (
															<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass-300 to-brass-500 text-sm font-bold text-ink'>
																{(user.name || '?').slice(0, 1).toUpperCase()}
															</div>
														)}
														<div className='min-w-0'>
															<p className='truncate text-sm font-semibold text-stone-100'>{user.name || 'Customer'}</p>
															<p className='mt-0.5 truncate font-mono text-xs text-stone-500'>{user.userId}</p>
														</div>
													</div>
												</td>

												{/* Name + Email column */}
												<td className='px-6 py-4'>
													<p className='text-sm text-stone-300'>
														{user.name ? user.name : <em className='text-stone-500'>No name</em>}
													</p>
													<p className='mt-0.5 text-xs text-stone-500'>{user.email || '—'}</p>
												</td>

												{/* Activity count */}
												<td className='px-6 py-4'>
													<span className='rounded-lg bg-brass-400/10 px-3 py-1.5 text-xs font-semibold text-brass-300'>
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
