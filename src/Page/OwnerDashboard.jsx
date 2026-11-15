import { Link } from 'react-router';
import { Users, ShoppingBag, Package, MessageSquare, ArrowUpRight, Crown, ChevronRight, ShieldCheck, MoveUpRight, DollarSign } from 'lucide-react';

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
	.oc-card, .oc-card * { transition: none !important; }
	.oc-card:hover, .oc-card:focus-visible { transform: none !important; translate: none !important; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Navigation card                                                           */
/* -------------------------------------------------------------------------- */

const SectionCard = ({ section, index }) => {
	const Icon = section.icon;

	return (
		<Link
			to={section.path}
			className='oc-card oc-rise group relative flex min-h-[285px] flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-stone-900 hover:shadow-[0_30px_60px_-28px_rgba(28,25,23,.75)] focus-visible:-translate-y-1.5 focus-visible:border-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 sm:p-7'
			style={{ '--i': index + 1 }}>
			{/* Dark surface that fades in on hover / keyboard focus */}
			<span
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100'
				style={{ background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)' }}
			/>
			<span
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-70 group-focus-visible:opacity-70'
				style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
			/>
			<span
				aria-hidden='true'
				className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100'
				style={{ background: 'radial-gradient(circle, rgba(251,191,36,.28), transparent 70%)' }}
			/>

			{/* Decorative number */}
			<span
				aria-hidden='true'
				className='oc-display pointer-events-none absolute -right-2 -top-6 select-none text-[112px] font-bold leading-none tracking-tighter text-stone-100 transition-colors duration-500 group-hover:text-white/[0.06] group-focus-visible:text-white/[0.06]'>
				{section.number}
			</span>

			{/* Top */}
			<div className='relative flex items-start justify-between'>
				<div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 ring-1 ring-stone-200/80 transition-all duration-500 group-hover:bg-amber-400 group-hover:text-stone-950 group-hover:shadow-lg group-hover:shadow-amber-500/30 group-hover:ring-transparent group-focus-visible:bg-amber-400 group-focus-visible:text-stone-950 group-focus-visible:ring-transparent'>
					<Icon
						size={25}
						strokeWidth={1.7}
						aria-hidden='true'
					/>
				</div>

				<div className='flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-stone-500 transition-all duration-500 group-hover:border-amber-300/40 group-hover:bg-white group-hover:text-stone-950 group-focus-visible:border-amber-300/40 group-focus-visible:bg-white group-focus-visible:text-stone-950'>
					<ArrowUpRight
						size={19}
						aria-hidden='true'
						className='transition-transform duration-500 group-hover:rotate-45 group-focus-visible:rotate-45'
					/>
				</div>
			</div>

			{/* Content */}
			<div className='relative mt-8'>
				<p className='mb-3 text-[10px] font-bold tracking-[0.18em] text-stone-400 transition-colors duration-500 group-hover:text-amber-300 group-focus-visible:text-amber-300'>{section.subtitle}</p>

				<h3 className='oc-display text-2xl font-bold tracking-tight text-stone-900 transition-colors duration-500 group-hover:text-white group-focus-visible:text-white'>Manage {section.title}</h3>

				<p className='mt-3 max-w-md text-sm leading-7 text-stone-500 transition-colors duration-500 group-hover:text-stone-300 group-focus-visible:text-stone-300'>{section.description}</p>
			</div>

			{/* Footer */}
			<div className='relative mt-auto flex items-center justify-between border-t border-stone-100 pt-5 transition-colors duration-500 group-hover:border-white/15 group-focus-visible:border-white/15'>
				<span className='text-xs font-bold text-stone-800 transition-colors duration-500 group-hover:text-white group-focus-visible:text-white'>Explore section</span>

				<MoveUpRight
					size={17}
					aria-hidden='true'
					className='text-stone-400 transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-amber-300 group-focus-visible:-translate-y-1 group-focus-visible:translate-x-1 group-focus-visible:text-amber-300'
				/>
			</div>
		</Link>
	);
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const OwnerDashboard = () => {
	const sections = [
		{
			title: 'Users',
			subtitle: 'USER MANAGEMENT',
			description: 'View registered users, manage accounts, and control administrator roles.',
			path: '/owner/users',
			icon: Users,
			number: '01',
		},
		{
			title: 'Orders',
			subtitle: 'ORDER MANAGEMENT',
			description: 'Access all customer orders and manage the complete order lifecycle.',
			path: '/admin/orders',
			icon: ShoppingBag,
			number: '02',
		},
		{
			title: 'Products',
			subtitle: 'PRODUCT MANAGEMENT',
			description: 'Manage your product catalog and control what appears in your store.',
			path: '/admin/products',
			icon: Package,
			number: '03',
		},
		{
			title: 'Comments',
			subtitle: 'CUSTOMER EXPERIENCE',
			description: 'Review customer feedback and manage product comments.',
			path: '/admin/comments',
			icon: MessageSquare,
			number: '04',
		},
		{
			title: 'Delivered Revenue',
			subtitle: 'REVENUE & ORDERS',
			description: 'Calculate and display total sales and statistics for all delivered customer orders.',
			path: '/owner/delivered-revenue',
			icon: DollarSign,
			number: '05',
		},
	];

	// Always matches the number of cards below
	const sectionCount = String(sections.length).padStart(2, '0');

	return (
		<section className='min-h-[70vh] bg-stone-100'>
			<style>{STYLES}</style>

			{/* Hero */}
			<header className='relative overflow-hidden bg-stone-950 text-white'>
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

				<div className='relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pb-28 sm:pt-10 lg:px-10'>
					{/* Breadcrumb */}
					<nav
						aria-label='Breadcrumb'
						className='flex items-center gap-2 text-xs font-medium text-stone-400'>
						<Crown
							size={15}
							aria-hidden='true'
							className='text-amber-400'
						/>
						<span>Workspace</span>
						<ChevronRight
							size={13}
							aria-hidden='true'
						/>
						<span
							aria-current='page'
							className='font-semibold text-stone-100'>
							Owner Dashboard
						</span>
					</nav>

					<div className='mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between'>
						<div className='flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8'>
							<div className='relative h-20 w-20 shrink-0 sm:h-24 sm:w-24'>
								<span className='oc-ring absolute inset-0 rounded-[28px] border-2 border-amber-400/70' />
								<span className='relative flex h-full w-full items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950 shadow-2xl shadow-amber-900/40'>
									<Crown
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

								<h1 className='oc-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>
									Owner Dashboard
									<span className='text-amber-400'>.</span>
								</h1>

								<p className='mt-3 max-w-xl text-base text-stone-300 sm:text-lg'>Your central command for managing the store, overseeing operations, and controlling administrator permissions.</p>
							</div>
						</div>

						{/* Owner identity */}
						<div className='flex flex-col gap-3 self-start lg:self-auto'>
							<div className='flex items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/15 backdrop-blur-sm'>
								<div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'>
									<Crown
										size={22}
										strokeWidth={1.8}
										aria-hidden='true'
									/>
								</div>

								<div>
									<p className='text-sm font-bold text-white'>Store Owner</p>

									<div className='mt-1 flex items-center gap-1.5'>
										<ShieldCheck
											size={12}
											aria-hidden='true'
											className='text-amber-300'
										/>
										<span className='text-[11px] font-medium text-stone-300'>Full access control</span>
									</div>
								</div>
							</div>

							<div className='flex flex-wrap items-center gap-2'>
								<span className='inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/15'>
									<span className='relative flex h-2 w-2'>
										<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60' />
										<span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-400' />
									</span>
									<span className='text-[10px] font-bold tracking-[0.16em] text-stone-200'>OWNER ACCESS</span>
								</span>

								<span className='rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-medium tracking-[0.12em] text-stone-400 ring-1 ring-white/10'>STORE ADMINISTRATION</span>
							</div>
						</div>
					</div>
				</div>
			</header>

			<div className='relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-16 sm:-mt-12 sm:px-6 lg:px-10'>
				{/* Sections heading */}
				<div
					className='oc-rise flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6'
					style={{ '--i': 0 }}>
					<div className='flex items-center gap-4'>
						<span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-amber-300'>
							<Crown
								size={22}
								strokeWidth={1.7}
								aria-hidden='true'
							/>
						</span>

						<div className='min-w-0'>
							<p className='text-[10px] font-bold tracking-[0.19em] text-stone-400'>CONTROL PANEL</p>
							<h2 className='oc-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl'>Store Management</h2>
							<p className='mt-0.5 text-xs text-stone-500'>Manage every important part of your business.</p>
						</div>
					</div>

					<span className='w-fit rounded-full bg-stone-900 px-4 py-2 text-[10px] font-bold tracking-[0.18em] text-amber-300'>{sectionCount} MANAGEMENT SECTIONS</span>
				</div>

				{/* Management cards */}
				<div className='mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2'>
					{sections.map((section, index) => (
						<SectionCard
							key={section.path}
							section={section}
							index={index}
						/>
					))}
				</div>

				{/* Footer */}
				<div className='mt-12 flex flex-col justify-between gap-3 border-t border-stone-300/70 pt-6 sm:flex-row sm:items-center'>
					<div className='flex items-center gap-2'>
						<Crown
							size={13}
							aria-hidden='true'
							className='text-amber-500'
						/>
						<p className='text-[10px] font-bold tracking-[0.16em] text-stone-500'>OWNER CONTROL CENTER</p>
					</div>

					<p className='text-[11px] text-stone-400'>Complete control. One workspace.</p>
				</div>
			</div>
		</section>
	);
};

export default OwnerDashboard;
