import React from 'react';
import { useSelector } from 'react-redux';

import { FaArrowRight, FaHeart, FaRegHeart, FaShoppingBag, FaStar } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import { Link } from 'react-router';

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.fv-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes fv-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes fv-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes fv-ring { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(1.8); opacity: 0; } }
@keyframes fv-beat { 0%, 100% { transform: scale(1); } 14% { transform: scale(1.14); } 28% { transform: scale(1); } 42% { transform: scale(1.1); } 70% { transform: scale(1); } }
@keyframes fv-twinkle { 0%, 100% { opacity: .25; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.1); } }

.fv-reveal { animation: fv-rise .8s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 110ms + 80ms); }
.fv-float { animation: fv-float 7s ease-in-out infinite; }
.fv-ring { animation: fv-ring 2.8s ease-out infinite; }
.fv-beat { animation: fv-beat 2.6s ease-in-out infinite; transform-origin: center; }
.fv-twinkle { animation: fv-twinkle 3.2s ease-in-out infinite; }

/* Each saved product rises in, then lifts gently on hover / keyboard focus */
.fv-card { animation: fv-rise .7s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 70ms + 120ms); transition: transform .4s cubic-bezier(.2,.8,.2,1), filter .4s ease; }
.fv-card:hover, .fv-card:focus-within { transform: translateY(-4px); filter: drop-shadow(0 22px 22px rgba(28,25,23,.14)); }

.fv-btn { transition: transform .2s ease, box-shadow .3s ease, filter .3s ease; }
.fv-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.fv-btn:active { transform: scale(.97); }

