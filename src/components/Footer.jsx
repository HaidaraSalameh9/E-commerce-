import React from 'react';
import { FaFacebookF, FaInstagram, FaGithub, FaTwitter } from 'react-icons/fa';
import { Link } from 'react-router';
import { useClerk, useUser } from '@clerk/react';
import logo from '../../public/logo.png';

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/*                                                                            */
/*  Every label from the original footer is kept. An item becomes a real link */
/*  as soon as it has a destination:                                          */
/*    { label, to: '/route' }   → internal link                               */
/*    { label, action: ... }   → Clerk sign-in / sign-up                      */
/*    { label }                → no destination yet: plain text, not a link   */
/*  `when: 'user' | 'guest'` shows an item only to signed-in / signed-out     */
/*  visitors (same idea as the Navbar's `login` flag).                        */
/* -------------------------------------------------------------------------- */

const GROUPS = [
	{
		title: 'Shop',
		links: [
			{ label: 'Products', to: '/products' },
			{ label: 'Cart', to: '/cart' },
		],
	},
	{
		title: 'Company',
		links: [{ label: 'About', to: '/about' }, { label: 'Careers' }, { label: 'Press' }, { label: 'Blog' }],
	},
	{
		title: 'Support',
		links: [{ label: 'Help Center' }, { label: 'Returns' }, { label: 'Shipping' }, { label: 'Contact', to: '/contact' }],
	},
	{
		title: 'Account',
		links: [
			{ label: 'Login', action: 'signIn', when: 'guest' },
			{ label: 'Register', action: 'signUp', when: 'guest' },
			{ label: 'Orders', to: '/my-orders', when: 'user' },
			{ label: 'Wishlist', to: '/favorite' },
		],
	},
	{
		title: 'Legal',
		links: [{ label: 'Privacy Policy' }, { label: 'Terms' }, { label: 'Cookies' }],
	},
];

// Add the profile URL as `href` and the icon turns into a real, accessible link.
const SOCIALS = [
	{ name: 'Twitter', Icon: FaTwitter, href: null },
	{ name: 'Facebook', Icon: FaFacebookF, href: null },
	{ name: 'Instagram', Icon: FaInstagram, href: null },
	{ name: 'GitHub', Icon: FaGithub, href: null },
];

