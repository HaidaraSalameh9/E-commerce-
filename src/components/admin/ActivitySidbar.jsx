import { NavLink, Link } from 'react-router';
import { Activity, LayoutDashboard, Users, ArrowLeft, Zap, ChevronsLeft, ChevronsRight, X } from 'lucide-react';

const navigation = [
	{
		title: 'Dashboard',
		path: '/admin',
		icon: LayoutDashboard,
		end: true,
	},
	{
		title: 'Overview',
		path: '/admin/activity',
		icon: Activity,
		end: true,
	},
	{
		title: 'All Activities',
		path: '/admin/activity/events',
		icon: Activity,
	},
	{
		title: 'Users',
		path: '/admin/activity/users',
		icon: Users,
	},
];

/**
 * ActivitySidebar — same props as before, so every page that already
 * renders it keeps working unchanged:
 *   collapsed  – desktop icon rail (persisted by the parent)
 *   mobileOpen – mobile/tablet overlay drawer (transient)
 *   onToggle   – collapses/expands on desktop, opens/closes on mobile
 *   onCloseMobile – closes the mobile drawer (link tap, backdrop, ✕)
 *
 * Fixes vs. the previous version:
 *  1. Width is explicit on every breakpoint: 260px on mobile in ALL
 *     states, 260px expanded / 78px collapsed on desktop. The old
 *     expression only set the collapsed desktop width, which left the
 *     expanded desktop width implied rather than stated.
 *  2. Labels are no longer unmounted when collapsing. They stay in
 *     the DOM and shrink away with a max-width / opacity transition,
 *     so the rail animates smoothly instead of jumping. (Unmounting
 *     the labels mid-animation was the visible "jump" when toggling.)
 *  3. The nav is the only scrollable region (flex-1 + overflow-y-auto
 *     with min-h-0); brand row, status card, collapse button and
 *     footer are shrink-0, so they never scroll away or get squashed.
 *  4. Brand row and the page header are both 76px, so they line up.
 *  5. Active item: gold wash + gold left bar; inactive items keep a
 *     quiet hover. Focus rings are gold throughout.
 *
 * NOTE on the screenshot overlap: the sidebar itself is correct here
 * (fixed, full-height, z-50, never overlapping the admin main column
 * — the parent offsets content by the same 260px / 78px). The sliced
 * "Al-Haidara" logo in your screenshot comes from the public site
 * navbar ALSO rendering on /admin/* routes. That navbar lives outside
 * these five files, so it is intentionally untouched — hide it on
 * admin routes in your App layout (see the handover message).
 */