@media (prefers-reduced-motion: reduce) {
	.fv-reveal, .fv-card, .fv-float, .fv-ring, .fv-beat, .fv-twinkle { animation: none; }
	.fv-card, .fv-btn { transition: none; }
	.fv-card:hover, .fv-card:focus-within, .fv-btn:hover { transform: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                               */
/* -------------------------------------------------------------------------- */

// Same navigation target the page already used: /products
const ShopLink = ({ children, variant = 'gold', className = '' }) => {
	const look =
		variant === 'gold'
			? 'bg-gradient-to-r from-amber-300 to-amber-500 text-stone-950 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 focus-visible:outline-amber-300'
			: 'border border-stone-300 bg-white text-stone-800 shadow-sm hover:border-stone-900 hover:bg-stone-900 hover:text-amber-300 focus-visible:outline-amber-500';

	return (
		<Link
			to='/products'
			className={`fv-btn group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${look} ${className}`}>
			{children}
			<FaArrowRight
				aria-hidden='true'
				className='text-xs transition-transform duration-300 group-hover:translate-x-1'
			/>
		</Link>
	);
};

const DotGrid = () => (
	<div
		className='pointer-events-none absolute inset-0 opacity-70'
		style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
	/>
);

/* -------------------------------------------------------------------------- */
/*  Empty wishlist                                                            */
/* -------------------------------------------------------------------------- */

const EmptyWishlist = () => (
	<main className='min-h-screen overflow-x-hidden bg-stone-100'>
		<style>{STYLES}</style>

		<div className='mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6'>
			<section
				aria-labelledby='fv-empty-title'
				className='fv-reveal relative w-full overflow-hidden rounded-[32px] px-6 py-12 text-center text-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.8)] sm:px-12 sm:py-16'
				style={{ background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)' }}>
				<DotGrid />
				<div
					className='pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full'
					style={{ background: 'radial-gradient(circle, rgba(251,191,36,.3), transparent 70%)' }}
				/>
				<div
					className='pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full'
					style={{ background: 'radial-gradient(circle, rgba(120,113,108,.35), transparent 70%)' }}
				/>

				<div className='relative'>
					{/* Heart composition */}
					<div
						className='relative mx-auto flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40'
						aria-hidden='true'>
						<span className='fv-ring absolute inset-6 rounded-full border-2 border-amber-400/70' />
						<span
							className='fv-ring absolute inset-6 rounded-full border border-amber-400/50'
							style={{ animationDelay: '1.4s' }}
						/>
						<span className='absolute inset-0 rounded-full border border-dashed border-white/15' />
						<span className='fv-float relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-300 to-amber-600 text-4xl text-stone-950 shadow-2xl shadow-amber-900/40 sm:h-[104px] sm:w-[104px]'>
							<FaHeart className='fv-beat' />
						</span>
						<FaStar
							className='fv-twinkle absolute right-2 top-3 text-sm text-amber-300'
							style={{ animationDelay: '.4s' }}
						/>
						<FaStar
							className='fv-twinkle absolute bottom-4 left-1 text-xs text-amber-200'
							style={{ animationDelay: '1.6s' }}
						/>
						<FaStar
							className='fv-twinkle absolute bottom-1 right-8 text-[10px] text-stone-300'
							style={{ animationDelay: '2.4s' }}
						/>
					</div>

					<p className='mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300'>My Wishlist</p>
					<h1
						id='fv-empty-title'
						className='fv-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl'>
						No favorites yet
					</h1>
					<p className='mx-auto mt-4 max-w-md text-base leading-7 text-stone-300'>Your wishlist is waiting for its first treasure. Discover our collections and save the pieces you love — they’ll be right here whenever you’re ready.</p>

					<div className='mt-8'>
						<ShopLink>Add some products to your favorites</ShopLink>
					</div>

					<p className='mx-auto mt-7 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs text-stone-400 ring-1 ring-white/10'>
						<FaRegHeart
							className='text-amber-300'
							aria-hidden='true'
						/>
						Tap the heart on any product to save it here
					</p>
				</div>
			</section>
		</div>
	</main>
);

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

const WishlistHero = ({ count }) => (
	<header className='relative isolate overflow-hidden bg-stone-950 text-white'>
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
			className='fv-float pointer-events-none absolute -right-20 top-20 hidden h-72 w-72 rounded-full border border-amber-400/20 lg:block'
		/>
		<span
			aria-hidden='true'
			className='fv-float pointer-events-none absolute -right-4 top-36 hidden h-44 w-44 rounded-full border border-amber-400/10 lg:block'
			style={{ animationDelay: '-3s' }}
		/>

		<div className='relative mx-auto max-w-[1440px] px-4 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-16 lg:px-12 lg:pb-32'>
			<div className='grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14'>
				<div className='flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center sm:gap-8'>
					<div
						className='fv-reveal relative h-20 w-20 shrink-0 sm:h-24 sm:w-24'
						style={{ '--i': 0 }}>
						<span
							aria-hidden='true'
							className='fv-ring absolute inset-0 rounded-[28px] border-2 border-amber-400/70'
						/>
						<span className='relative flex h-full w-full items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-300 to-amber-600 text-3xl text-stone-950 shadow-2xl shadow-amber-900/40 sm:text-4xl'>
							<FaHeart
								className='fv-beat'
								aria-hidden='true'
							/>
						</span>
					</div>

					<div className='min-w-0'>
						<p
							className='fv-reveal text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300'
							style={{ '--i': 1 }}>
							The Al-Haidara Collection
						</p>
						<h1
							className='fv-reveal fv-display mt-2 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl'
							style={{ '--i': 2 }}>
							My <span className='bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent'>Wishlist</span>
						</h1>
						<p
							className='fv-reveal mt-3 max-w-xl text-base leading-7 text-stone-300 sm:text-lg'
							style={{ '--i': 3 }}>
							Everything you’ve fallen for, saved in one place. Revisit your favorites and make them yours when the moment is right.
						</p>
					</div>
				</div>

				{/* Total saved */}
				<section
					aria-label='Wishlist summary'
					className='fv-reveal relative overflow-hidden rounded-[28px] p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)] ring-1 ring-white/10 sm:p-7'
					style={{ '--i': 4, background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)' }}>
					<DotGrid />
					<div
						className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full'
						style={{ background: 'radial-gradient(circle, rgba(251,191,36,.28), transparent 70%)' }}
					/>
					<div className='relative flex items-center justify-between gap-4'>
						<div>
							<p className='text-xs font-medium text-stone-400'>Saved for later</p>
							<p className='fv-display mt-1 text-5xl font-bold tracking-tight text-amber-300 sm:text-6xl'>{count}</p>
							<p className='mt-1 text-sm text-stone-300'>{count === 1 ? 'favorite product' : 'favorite products'}</p>
						</div>
						<span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl text-amber-300 ring-1 ring-white/15 sm:h-16 sm:w-16 sm:text-2xl'>
							<FaShoppingBag aria-hidden='true' />
						</span>
					</div>
				</section>
			</div>
		</div>

		<div className='h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent' />
	</header>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const Favorite = () => {
	const products = useSelector((state) => state.favorite.product);

	if (products.length === 0) {
		return <EmptyWishlist />;
	}

	return (
		<main className='min-h-screen overflow-x-hidden bg-stone-100'>
			<style>{STYLES}</style>

			<WishlistHero count={products.length} />

			<div className='relative z-10 -mt-8 rounded-t-[32px] bg-stone-100 sm:-mt-10'>
				<div className='mx-auto max-w-[1440px] px-4 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12'>
					<div className='mb-8 flex flex-col justify-between gap-5 border-b border-stone-200 pb-7 sm:flex-row sm:items-end'>
						<div>
							<div className='mb-3 flex items-center gap-2'>
								<span className='h-1.5 w-1.5 rounded-full bg-amber-500' />
								<span className='text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400'>Your favorites</span>
							</div>
							<h2 className='fv-display text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl'>Saved products</h2>
							<p className='mt-2 max-w-lg text-sm leading-6 text-stone-500'>
								{products.length} {products.length === 1 ? 'piece' : 'pieces'} you’ve set aside. Tap a heart any time to change your mind.
							</p>
						</div>
						<ShopLink variant='light'>Continue Shopping</ShopLink>
					</div>

					<section aria-label='Favorite products'>
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4'>
							{products.map((product, index) => (
								<div
									key={product.id}
									className='fv-card h-full'
									style={{ '--i': Math.min(index, 11) }}>
									<ProductCard product={product} />
								</div>
							))}
						</div>
					</section>

					{/* Closing invitation */}
					<section
						aria-label='Keep exploring'
						className='relative mt-14 overflow-hidden rounded-[28px] p-6 text-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.8)] sm:mt-16 sm:p-9'
						style={{ background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)' }}>
						<DotGrid />
						<div
							className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full'
							style={{ background: 'radial-gradient(circle, rgba(251,191,36,.28), transparent 70%)' }}
						/>
						<div className='relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center'>
							<div>
								<h2 className='fv-display text-xl font-bold sm:text-2xl'>Still looking for something special?</h2>
								<p className='mt-1 max-w-md text-sm text-stone-300'>There’s more waiting in the collection. Keep browsing and save what catches your eye.</p>
							</div>
							<ShopLink className='shrink-0'>Continue Shopping</ShopLink>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
};

export default Favorite;