const PAYMENTS = [
	{ name: 'Visa', src: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/visa.svg' },
	{ name: 'Mastercard', src: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mastercard.svg' },
	{ name: 'PayPal', src: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paypal.svg' },
	{ name: 'Apple Pay', src: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/applepay.svg' },
	{ name: 'Google Pay', src: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlepay.svg' },
];

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

// Brass underline slides in under links on hover / keyboard focus
const LINK_CLASS =
	'relative inline-block w-fit text-sm text-stone-200 transition-colors duration-300 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-brass-400 after:transition-all after:duration-300 hover:text-white hover:after:w-full focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-400 focus-visible:after:w-full';

const SOCIAL_BASE = 'flex h-11 w-11 items-center justify-center rounded-full ring-1';

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

const Footer = () => {
	const { user } = useUser();
	const { openSignIn, openSignUp } = useClerk();

	const isVisible = (item) => (item.when === 'user' ? !!user : item.when === 'guest' ? !user : true);

	const renderLink = (item) => {
		if (item.to) {
			return (
				<Link
					to={item.to}
					className={LINK_CLASS}>
					{item.label}
				</Link>
			);
		}

		if (item.action) {
			return (
				<button
					type='button'
					onClick={() => (item.action === 'signIn' ? openSignIn() : openSignUp())}
					className={`${LINK_CLASS} text-left`}>
					{item.label}
				</button>
			);
		}

		// No destination yet: keep the information, but don't pretend it's a link
		return <span className='text-sm text-stone-400'>{item.label}</span>;
	};

	return (
		<footer className='container mx-auto pb-4 pt-8'>
			<div className='relative overflow-hidden rounded-card bg-gradient-to-b from-graphite to-ink px-6 pt-10 ring-1 ring-white/10 sm:px-10 sm:pt-14 lg:px-14'>
				{/* same atmosphere as the page heroes and the Navbar */}
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(50% 60% at 100% 0%, rgba(251,191,36,.16), transparent 60%), radial-gradient(40% 50% at 0% 100%, rgba(120,113,108,.2), transparent 60%)' }}
				/>
				<div
					className='pointer-events-none absolute inset-0 opacity-[.05]'
					style={{
						backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
						backgroundSize: '44px 44px',
						WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
						maskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
					}}
				/>
				<span
					aria-hidden='true'
					className='pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-brass-300/60 to-transparent'
				/>

				<div className='relative'>
					{/* Brand */}
					<div className='flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between'>
						<div className='max-w-xl'>
							<Link
								to='/'
								aria-label='Al-Haidara home'
								className='group inline-flex items-center gap-4 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-400'>
								<span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/5 p-1.5 ring-1 ring-white/15 transition duration-500 ease-soft group-hover:scale-95 group-hover:ring-brass-400/60'>
									<img
										src={logo}
										alt=''
										loading='lazy'
										className='h-full w-full object-contain'
									/>
								</span>
								<span className='font-script text-4xl leading-none text-wordmark'>Al-Haidara</span>
							</Link>

							<p className='mt-8 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl'>Your all-in-one marketplace.</p>
							<p className='mt-4 max-w-md text-base leading-relaxed text-stone-400'>Discover everything you need — from fashion and electronics to everyday essentials.</p>
						</div>

						<ul
							aria-label='Social media'
							className='flex gap-3'>
							{SOCIALS.map(({ name, Icon, href }) => (
								<li key={name}>
									{href ? (
										<a
											href={href}
											target='_blank'
											rel='noopener noreferrer'
											aria-label={`Al-Haidara on ${name}`}
											className={`${SOCIAL_BASE} bg-white/5 text-stone-200 ring-white/15 transition duration-300 ease-soft hover:-translate-y-1 hover:bg-brass-400 hover:text-ink hover:ring-brass-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400`}>
											<Icon aria-hidden='true' />
										</a>
									) : (
										// no profile URL yet → decorative, not interactive
										<span
											aria-hidden='true'
											className={`${SOCIAL_BASE} bg-white/[.03] text-stone-500 ring-white/10`}>
											<Icon />
										</span>
									)}
								</li>
							))}
						</ul>
					</div>

					{/* Links */}
					<nav
						aria-label='Footer'
						className='mt-12 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/10 pt-10 sm:grid-cols-3 lg:grid-cols-5'>
						{GROUPS.map((group) => (
							<div key={group.title}>
								<h2 className='font-display text-base font-bold text-white'>{group.title}</h2>
								<span
									aria-hidden='true'
									className='mt-2 block h-0.5 w-6 rounded-full bg-brass-400'
								/>
								<ul className='mt-5 space-y-3'>
									{group.links.filter(isVisible).map((item) => (
										<li key={item.label}>{renderLink(item)}</li>
									))}
								</ul>
							</div>
						))}
					</nav>

					{/* Bottom bar */}
					<div className='mt-12 flex flex-col items-start justify-between gap-5 border-t border-white/10 py-6 text-sm sm:flex-row sm:items-center'>
						<p className='text-stone-400'>© {new Date().getFullYear()} Al-Haidara. All rights reserved.</p>

						<ul
							aria-label='Payment methods'
							className='flex flex-wrap items-center gap-2.5'>
							{PAYMENTS.map(({ name, src }) => (
								<li
									key={name}
									className='flex h-9 w-14 items-center justify-center rounded-lg bg-white p-1.5 ring-1 ring-white/20 transition duration-300 ease-soft hover:-translate-y-0.5'>
									<img
										src={src}
										alt={name}
										width='40'
										height='24'
										loading='lazy'
										className='h-full w-full object-contain'
									/>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Oversized wordmark, fading into the panel edge (decorative) */}
				<div
					aria-hidden='true'
					className='pointer-events-none relative select-none overflow-hidden text-center'>
					<span className='block bg-gradient-to-b from-brass-300/35 via-brass-400/10 to-transparent bg-clip-text font-script text-[clamp(4.5rem,19vw,15rem)] leading-[1.05] text-transparent'>Al-Haidara</span>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
