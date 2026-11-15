import React, { useEffect, useRef, useState } from 'react';

import logo from './../../public/logo.png';
import { GiShoppingCart } from 'react-icons/gi';
import SearchInput from './SearchInput';

import { useAuth, useClerk, useUser, UserButton } from '@clerk/react';
import { getMyRole } from '../services/userRoleService';

import { Link, NavLink } from 'react-router';
import { useSelector } from 'react-redux';
import { FaHeart } from 'react-icons/fa';
import { LuSearch, LuX } from 'react-icons/lu';

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                               */
/* -------------------------------------------------------------------------- */

const ICON_BTN =
	'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg text-white/80 ring-1 ring-white/15 transition duration-300 hover:bg-white/15 hover:text-white hover:ring-brass-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400';

const LOGIN_BTN =
	'rounded-full bg-gradient-to-r from-brass-300 to-brass-500 font-semibold text-ink shadow-lg shadow-brass-500/20 transition duration-300 hover:from-brass-200 hover:to-brass-400 hover:shadow-brass-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95';

// key={count} remounts the badge, so it pops every time the number changes
const CountBadge = ({ count }) =>
	count > 0 ? (
		<span
			key={count}
			aria-hidden='true'
			className='absolute -right-1 -top-1 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-brass-400 px-1 text-[10px] font-bold leading-none text-ink ring-2 ring-ink'>
			{count > 99 ? '99+' : count}
		</span>
	) : null;

const desktopLinkClass = ({ isActive }) =>
	`rounded-full px-3 py-2 text-sm font-medium transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400 xl:px-4 ${isActive ? 'bg-brass-400/15 text-brass-300 ring-1 ring-inset ring-brass-400/30' : 'text-white/70 hover:bg-white/10 hover:text-white'}`;

const Wordmark = ({ className = '' }) => <span className={`font-script text-[30px] leading-none text-wordmark ${className}`}>Al-Haidara</span>;

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                    */
/* -------------------------------------------------------------------------- */