export default function ActivitySidebar({ collapsed = false, mobileOpen = false, onToggle, onCloseMobile }) {
	// Labels stay visible on the mobile drawer even if "collapsed" (set on desktop) is
	// also true in storage — a drawer the visitor just opened should never be icon-only.
	const rail = collapsed && !mobileOpen;

	// Labels animate away instead of unmounting: max-width + opacity
	// transitions keep the collapse smooth and the layout stable.
	const labelClass = `min-w-0 overflow-hidden whitespace-nowrap transition-all duration-500 ease-soft ${
		rail ? 'max-w-0 opacity-0' : 'max-w-[190px] opacity-100'
	}`;

	return (
		<>
			{/* Tap-away layer behind the mobile drawer */}
			{mobileOpen && (
				<div
					aria-hidden='true'
					onClick={onCloseMobile}
					className='fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden'
				/>
			)}

			<aside
				aria-label='Admin navigation'
				className={`fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-graphite to-ink text-white ring-1 ring-white/10 transition-[width,transform] duration-500 ease-soft ${
					mobileOpen ? 'translate-x-0' : '-translate-x-full'
				} lg:translate-x-0 ${collapsed ? 'w-[260px] lg:w-[78px]' : 'w-[260px] lg:w-[260px]'}`}>
				{/* same atmosphere as the other dark panels */}
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(70% 50% at 0% 0%, rgba(212,175,55,.14), transparent 60%)' }}
				/>

				{/* Brand — 76px, exactly the height of the page header */}
				<div className='relative flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-4'>
					<Link
						to='/admin/activity'
						onClick={onCloseMobile}
						className={`flex min-w-0 items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 ${rail ? 'gap-0' : 'gap-3'}`}>
						<span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brass-400/15 text-brass-300'>
							<Activity
								size={21}
								aria-hidden='true'
							/>
						</span>
						<span className={labelClass}>
							<span className='block font-display text-lg font-bold leading-tight tracking-wide text-white'>PULSE</span>
							<span className='block text-[10px] tracking-[2px] text-stone-500'>ACTIVITY CENTER</span>
						</span>
					</Link>

					{/* Mobile: a dedicated close control */}
					<button
						type='button'
						onClick={onCloseMobile}
						aria-label='Close sidebar'
						className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400 lg:hidden'>
						<X
							size={18}
							aria-hidden='true'
						/>
					</button>
				</div>

				{/* Monitoring status */}
				<div className='relative mt-6 shrink-0 px-3'>
					<div className={`flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 ${rail ? 'justify-center px-2 py-2.5' : 'px-3 py-3'}`}>
						<span
							aria-hidden='true'
							className='h-2 w-2 shrink-0 rounded-full bg-emerald-400'
						/>
						<span className={labelClass}>
							<span className='block text-xs font-medium text-emerald-400'>Monitoring Active</span>
							<span className='mt-0.5 block text-[11px] leading-relaxed text-stone-500'>Your store activity is being monitored.</span>
						</span>
					</div>
				</div>

				{/* Navigation — the ONLY scrollable region */}
				<nav className='relative min-h-0 flex-1 overflow-y-auto px-2.5 py-7'>
					{!rail && <p className='mb-4 px-2.5 text-[10px] font-semibold tracking-[2px] text-stone-500'>WORKSPACE</p>}

					<div className='space-y-1'>
						{navigation.map((item) => {
							const Icon = item.icon;

							return (
								<NavLink
									key={item.path}
									to={item.path}
									end={item.end}
									onClick={onCloseMobile}
									title={rail ? item.title : undefined}
									className={({ isActive }) =>
										`group relative flex items-center rounded-xl px-3 py-3 text-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400 ${
											rail ? 'justify-center gap-0' : 'gap-3'
										} ${isActive ? 'bg-brass-400/15 text-brass-200' : 'text-stone-400 hover:bg-white/5 hover:text-white'}`
									}>
									{({ isActive }) => (
										<>
											{isActive && (
												<span
													aria-hidden='true'
													className='absolute inset-y-1.5 left-0 w-1 rounded-full bg-gradient-to-b from-brass-300 to-brass-500'
												/>
											)}
											<Icon
												size={19}
												className='shrink-0'
												aria-hidden='true'
											/>
											<span className={labelClass}>
												<span className='font-medium'>{item.title}</span>
											</span>
										</>
									)}
								</NavLink>
							);
						})}
					</div>
				</nav>

				{/* Desktop collapse control */}
				<button
					type='button'
					onClick={onToggle}
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					aria-expanded={!collapsed}
					className='relative hidden shrink-0 items-center gap-3 border-t border-white/10 px-3 py-3.5 text-sm text-stone-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400 lg:flex'>
					{rail ? (
						<ChevronsRight
							size={18}
							className='mx-auto shrink-0'
							aria-hidden='true'
						/>
					) : (
						<>
							<ChevronsLeft
								size={18}
								className='shrink-0'
								aria-hidden='true'
							/>
							<span className='font-medium'>Collapse</span>
						</>
					)}
				</button>

				{/* Footer */}
				<div className='relative shrink-0 border-t border-white/10 p-2.5'>
					<Link
						to='/admin'
						onClick={onCloseMobile}
						title={rail ? 'Back to Admin Panel' : undefined}
						className={`flex items-center rounded-xl px-3 py-3 text-sm text-stone-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400 ${
							rail ? 'justify-center gap-0' : 'gap-3'
						}`}>
						<ArrowLeft
							size={18}
							className='shrink-0'
							aria-hidden='true'
						/>
						<span className={labelClass}>
							<span>Back to Admin Panel</span>
						</span>
					</Link>

					{!rail && (
						<div className='mt-3 flex items-center gap-2 px-3 text-[10px] tracking-wider text-stone-600'>
							<Zap
								size={12}
								aria-hidden='true'
							/>
							PULSE ACTIVITY SYSTEM
						</div>
					)}
				</div>
			</aside>
		</>
	);
}
