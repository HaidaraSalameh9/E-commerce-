import React, { useEffect, useRef, useState } from 'react';
import hero_1 from '../assets/hero-1.png';
import hero_2 from '../assets/hero-2.png';
import hero_3 from '../assets/hero-3.png';
import hero_4 from '../assets/hero-4.png';
import hero_5 from '../assets/hero-5.png';
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import { useNavigate } from 'react-router';

const images = [hero_1, hero_2, hero_3, hero_4, hero_5];

// 'cutout' → transparent product images stand in the arch and rise above its top.
// 'photo'  → full photographs are clipped to the arch shape (object-cover).
const IMAGE_MODE = 'cutout';

// The old paragraph was Lorem Ipsum. This is the brand description already used in the Footer.
const DESCRIPTION = 'Discover everything you need — from fashion and electronics to everyday essentials.';

const ARCH = 'rounded-t-full rounded-b-[2rem]';

const Hero = () => {
	const [index, setIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

	const sectionRef = useRef(null);
	const navigate = useNavigate();

	// Same 3-second slideshow as before. It pauses while the visitor hovers/focuses the
	// slideshow and stays still for people who ask their system for reduced motion.
	useEffect(() => {
		if (paused || reduceMotion) return;

		const timer = setTimeout(() => {
			setIndex((prev) => (prev + 1) % images.length);
		}, 3000);

		return () => clearTimeout(timer);
	}, [index, paused, reduceMotion]);

	const scrollDown = () => {
		sectionRef.current?.nextElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	const isCutout = IMAGE_MODE === 'cutout';

	return (
		<section
			ref={sectionRef}
			className='relative isolate overflow-hidden rounded-b-[2.5rem] bg-ink text-white lg:rounded-b-[4rem]'>
			{/* atmosphere — same language as the Navbar, Footer and page heroes */}
			<div
				className='pointer-events-none absolute inset-0'
				style={{ background: 'radial-gradient(55% 70% at 85% 35%, rgba(251,191,36,.2), transparent 60%), radial-gradient(45% 60% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
			/>
			<div
				className='pointer-events-none absolute inset-0 opacity-[.06]'
				style={{
					backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
					backgroundSize: '44px 44px',
					WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 80%)',
					maskImage: 'linear-gradient(to bottom, #000, transparent 80%)',
				}}
			/>
			{/* the campaign year, drawn as a huge outline behind the arch */}
			<span
				aria-hidden='true'
				className='pointer-events-none absolute -bottom-8 right-0 select-none font-display text-[clamp(9rem,30vw,26rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.08)]'>
				2026
			</span>

			<div className='pt-nav'>
				<div className='relative mx-auto grid min-h-[calc(100svh-5.5rem)] max-w-6xl items-center gap-14 px-4 pb-28 pt-8 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:pb-32'>
					{/* ------------------------------ copy ------------------------------ */}
					<div className='text-center lg:text-left'>
						<h1
							className='animate-rise font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl'
							style={{ animationDelay: '80ms' }}>
							New summer
							<br />
							collection
						</h1>

						<h2
							className='mt-5 animate-rise font-display text-2xl font-bold text-brass-300 sm:text-3xl'
							style={{ animationDelay: '200ms' }}>
							30% OFF 2026
						</h2>

						<p
							className='mx-auto mt-5 max-w-md animate-rise text-base leading-relaxed text-stone-300 lg:mx-0'
							style={{ animationDelay: '320ms' }}>
							{DESCRIPTION}
						</p>

						<div
							className='mt-9 animate-rise'
							style={{ animationDelay: '440ms' }}>
							<button
								type='button'
								onClick={() => navigate('/products')}
								className='h-14 rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-10 text-base font-bold text-ink shadow-lg shadow-brass-500/25 transition duration-300 ease-soft hover:-translate-y-0.5 hover:from-brass-200 hover:to-brass-400 hover:shadow-xl hover:shadow-brass-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0 active:scale-[.98]'>
								Shop Now
							</button>
						</div>
					</div>

					{/* ---------------------------- slideshow ---------------------------- */}
					<div
						role='group'
						aria-roledescription='carousel'
						aria-label='New summer collection'
						onMouseEnter={() => setPaused(true)}
						onMouseLeave={() => setPaused(false)}
						onFocus={() => setPaused(true)}
						onBlur={() => setPaused(false)}
						className='relative mx-auto aspect-[4/5] w-full max-w-sm animate-swap lg:h-[min(36rem,calc(100svh-11rem))] lg:w-auto lg:max-w-none lg:justify-self-center'>
						{/* offset outline behind the arch */}
						<div className={`absolute inset-0 translate-x-4 translate-y-4 ring-1 ring-brass-400/40 ${ARCH}`} />

						{/* the arch */}
						<div className={`absolute inset-0 overflow-hidden bg-gradient-to-b from-graphite via-charcoal to-ink ring-1 ring-white/15 ${ARCH}`}>
							<div
								className='absolute inset-0'
								style={{ background: 'radial-gradient(70% 55% at 50% 85%, rgba(251,191,36,.3), transparent 70%)' }}
							/>
							<div className='absolute inset-3 rounded-t-full rounded-b-[1.4rem] ring-1 ring-brass-300/20' />
						</div>

						{/* images — all five are stacked and crossfade, so there is never a blank frame */}
						<div className={isCutout ? 'absolute inset-x-[5%] bottom-[3%] top-[-4%]' : `absolute inset-0 overflow-hidden ${ARCH}`}>
							{images.map((src, i) => (
								<img
									key={src}
									src={src}
									alt='New summer collection'
									aria-hidden={i !== index}
									loading={i === 0 ? 'eager' : 'lazy'}
									fetchPriority={i === 0 ? 'high' : undefined}
									decoding='async'
									draggable={false}
									className={`absolute inset-0 h-full w-full transition-all duration-700 ease-in-out ${isCutout ? 'object-contain object-bottom' : 'object-cover'} ${i === index ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}
									style={isCutout ? { filter: 'drop-shadow(0 30px 30px rgba(0,0,0,.5))' } : undefined}
								/>
							))}
						</div>

						{/* slide dots */}
						<div className='absolute -bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-full bg-ink/85 px-3 ring-1 ring-white/15 backdrop-blur'>
							{images.map((_, i) => (
								<button
									type='button'
									key={i}
									onClick={() => setIndex(i)}
									aria-label={`Show image ${i + 1} of ${images.length}`}
									aria-current={i === index}
									className='group flex h-10 items-center px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
									<span className={`block h-1.5 rounded-full transition-all duration-500 ease-soft ${i === index ? 'w-8 bg-brass-400' : 'w-3 bg-white/30 group-hover:bg-white/60'}`} />
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* scroll cue + social icons (desktop) */}
			<div className='absolute inset-x-0 bottom-8 z-10 hidden md:block'>
				<div className='mx-auto flex max-w-6xl items-center justify-between px-6'>
					<button
						type='button'
						onClick={scrollDown}
						className='group flex items-center gap-3 rounded-full text-sm text-stone-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-400'>
						<span className='flex h-11 w-7 justify-center rounded-full ring-1 ring-white/25 transition-colors group-hover:ring-brass-400/70'>
							<span className='mt-2 h-2 w-1 animate-bounce rounded-full bg-brass-400' />
						</span>
						Scroll
					</button>

					{/* These had no destination before either; they become links when profile URLs are added (see Footer SOCIALS) */}
					<ul
						aria-hidden='true'
						className='flex gap-3'>
						{[FaFacebook, FaInstagram, FaTwitter].map((Icon, i) => (
							<li
								key={i}
								className='flex h-10 w-10 items-center justify-center rounded-full bg-white/[.03] text-stone-500 ring-1 ring-white/10'>
								<Icon />
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
};

export default Hero;
