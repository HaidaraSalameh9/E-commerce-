import React from 'react';
import { Link } from 'react-router';
import { FaBullseye, FaEye, FaChevronDown, FaArrowRight, FaInstagram, FaFacebook } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

/* Stats and team exactly as on the original page — nothing added. */
const STATS = [
	{ number: '100K+', label: 'Happy Customers' },
	{ number: '5000+', label: 'Products' },
	{ number: '500+', label: 'Brands' },
	{ number: '5 Years', label: 'Experience' },
];

const TEAM = [
	{
		name: 'John Doe',
		role: 'Founder',
		image: 'https://randomuser.me/api/portraits/men/32.jpg',
	},
	{
		name: 'Sarah Smith',
		role: 'Designer',
		image: 'https://randomuser.me/api/portraits/women/44.jpg',
	},
	{
		name: 'Michael Lee',
		role: 'Marketing',
		image: 'https://randomuser.me/api/portraits/men/46.jpg',
	},
];

/* -------------------------------------------------------------------------- */
/*  Styles — same design system as the redesigned Contact page                */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.ab-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes ab-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.ab-rise { animation: ab-rise .8s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 120ms); }

@keyframes ab-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
.ab-bob { animation: ab-bob 1.8s ease-in-out infinite; }

.ab-btn { position: relative; overflow: hidden; isolation: isolate; transition: color .3s ease, transform .15s ease; }
.ab-btn::before {
	content: ''; position: absolute; inset: 0; z-index: -1;
	background: linear-gradient(90deg, #fcd34d, #f59e0b);
	transform: translateX(-101%);
	transition: transform .45s cubic-bezier(.2,.8,.2,1);
}
.ab-btn:hover, .ab-btn:focus-visible { color: #1c1917; }
.ab-btn:hover::before, .ab-btn:focus-visible::before { transform: none; }

.ab-dropcap::first-letter {
	font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
	font-size: 3.25rem; font-weight: 700; line-height: .85;
	float: left; margin: .35rem .6rem 0 0; color: #f59e0b;
}

@media (prefers-reduced-motion: reduce) {
	.ab-rise, .ab-bob, .ab-btn, .ab-btn::before { animation: none; transition: none; }
}
`;

const About = () => {
	return (
		<main className='min-h-screen bg-stone-100'>
			<style>{STYLES}</style>

			{/* Hero — dark stone, gold glow, faint grid, outlined wordmark */}
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
				<span
					aria-hidden='true'
					className='ab-display pointer-events-none absolute -bottom-5 left-0 select-none whitespace-nowrap text-[20vw] font-bold leading-none tracking-tight lg:text-[15rem]'
					style={{ color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.07)' }}>
					AL-HAIDARA
				</span>

				<div className='relative mx-auto max-w-6xl px-4 pb-32 pt-12 sm:px-6 sm:pb-36 sm:pt-16'>
					<p
						className='ab-rise text-xs font-semibold uppercase tracking-[0.24em] text-amber-300'
						style={{ '--i': 0 }}>
						About Us
					</p>
					<h1
						className='ab-rise ab-display mt-5 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl'
						style={{ '--i': 1 }}>
						Shopping is more than just buying products — it's a way to <span className='text-amber-300'>express your lifestyle.</span>
					</h1>
					<p
						className='ab-rise mt-5 max-w-xl text-base leading-7 text-stone-300 sm:text-lg'
						style={{ '--i': 2 }}>
						Discover who we are, what we offer, and why we're passionate about bringing you the best products across every category.
					</p>
					<p
						className='ab-rise mt-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-400'
						style={{ '--i': 3 }}>
						Scroll to explore
						<FaChevronDown
							className='ab-bob text-amber-300'
							size={12}
							aria-hidden='true'
						/>
					</p>
				</div>
			</header>

			<div className='relative z-10 mx-auto -mt-20 max-w-6xl space-y-6 px-4 pb-20 sm:-mt-24 sm:space-y-8 sm:px-6'>
				{/* Story — editorial card with a dark monogram panel */}
				<section
					aria-label='Our story'
					className='ab-rise overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)]'
					style={{ '--i': 4 }}>
					<div className='grid lg:grid-cols-2'>
						<div className='p-7 sm:p-10'>
							<p className='text-xs font-semibold uppercase tracking-[0.24em] text-amber-600'>Our Story</p>
							<h2 className='ab-display mt-4 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl'>Our Story</h2>
							<span className='mt-5 block h-[3px] w-8 rounded-full bg-amber-400' />
							<p className='ab-dropcap mt-6 text-base leading-8 text-stone-600'>
								At Al-Haidara, we believe shopping is more than just buying products — it's a way to express your lifestyle. Since our beginning, we've been dedicated to offering a wide range of high-quality products, from fashion to everyday essentials, helping you find everything you need
								in one place with confidence and ease.
							</p>
						</div>

						<div className='relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-stone-950 p-8 text-white sm:p-10'>
							<div
								className='pointer-events-none absolute inset-0'
								style={{ background: 'radial-gradient(70% 60% at 100% 0%, rgba(251,191,36,.18), transparent 60%)' }}
							/>
							<span
								aria-hidden='true'
								className='ab-display relative select-none text-[9rem] font-bold leading-none tracking-tight sm:text-[11rem]'
								style={{ color: 'transparent', WebkitTextStroke: '1.5px rgba(251,191,36,.45)' }}>
								AH
							</span>
							<div className='relative'>
								<span className='block h-[3px] w-8 rounded-full bg-amber-400' />
								<p className='mt-4 max-w-xs text-sm leading-6 text-stone-300'>From fashion to everyday essentials.</p>
							</div>
						</div>
					</div>
				</section>

				{/* Mission + Vision — one split card */}
				<section
					aria-label='Mission and vision'
					className='overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)]'>
					<div className='grid md:grid-cols-2'>
						<div className='group border-b border-stone-100 p-7 transition-colors hover:bg-stone-50/60 sm:p-9 md:border-b-0 md:border-r'>
							<span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-lg text-amber-300 shadow-lg shadow-stone-900/20 transition-transform duration-300 group-hover:-translate-y-0.5'>
								<FaBullseye aria-hidden='true' />
							</span>
							<p className='mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-amber-600'>Our Mission</p>
							<h3 className='ab-display mt-2 text-2xl font-bold tracking-tight text-stone-950'>Our Mission</h3>
							<p className='mt-3 text-[15px] leading-7 text-stone-600'>To deliver high-quality, affordable products for everyone — without compromising on value, variety, or experience.</p>
						</div>

						<div className='group p-7 transition-colors hover:bg-stone-50/60 sm:p-9'>
							<span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-lg text-amber-300 shadow-lg shadow-stone-900/20 transition-transform duration-300 group-hover:-translate-y-0.5'>
								<FaEye aria-hidden='true' />
							</span>
							<p className='mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-amber-600'>Our Vision</p>
							<h3 className='ab-display mt-2 text-2xl font-bold tracking-tight text-stone-950'>Our Vision</h3>
							<p className='mt-3 text-[15px] leading-7 text-stone-600'>To become a leading global marketplace that inspires confidence, convenience, and individuality in every shopping experience.</p>
						</div>
					</div>
				</section>

				{/* Stats — dark band with gold numbers */}
				<section
					aria-label='Our numbers'
					className='relative overflow-hidden rounded-[28px] bg-stone-950 px-6 py-10 text-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.8)] sm:px-10 sm:py-12'>
					<div
						className='pointer-events-none absolute inset-0'
						style={{ background: 'radial-gradient(50% 80% at 50% 0%, rgba(251,191,36,.16), transparent 65%)' }}
					/>
					<div className='relative grid grid-cols-2 gap-x-6 gap-y-10 text-center lg:grid-cols-4'>
						{STATS.map((item) => (
							<div key={item.label}>
								<span className='mx-auto block h-[3px] w-8 rounded-full bg-amber-400' />
								<p className='ab-display mt-4 text-4xl font-bold tracking-tight text-amber-300 tabular-nums sm:text-5xl'>{item.number}</p>
								<p className='mt-2 text-sm text-stone-300'>{item.label}</p>
							</div>
						))}
					</div>
				</section>

				{/* Team */}
				<section aria-label='Our team'>
					<div className='text-center'>
						<p className='text-xs font-semibold uppercase tracking-[0.24em] text-amber-600'>The People</p>
						<h2 className='ab-display mt-3 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl'>Our Team</h2>
					</div>

					<div className='mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
						{TEAM.map((member) => (
							<div
								key={member.name}
								className='group rounded-[28px] border border-stone-200 bg-white p-7 text-center shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] transition-all duration-300 hover:-translate-y-2 hover:border-stone-300 hover:shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)]'>
								<div className='relative mx-auto h-28 w-28'>
									<img
										loading='lazy'
										src={member.image}
										alt={member.name}
										className='h-full w-full rounded-full border-4 border-stone-100 object-cover transition duration-300 group-hover:scale-110'
									/>
								</div>

								<h3 className='ab-display mt-5 text-xl font-bold tracking-tight text-stone-950'>{member.name}</h3>

								<p className='mt-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-600'>{member.role}</p>

								<div className='mt-5 flex justify-center gap-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0'>
									<span className='flex h-9 w-9 hover:cursor-pointer items-center justify-center  text-stone-500 transition-all duration-300 hover:text-blue-600'>
										<FaFacebook size={13} />
									</span>

									<span className='flex h-9 w-9 hover:cursor-pointer items-center justify-center  text-stone-500 transition-all duration-300 hover:text-pink-500'>
										<FaInstagram size={13} />
									</span>

									<span className='flex h-9 w-9 hover:cursor-pointer items-center justify-center  text-stone-500 transition-all duration-3 hover:text-black'>
										<FaXTwitter size={13} />
									</span>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* CTA */}
				<section className='relative overflow-hidden rounded-[28px] bg-stone-950 px-6 py-12 text-center text-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.8)] sm:px-10 sm:py-14'>
					<div
						className='pointer-events-none absolute inset-0'
						style={{ background: 'radial-gradient(60% 90% at 50% 0%, rgba(251,191,36,.22), transparent 60%)' }}
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
					<div className='relative'>
						<h2 className='ab-display text-3xl font-bold tracking-tight sm:text-4xl'>Join Our Journey</h2>
						<p className='mx-auto mt-3 max-w-md text-base leading-7 text-stone-300'>Be part of our growing community and explore the latest trends.</p>
						<Link to={'/'}>
							<button className='mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 px-8 text-sm font-semibold text-stone-950 shadow-lg shadow-amber-500/30 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:scale-[.98]'>
								Shop Now
								<FaArrowRight
									size={14}
									aria-hidden='true'
								/>
							</button>
						</Link>
					</div>
				</section>
			</div>
		</main>
	);
};

export default About;