const Navbar = () => {
	const { user } = useUser();
	const { getToken, isSignedIn } = useAuth();
	const [userRole, setUserRole] = useState(null);

	useEffect(() => {
		let isActive = true;

		const fetchUserRole = async () => {
			if (!isSignedIn) {
				setUserRole(null);
				return;
			}

			try {
				const role = await getMyRole(getToken);
				if (isActive) setUserRole(role);
			} catch (error) {
				console.error('Could not retrieve user role:', error);
				if (isActive) setUserRole(null);
			}
		};

		fetchUserRole();

		return () => {
			isActive = false;
		};
	}, [getToken, isSignedIn]);

	const navLinks = [
		{ name: 'Home', path: '/', show: true },
		{ name: 'Products', path: '/products', show: true },
		{ name: 'Owner', path: '/owner', show: userRole === 'owner' },
		{ name: 'My Order', path: '/my-orders', show: !!user },
		{ name: 'admin', path: '/admin', show: userRole === 'admin' || userRole === 'owner' },
		{ name: 'Contact', path: '/contact', show: true },
		{ name: 'About', path: '/about', show: true },
	];

	// The same role-based links are used by the desktop bar and mobile menu.
	const visibleLinks = navLinks.filter((link) => link.show);

	const menuRef = useRef(null);
	const menuBtnRef = useRef(null);
	const closeBtnRef = useRef(null);

	const [isScrolled, setIsScrolled] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);

	const { openSignIn } = useClerk();

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};
		handleScroll();

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Escape closes the mobile menu / search sheet and gives focus back to its button
	useEffect(() => {
		if (!isMenuOpen && !isSearchOpen) return;

		const onKeyDown = (e) => {
			if (e.key !== 'Escape') return;
			if (isMenuOpen) {
				setIsMenuOpen(false);
				menuBtnRef.current?.focus();
			}
			setIsSearchOpen(false);
		};

		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [isMenuOpen, isSearchOpen]);

	// Menu open: lock page scroll and move focus into the menu
	useEffect(() => {
		if (!isMenuOpen) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const frame = requestAnimationFrame(() => closeBtnRef.current?.focus());

		return () => {
			document.body.style.overflow = previousOverflow;
			cancelAnimationFrame(frame);
		};
	}, [isMenuOpen]);

	// Growing into the desktop layout closes any open mobile UI
	useEffect(() => {
		const query = window.matchMedia('(min-width: 1024px)');
		const onChange = (e) => {
			if (e.matches) {
				setIsMenuOpen(false);
				setIsSearchOpen(false);
			}
		};

		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}, []);

	const products = useSelector((state) => state.cart.product);
	const favorites = useSelector((state) => state.favorite.product);

	const closeMenu = () => {
		setIsMenuOpen(false);
		menuBtnRef.current?.focus();
	};

	// Keep Tab inside the open mobile menu
	const trapFocus = (e) => {
		if (e.key !== 'Tab') return;
		const items = menuRef.current?.querySelectorAll('a[href], button:not([disabled])');
		if (!items?.length) return;

		const first = items[0];
		const last = items[items.length - 1];

		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};

	return (
		<>
			{/* Tap-away layer behind the mobile search sheet */}
			{isSearchOpen && (
				<div
					aria-hidden='true'
					onClick={() => setIsSearchOpen(false)}
					className='fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm lg:hidden'
				/>
			)}

			<header className='fixed inset-x-0 top-0 z-50 px-4 pt-3'>
				<div className='container mx-auto'>
					<nav
						aria-label='Main'
						className={`relative flex h-16 items-center justify-between gap-3 rounded-full px-2.5 text-white ring-1 transition-all duration-500 ease-soft lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:px-3 ${isScrolled ? 'bg-ink/85 shadow-[0_24px_48px_-24px_rgba(0,0,0,.9)] ring-white/15 backdrop-blur-xl' : 'bg-ink/35 ring-white/10 backdrop-blur-md'}`}>
						{/* brass hairline along the top edge */}
						<span
							aria-hidden='true'
							className='pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-brass-300/60 to-transparent'
						/>

						{/* Logo */}
						<Link
							to='/'
							aria-label='Al-Haidara home'
							className='group flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400'>
							<span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 p-1 ring-1 ring-white/15 transition duration-500 ease-soft group-hover:scale-95 group-hover:ring-brass-400/60'>
								<img
									src={logo}
									alt=''
									className='h-full w-full object-contain'
								/>
							</span>
							<Wordmark className='hidden sm:inline lg:hidden xl:inline' />
						</Link>

						{/* Desktop links */}
						<ul className='hidden items-center justify-center gap-1 lg:flex xl:gap-2'>
							{visibleLinks.map((link) => (
								<li key={link.path}>
									<NavLink
										to={link.path}
										end={link.path === '/'}
										className={desktopLinkClass}>
										{link.name}
									</NavLink>
								</li>
							))}
						</ul>

						{/* Desktop right cluster */}
						<div className='hidden items-center gap-2.5 lg:flex'>
							{favorites.length > 0 && (
								<Link
									to='/favorite'
									aria-label={`Favorites, ${favorites.length} items`}
									className={ICON_BTN}>
									<FaHeart className='text-sm text-brass-300' />
									<CountBadge count={favorites.length} />
								</Link>
							)}

							<SearchInput variant='bar' />

							<Link
								to={'/cart'}
								aria-label={`Cart, ${products.length} items`}
								className={ICON_BTN}>
								<GiShoppingCart />
								<CountBadge count={products.length} />
							</Link>

							{user ? (
								<UserButton appearance={{ elements: { avatarBox: 'h-10 w-10 ring-2 ring-brass-400/50' } }} />
							) : (
								<button
									type='button'
									onClick={openSignIn}
									className={`${LOGIN_BTN} ml-1 h-10 px-6 text-sm`}>
									Login
								</button>
							)}
						</div>

						{/* Mobile / tablet right cluster */}
						<div className='flex items-center gap-2 lg:hidden'>
							{user && <UserButton appearance={{ elements: { avatarBox: 'h-10 w-10 ring-2 ring-brass-400/50' } }} />}

							<button
								type='button'
								onClick={() => setIsSearchOpen((open) => !open)}
								aria-expanded={isSearchOpen}
								aria-controls='mobile-search'
								aria-label={isSearchOpen ? 'Close search' : 'Search products'}
								className={ICON_BTN}>
								{isSearchOpen ? <LuX /> : <LuSearch />}
							</button>

							<Link
								to={'/cart'}
								aria-label={`Cart, ${products.length} items`}
								className={ICON_BTN}>
								<GiShoppingCart />
								<CountBadge count={products.length} />
							</Link>

							<button
								ref={menuBtnRef}
								type='button'
								onClick={() => setIsMenuOpen((open) => !open)}
								aria-expanded={isMenuOpen}
								aria-controls='mobile-menu'
								aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
								className={ICON_BTN}>
								<span
									aria-hidden='true'
									className='flex w-5 flex-col gap-[5px]'>
									<span className='h-0.5 w-full rounded-full bg-current' />
									<span className='ml-auto h-0.5 w-3 rounded-full bg-current' />
									<span className='h-0.5 w-full rounded-full bg-current' />
								</span>
								<CountBadge count={favorites.length} />
							</button>
						</div>
					</nav>

					{/* Mobile search sheet — hidden + inert while closed, so it can't take focus */}
					<div
						id='mobile-search'
						inert={!isSearchOpen}
						className={`absolute inset-x-4 top-full transition-[opacity,visibility,transform] duration-300 ease-soft lg:hidden ${isSearchOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'}`}>
						<div className='mt-2 rounded-[28px] bg-ink/90 p-3 shadow-float ring-1 ring-white/15 backdrop-blur-xl'>
							<SearchInput
								variant='sheet'
								autoFocus={isSearchOpen}
								onNavigate={() => setIsSearchOpen(false)}
							/>
						</div>
					</div>
				</div>
			</header>

			{/* Mobile menu — full-screen sheet. Hidden + inert while closed, so its links cannot receive focus. */}
			<div
				id='mobile-menu'
				ref={menuRef}
				role='dialog'
				aria-modal='true'
				aria-label='Main menu'
				inert={!isMenuOpen}
				onKeyDown={trapFocus}
				className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink text-white transition-[opacity,visibility,transform] duration-500 ease-soft lg:hidden ${isMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-3 opacity-0'}`}>
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(60% 50% at 100% 0%, rgba(251,191,36,.22), transparent 60%), radial-gradient(50% 40% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
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

				<div className='relative flex min-h-full flex-col px-6 pb-8 pt-5'>
					<div className='flex items-center justify-between'>
						<Wordmark />
						<button
							ref={closeBtnRef}
							type='button'
							onClick={closeMenu}
							aria-label='Close menu'
							className={ICON_BTN}>
							<LuX />
						</button>
					</div>

					<nav
						aria-label='Mobile'
						className='mt-10'>
						{visibleLinks.map((link, i) => (
							<NavLink
								key={link.path}
								to={link.path}
								end={link.path === '/'}
								onClick={closeMenu}
								style={{ transitionDelay: isMenuOpen ? `${120 + i * 60}ms` : '0ms' }}
								className={({ isActive }) =>
									`flex items-center gap-3 border-b border-white/10 py-4 font-display text-4xl font-bold tracking-tight transition-all duration-500 ease-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400 ${isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${isActive ? 'text-brass-300' : 'text-white hover:text-brass-200'}`
								}>
								{({ isActive }) => (
									<>
										{link.name}
										{isActive && <span className='h-2 w-2 rounded-full bg-brass-400' />}
									</>
								)}
							</NavLink>
						))}
					</nav>

					<div className='mt-auto space-y-3 pt-10'>
						<div className='grid grid-cols-2 gap-3'>
							<Link
								to='/cart'
								onClick={closeMenu}
								className='flex h-14 items-center justify-center gap-3 rounded-full bg-white/10 font-semibold ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
								<GiShoppingCart className='text-xl' />
								Cart
								{products.length > 0 && <span className='rounded-full bg-brass-400 px-2 py-0.5 text-xs font-bold text-ink'>{products.length}</span>}
							</Link>

							{favorites.length > 0 && (
								<Link
									to='/favorite'
									onClick={closeMenu}
									className='flex h-14 items-center justify-center gap-3 rounded-full bg-white/10 font-semibold ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
									<FaHeart className='text-brass-300' />
									Favorites
									<span className='rounded-full bg-brass-400 px-2 py-0.5 text-xs font-bold text-ink'>{favorites.length}</span>
								</Link>
							)}
						</div>

						{!user && (
							<button
								type='button'
								onClick={openSignIn}
								className={`${LOGIN_BTN} h-14 w-full text-base`}>
								Login
							</button>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default Navbar;
