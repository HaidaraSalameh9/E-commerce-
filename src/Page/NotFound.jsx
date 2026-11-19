import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';

const NotFound = () => {
	const navigate = useNavigate();

	return (
		<div
			className='relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden bg-[#0a0a09] px-4 py-16 text-center text-stone-100'
			style={{
				backgroundImage: 'radial-gradient(60% 40% at 50% 0%, rgba(212,175,55,0.10), transparent 65%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
				backgroundSize: 'auto, 56px 56px, 56px 56px',
			}}>
			{/* Soft gold glow behind the number */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass-500/10 blur-3xl'
			/>

			<div className='relative animate-rise'>
				{/* Eyebrow */}
				<p className='text-[11px] font-bold tracking-[0.22em] text-brass-300'>ERROR · PAGE NOT FOUND</p>

				{/* Big 404 */}
				<h1 className='mt-4 bg-gradient-to-b from-brass-300 via-brass-400 to-brass-500 bg-clip-text font-display text-8xl font-bold tracking-tight text-transparent sm:text-9xl'>404</h1>

				{/* Divider line */}
				<div className='mx-auto my-6 h-1 w-24 rounded-full bg-gradient-to-r from-brass-300 to-brass-500 shadow-lg shadow-brass-500/20' />

				{/* Message */}
				<div className='mx-auto flex max-w-md flex-col items-center'>
					<span className='flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brass-300'>
						<Compass
							size={22}
							aria-hidden='true'
						/>
					</span>

					<h2 className='mt-5 font-display text-2xl font-bold text-stone-50 md:text-3xl'>Oops! Page not found</h2>

					<p className='mt-3 text-sm leading-relaxed text-stone-400'>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
				</div>

				{/* Buttons */}
				<div className='mt-8 flex flex-wrap justify-center gap-3'>
					<Link
						to='/'
						className='flex items-center gap-2 rounded-xl bg-gradient-to-r from-brass-300 to-brass-500 px-5 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-brass-500/20 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500'>
						<Home
							size={16}
							aria-hidden='true'
						/>
						Go Home
					</Link>

					<button
						type='button'
						onClick={() => navigate(-1)}
						className='flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-stone-200 transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400'>
						<ArrowLeft
							size={16}
							aria-hidden='true'
						/>
						Go Back
					</button>
				</div>
			</div>
		</div>
	);
};

export default NotFound;
