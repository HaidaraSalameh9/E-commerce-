import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';
import { Users, ShieldCheck, UserRound, Crown, Search, RefreshCw, Shield, ChevronDown, Mail, Fingerprint, UserCog } from 'lucide-react';

import { getAllUsers, updateUserRole } from '../services/userRoleService';

/* -------------------------------------------------------------------------- */
/*  Styles (same design language as Cart / Checkout / OrderConfirm)           */
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
	.oc-hover { transition: none !important; }
	.oc-hover:hover { transform: none !important; translate: none !important; }
}
`;

const ROLE_STYLES = {
	owner: 'bg-amber-50 text-amber-800 border-amber-200',
	admin: 'bg-stone-900 text-amber-300 border-stone-900',
	user: 'bg-stone-100 text-stone-700 border-stone-200',
};

const ROLE_ICONS = {
	owner: Crown,
	admin: ShieldCheck,
	user: UserRound,
};

const SELECT_CLASS =
	'h-10 appearance-none rounded-xl border border-stone-300 bg-white py-2 pl-3 pr-14 text-xs font-semibold text-stone-800 shadow-sm outline-none transition hover:border-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/25 disabled:cursor-not-allowed disabled:opacity-50';

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

const UserAvatar = ({ user, role }) => {
	const ring = role === 'owner' ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white' : 'ring-1 ring-stone-200';

	return user.imageUrl ? (
		<img
			src={user.imageUrl}
			alt={`${user.name || 'User'} profile`}
			referrerPolicy='no-referrer'
			className={`h-12 w-12 shrink-0 rounded-full object-cover ${ring}`}
		/>
	) : (
		<div className={`oc-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-900 text-base font-bold text-amber-300 ${ring}`}>{(user.name || 'U').charAt(0).toUpperCase()}</div>
	);
};

const RoleBadge = ({ role }) => {
	const RoleIcon = ROLE_ICONS[role] || UserRound;

	return (
		<span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${ROLE_STYLES[role] || ROLE_STYLES.user}`}>
			<RoleIcon
				size={14}
				aria-hidden='true'
			/>
			{role}
		</span>
	);
};

// Same controls and handler as before — only the look changed.
const RoleControl = ({ user, role, savingUserId, onRoleChange, fullWidth = false }) => {
	if (role === 'owner') {
		return (
			<span className='inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200'>
				<Crown
					size={15}
					aria-hidden='true'
				/>
				Protected Owner
			</span>
		);
	}

	return (
		<div className={`relative items-center ${fullWidth ? 'flex w-full sm:w-auto' : 'inline-flex'}`}>
			<select
				aria-label={`Change role for ${user.name || user.userId}`}
				value={['admin', 'user'].includes(role) ? role : 'user'}
				disabled={savingUserId === user.userId}
				onChange={(event) => onRoleChange(user.userId, event.target.value)}
				className={`${SELECT_CLASS} ${fullWidth ? 'w-full sm:w-44' : 'w-44'}`}>
				<option value='user'>Customer</option>
				<option value='admin'>Administrator</option>
			</select>

			<ChevronDown
				size={14}
				aria-hidden='true'
				className='pointer-events-none absolute right-3 text-stone-400'
			/>

			{savingUserId === user.userId && (
				<RefreshCw
					size={13}
					aria-hidden='true'
					className='pointer-events-none absolute right-9 animate-spin text-amber-600'
				/>
			)}
		</div>
	);
};

const EmptyState = () => (
	<div className='px-6 py-16 text-center'>
		<div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400 ring-8 ring-stone-50'>
			<Users
				size={26}
				aria-hidden='true'
			/>
		</div>

		<h3 className='oc-display mt-5 text-lg font-bold text-stone-900'>No users found</h3>

		<p className='mt-1.5 text-sm text-stone-500'>Try changing your search or role filter.</p>
	</div>
);

const HeroBackdrop = () => (
	<>
		<div
			className='pointer-events-none absolute inset-0'
			style={{ background: 'radial-gradient(60% 90% at 90% 0%, rgba(251,191,36,.24), transparent 60%), radial-gradient(45% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
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
	</>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const OwnerUsers = () => {
	const { getToken, isLoaded, isSignedIn } = useAuth();

	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [savingUserId, setSavingUserId] = useState(null);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	const [search, setSearch] = useState('');
	const [roleFilter, setRoleFilter] = useState('all');

	const loadUsers = useCallback(async () => {
		if (!isLoaded) return;

		if (!isSignedIn) {
			setUsers([]);
			setError('Please sign in first.');
			setLoading(false);
			return;
		}

		setLoading(true);
		setError('');
		setMessage('');

		try {
			const data = await getAllUsers(getToken);
			setUsers(data);
		} catch (err) {
			setError(err.message || 'Could not load users.');
		} finally {
			setLoading(false);
		}
	}, [getToken, isLoaded, isSignedIn]);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	const handleRoleChange = async (userId, role) => {
		if (!['user', 'admin'].includes(role)) return;

		setSavingUserId(userId);
		setError('');
		setMessage('');

		try {
			await updateUserRole(userId, role, getToken);

			setUsers((currentUsers) => currentUsers.map((user) => (user.userId === userId ? { ...user, role } : user)));

			setMessage(`Role updated successfully for ${userId}.`);
		} catch (err) {
			setError(err.message || 'Could not update user role.');
		} finally {
			setSavingUserId(null);
		}
	};

	const stats = useMemo(
		() => ({
			total: users.length,
			admins: users.filter((user) => user.role === 'admin').length,
			customers: users.filter((user) => user.role === 'user' || !user.role).length,
			owners: users.filter((user) => user.role === 'owner').length,
		}),
		[users],
	);

	const filteredUsers = useMemo(() => {
		return users.filter((user) => {
			const searchValue = search.trim().toLowerCase();

			const matchesSearch = !searchValue || user.name?.toLowerCase().includes(searchValue) || user.email?.toLowerCase().includes(searchValue) || user.userId?.toLowerCase().includes(searchValue);

			const matchesRole = roleFilter === 'all' || (roleFilter === 'user' && (!user.role || user.role === 'user')) || user.role === roleFilter;

			return matchesSearch && matchesRole;
		});
	}, [users, search, roleFilter]);

	const statCards = [
		{
			title: 'Total Users',
			value: stats.total,
			icon: Users,
			color: 'text-amber-300',
			bg: 'bg-stone-900',
			description: 'All registered accounts',
		},
		{
			title: 'Administrators',
			value: stats.admins,
			icon: ShieldCheck,
			color: 'text-stone-950',
			bg: 'bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg shadow-amber-500/30',
			description: 'Users with admin access',
		},
		{
			title: 'Customers',
			value: stats.customers,
			icon: UserRound,
			color: 'text-stone-700',
			bg: 'bg-stone-100 ring-1 ring-stone-200',
			description: 'Standard user accounts',
		},
		{
			title: 'Owners',
			value: stats.owners,
			icon: Crown,
			color: 'text-amber-700',
			bg: 'bg-amber-50 ring-1 ring-amber-200',
			description: 'Store owners',
		},
	];

	if (!isLoaded || loading) {
		return (
			<div
				role='status'
				aria-label='Loading users'
				className='min-h-screen bg-stone-100'>
				<style>{STYLES}</style>

				<div className='relative overflow-hidden bg-stone-950'>
					<HeroBackdrop />
					<div className='relative mx-auto max-w-[1500px] animate-pulse px-5 pb-28 pt-10 sm:px-8 sm:pb-32 lg:px-10'>
						<div className='h-3 w-48 rounded-full bg-white/10' />
						<div className='mt-8 flex items-center gap-6'>
							<div className='h-20 w-20 shrink-0 rounded-[28px] bg-white/10 sm:h-24 sm:w-24' />
							<div className='flex-1 space-y-3'>
								<div className='h-9 w-3/4 max-w-sm rounded-full bg-white/10' />
								<div className='h-4 w-full max-w-md rounded-full bg-white/5' />
							</div>
						</div>
					</div>
				</div>

				<div className='relative z-10 mx-auto -mt-24 max-w-[1500px] space-y-6 px-5 pb-16 sm:-mt-28 sm:space-y-8 sm:px-8 lg:px-10'>
					<div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
						{[1, 2, 3, 4].map((item) => (
							<div
								key={item}
								className='h-36 animate-pulse rounded-[28px] border border-stone-200 bg-white shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)]'
							/>
						))}
					</div>

					<div className='h-96 animate-pulse rounded-[28px] border border-stone-200 bg-white shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)]' />

					<p className='text-center text-sm font-medium text-stone-500'>Loading users...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-stone-100'>
			<style>{STYLES}</style>

			{/* Hero */}
			<header className='relative overflow-hidden bg-stone-950 text-white'>
				<HeroBackdrop />

				<div className='relative mx-auto max-w-[1500px] px-5 pb-28 pt-8 sm:px-8 sm:pb-32 sm:pt-10 lg:px-10'>
					<div className='flex items-center gap-2 text-xs font-medium text-stone-400'>
						<Crown
							size={14}
							aria-hidden='true'
							className='text-amber-400'
						/>
						<span>Workspace</span>
						<span>/</span>
						<span className='font-semibold text-stone-100'>User Management</span>
					</div>

					<div className='mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
						<div className='flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8'>
							<div className='relative h-20 w-20 shrink-0 sm:h-24 sm:w-24'>
								<span className='oc-ring absolute inset-0 rounded-[28px] border-2 border-amber-400/70' />
								<span className='relative flex h-full w-full items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950 shadow-2xl shadow-amber-900/40'>
									<Users
										size={38}
										strokeWidth={1.7}
										aria-hidden='true'
									/>
								</span>
							</div>

							<div className='min-w-0'>
								<p className='mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 ring-1 ring-white/15'>
									<Crown
										size={13}
										aria-hidden='true'
										className='text-amber-400'
									/>
									Owner Control Center
								</p>

								<h1 className='oc-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>User Management</h1>

								<p className='mt-3 max-w-xl text-base text-stone-300 sm:text-lg'>Manage accounts, monitor roles and control access to your store.</p>
							</div>
						</div>

						<button
							type='button'
							onClick={loadUsers}
							disabled={loading}
							className='group inline-flex items-center justify-center gap-2.5 self-start rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3.5 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/25 transition hover:shadow-xl hover:shadow-amber-500/40 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:self-auto'>
							<RefreshCw
								size={16}
								aria-hidden='true'
								className={`transition-transform duration-500 group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`}
							/>
							Refresh Users
						</button>
					</div>

					{/* Statistics heading */}
					<div className='mt-10'>
						<h2 className='oc-display text-lg font-bold text-white'>Account Overview</h2>

						<p className='mt-1 text-xs text-stone-400'>Summary of registered users and their permissions.</p>
					</div>
				</div>
			</header>

			<main className='relative z-10 mx-auto -mt-24 max-w-[1500px] space-y-6 px-5 pb-16 sm:-mt-28 sm:space-y-8 sm:px-8 lg:px-10'>
				{/* Statistics */}
				<section aria-label='Account overview'>
					<div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
						{statCards.map((card, index) => {
							const Icon = card.icon;

							return (
								<div
									key={card.title}
									style={{ '--i': index }}
									className='oc-rise oc-hover relative overflow-hidden rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)]'>
									<div
										className='pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full'
										style={{ background: 'radial-gradient(circle, rgba(251,191,36,.16), transparent 70%)' }}
									/>

									<div className='relative flex items-start justify-between gap-3'>
										<div>
											<p className='text-sm font-medium text-stone-500'>{card.title}</p>

											<h3 className='oc-display mt-3 text-4xl font-bold tracking-tight text-stone-900'>{card.value}</h3>
										</div>

										<div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
											<Icon
												size={22}
												aria-hidden='true'
											/>
										</div>
									</div>

									<p className='relative mt-5 border-t border-dashed border-stone-200 pt-4 text-xs text-stone-400'>{card.description}</p>
								</div>
							);
						})}
					</div>
				</section>

				{/* Notifications */}
				{error && (
					<div
						role='alert'
						className='flex items-center gap-3 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-800 shadow-[0_18px_40px_-26px_rgba(190,18,60,.35)]'>
						<span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-4 ring-rose-50/60'>
							<Shield
								size={17}
								aria-hidden='true'
							/>
						</span>
						{error}
					</div>
				)}

				{message && (
					<div
						role='status'
						className='flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-emerald-800 shadow-[0_18px_40px_-26px_rgba(5,150,105,.3)]'>
						<span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60'>
							<ShieldCheck
								size={17}
								aria-hidden='true'
							/>
						</span>
						{message}
					</div>
				)}

				{/* Users */}
				<section className='overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)]'>
					{/* Table header */}
					<div className='flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 px-5 py-5 sm:px-7'>
						<div>
							<div className='mb-2 flex items-center gap-2'>
								<span className='h-1.5 w-8 rounded-full bg-gradient-to-r from-amber-300 to-amber-500' />
								<span className='text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400'>Accounts</span>
							</div>

							<h2 className='oc-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl'>All Users</h2>

							<p className='mt-1 text-xs text-stone-500'>View and manage your store accounts.</p>
						</div>

						<span className='rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-amber-300'>{filteredUsers.length} Results</span>
					</div>

					{/* Search and filters */}
					<div className='flex flex-col gap-3 border-b border-stone-100 bg-stone-50/60 p-4 sm:flex-row sm:p-5'>
						<div className='relative flex-1'>
							<Search
								size={17}
								aria-hidden='true'
								className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400'
							/>

							<input
								type='text'
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder='Search by name, email or user ID...'
								aria-label='Search users'
								className='h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 text-base text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/25 sm:text-sm'
							/>
						</div>

						<div className='relative'>
							<UserCog
								size={16}
								aria-hidden='true'
								className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400'
							/>

							<select
								value={roleFilter}
								onChange={(event) => setRoleFilter(event.target.value)}
								aria-label='Filter by role'
								className='h-12 w-full appearance-none rounded-xl border border-stone-300 bg-white py-2 pl-10 pr-10 text-base font-medium text-stone-700 shadow-sm outline-none transition hover:border-stone-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/25 sm:w-52 sm:text-sm'>
								<option value='all'>All Roles</option>
								<option value='owner'>Owners</option>
								<option value='admin'>Admins</option>
								<option value='user'>Customers</option>
							</select>

							<ChevronDown
								size={15}
								aria-hidden='true'
								className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400'
							/>
						</div>
					</div>

					{/* Desktop: table */}
					<div className='hidden xl:block'>
						<table className='w-full text-left'>
							<thead className='bg-stone-50'>
								<tr className='text-[11px] font-semibold uppercase tracking-wider text-stone-400'>
									<th className='px-7 py-4'>User</th>
									<th className='px-5 py-4'>Email Address</th>
									<th className='px-5 py-4'>Role</th>
									<th className='px-5 py-4'>User ID</th>
									<th className='px-7 py-4'>Manage Access</th>
								</tr>
							</thead>

							<tbody className='divide-y divide-stone-100'>
								{filteredUsers.length === 0 ? (
									<tr>
										<td colSpan='5'>
											<EmptyState />
										</td>
									</tr>
								) : (
									filteredUsers.map((user) => {
										const role = user.role || 'user';

										return (
											<tr
												key={user.userId}
												className='group transition hover:bg-amber-50/40'>
												{/* User */}
												<td className='px-7 py-5'>
													<div className='flex items-center gap-4'>
														<UserAvatar
															user={user}
															role={role}
														/>

														<div className='min-w-0'>
															<p className='font-semibold text-stone-900'>{user.name || 'Unnamed User'}</p>

															<p className='mt-1 text-xs text-stone-400'>Registered Account</p>
														</div>
													</div>
												</td>

												{/* Email */}
												<td className='px-5 py-5'>
													<div className='flex items-center gap-2 text-sm text-stone-600'>
														<Mail
															size={15}
															aria-hidden='true'
															className='shrink-0 text-stone-400'
														/>
														<span className='break-all'>{user.email || 'No email'}</span>
													</div>
												</td>

												{/* Role */}
												<td className='px-5 py-5'>
													<RoleBadge role={role} />
												</td>

												{/* User ID */}
												<td className='px-5 py-5'>
													<div className='flex max-w-[170px] items-center gap-2'>
														<Fingerprint
															size={15}
															aria-hidden='true'
															className='shrink-0 text-stone-400'
														/>

														<span
															title={user.userId}
															className='truncate font-mono text-xs text-stone-500'>
															{user.userId}
														</span>
													</div>
												</td>

												{/* Role management */}
												<td className='px-7 py-5'>
													<RoleControl
														user={user}
														role={role}
														savingUserId={savingUserId}
														onRoleChange={handleRoleChange}
													/>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{/* Tablet / mobile: cards (no horizontal scrolling) */}
					<div className='xl:hidden'>
						{filteredUsers.length === 0 ? (
							<EmptyState />
						) : (
							<div className='grid gap-4 p-4 sm:p-5 md:grid-cols-2'>
								{filteredUsers.map((user, index) => {
									const role = user.role || 'user';

									return (
										<article
											key={user.userId}
											style={{ '--i': Math.min(index, 8) }}
											className='oc-rise oc-hover rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_24px_48px_-28px_rgba(28,25,23,.45)] sm:p-5'>
											<div className='flex items-start justify-between gap-3'>
												<div className='flex min-w-0 items-center gap-3'>
													<UserAvatar
														user={user}
														role={role}
													/>

													<div className='min-w-0'>
														<p className='truncate font-semibold text-stone-900'>{user.name || 'Unnamed User'}</p>

														<p className='mt-0.5 text-xs text-stone-400'>Registered Account</p>
													</div>
												</div>

												<RoleBadge role={role} />
											</div>

											<div className='mt-4 space-y-3 rounded-xl bg-stone-50 p-3.5 ring-1 ring-inset ring-stone-100'>
												<div className='flex items-start gap-2.5 text-sm text-stone-600'>
													<Mail
														size={15}
														aria-hidden='true'
														className='mt-0.5 shrink-0 text-stone-400'
													/>
													<span className='min-w-0 break-all'>{user.email || 'No email'}</span>
												</div>

												<div className='flex items-center gap-2.5'>
													<Fingerprint
														size={15}
														aria-hidden='true'
														className='shrink-0 text-stone-400'
													/>

													<span
														title={user.userId}
														className='min-w-0 truncate font-mono text-xs text-stone-500'>
														{user.userId}
													</span>
												</div>
											</div>

											<div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
												<span className='text-[11px] font-semibold uppercase tracking-wider text-stone-400'>Manage Access</span>

												<RoleControl
													user={user}
													role={role}
													savingUserId={savingUserId}
													onRoleChange={handleRoleChange}
													fullWidth
												/>
											</div>
										</article>
									);
								})}
							</div>
						)}
					</div>

					{/* Footer */}
					<div className='flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/60 px-5 py-4 sm:px-7'>
						<p className='text-xs text-stone-500'>
							Showing <span className='font-semibold text-stone-800'>{filteredUsers.length}</span> of <span className='font-semibold text-stone-800'>{users.length}</span> users
						</p>

						<p className='flex items-center gap-2 text-xs text-stone-400'>
							<ShieldCheck
								size={14}
								aria-hidden='true'
								className='text-amber-500'
							/>
							Role changes are protected
						</p>
					</div>
				</section>
			</main>
		</div>
	);
};

export default OwnerUsers;
