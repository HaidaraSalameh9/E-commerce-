import React, { useState, useEffect } from 'react';
import emptyCart from '../assets/empty_cart.png';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { IoTrash } from 'react-icons/io5';
import { FaArrowRight, FaExclamationCircle, FaMapMarkerAlt, FaMinus, FaPlus, FaShoppingBag } from 'react-icons/fa';
import Modal from '../components/Modal';
import CheckoutProgress from '../components/CheckoutProgress';
import ChangeAddress from '../components/ChangeAddress';

import useCartSync from '../hooks/useCartSync';
import { fetchUserCart } from '../services/cartService';
// import { setCart } from '../app/features/cartSlice';

import { useAuth } from '@clerk/react';

import { replaceCart } from '../app/features/cartSlice';

/* -------------------------------------------------------------------------- */
/*  Styles (same design language as OrderConfirm)                             */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.oc-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes oc-pulse { 0% { transform: scale(1); opacity: .75; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes oc-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes oc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

.oc-ring { animation: oc-pulse 2.8s ease-out infinite; }
.oc-rise { animation: oc-rise .7s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 90ms + 80ms); }
.oc-float { animation: oc-float 5s ease-in-out infinite; }

.oc-item .oc-thumb { transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.oc-item:hover .oc-thumb { transform: translateY(-4px) rotate(-3deg) scale(1.06); }

.oc-btn { position: relative; overflow: hidden; isolation: isolate; transition: color .3s ease, transform .15s ease; }
.oc-btn::before {
	content: ''; position: absolute; inset: 0; z-index: -1;
	background: linear-gradient(90deg, #fcd34d, #f59e0b);
	transform: translateX(-101%);
	transition: transform .45s cubic-bezier(.2,.8,.2,1);
}
.oc-btn:hover, .oc-btn:focus-visible { color: #1c1917; }
.oc-btn:hover::before, .oc-btn:focus-visible::before { transform: none; }

.oc-qty { transition: background-color .2s ease, color .2s ease, transform .15s ease; }
.oc-qty:not(:disabled):hover { background: #fbbf24; color: #1c1917; }
.oc-qty:not(:disabled):active { transform: scale(.88); }

@media (prefers-reduced-motion: reduce) {
	.oc-ring, .oc-rise, .oc-float { animation: none; }
	.oc-item .oc-thumb, .oc-btn, .oc-btn::before, .oc-qty { transition: none; }
	.oc-item:hover .oc-thumb { transform: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Cart item                                                                 */
/* -------------------------------------------------------------------------- */

const CartItem = ({ product, unavailable, index, onDecrease, onIncrease, onRemove }) => {
	const qtyButton = 'oc-qty flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs text-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-40';

	return (
		<li
			className='oc-item oc-rise flex flex-col gap-4 rounded-2xl p-3 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:gap-6 sm:p-4'
			style={{ '--i': Math.min(index, 8) }}>
			{/* Image + details */}
			<div className='flex min-w-0 flex-1 gap-4 sm:gap-5'>
				<div className='flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 p-2.5 ring-1 ring-stone-200/80 sm:h-28 sm:w-28'>
					<img
						loading='lazy'
						src={product.image}
						alt={product.title}
						className={`oc-thumb max-h-full max-w-full object-contain ${unavailable ? 'opacity-50 grayscale' : ''}`}
						style={{ filter: unavailable ? undefined : 'drop-shadow(0 8px 6px rgba(28,25,23,.25))' }}
					/>
				</div>

				<div className='flex min-w-0 flex-1 flex-col justify-center'>
					<h3 className='break-words font-semibold leading-snug text-stone-900'>{product.title}</h3>
					<p className='mt-1 text-xs text-stone-400'>Premium Product</p>

					{product.status === 'archived' ? (
						<span className='mt-2 inline-flex w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200'>Archived</span>
					) : product.status === 'out_of_stock' ? (
						<span className='mt-2 inline-flex w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200'>Out of stock</span>
					) : null}

					<p className='mt-2 text-sm text-stone-500'>
						<span className='font-semibold text-stone-800'>${product.price.toFixed(2)}</span> each
					</p>
				</div>
			</div>

			{/* Quantity, subtotal, remove */}
			<div className='flex items-center justify-between gap-3 border-t border-dashed border-stone-200 pt-4 sm:justify-end sm:gap-6 sm:border-0 sm:pt-0'>
				<div
					className='flex items-center rounded-full bg-stone-100 p-1 ring-1 ring-inset ring-stone-200'
					role='group'
					aria-label={`Quantity of ${product.title}`}>
					<button
						type='button'
						className={qtyButton}
						disabled={unavailable}
						onClick={onDecrease}
						aria-label={`Decrease quantity of ${product.title}`}>
						<FaMinus aria-hidden='true' />
					</button>

					<span
						className='oc-display w-9 text-center text-base font-bold text-stone-900'
						aria-live='polite'>
						{product.quantity}
					</span>

					<button
						type='button'
						className={qtyButton}
						disabled={unavailable}
						onClick={onIncrease}
						aria-label={`Increase quantity of ${product.title}`}>
						<FaPlus aria-hidden='true' />
					</button>
				</div>

				<div className='min-w-[4.5rem] text-right sm:min-w-[5.5rem]'>
					<p className='text-xs text-stone-400'>Subtotal</p>
					<p className={`oc-display text-lg font-bold ${unavailable ? 'text-stone-400 line-through' : 'text-stone-900'}`}>${(product.quantity * Number(product.price || 0)).toFixed(2)}</p>
				</div>

				<button
					type='button'
					onClick={onRemove}
					aria-label={`Remove ${product.title} from cart`}
					className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 ring-1 ring-inset ring-stone-200 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 active:scale-90'>
					<IoTrash aria-hidden='true' />
				</button>
			</div>
		</li>
	);
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const Cart = ({ address, setAddress }) => {
	const cart = useSelector((state) => state.cart);

	const [isModelOpen, setIsModelOpen] = useState(false);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { getToken, isSignedIn } = useAuth();

	useEffect(() => {
		if (!isSignedIn) return;

		let cancelled = false;

		const refreshCart = async () => {
			try {
				const products = await fetchUserCart(getToken);

				if (!cancelled) {
					dispatch(replaceCart(products));
				}
			} catch (error) {
				console.error('Failed to refresh cart:', error.message);
			}
		};

		refreshCart();

		return () => {
			cancelled = true;
		};
	}, [dispatch, getToken, isSignedIn]);

	const { increaseProduct, decreaseProduct, removeProduct } = useCartSync();

	// Products that are archived or out of stock remain visible so the user can remove them.
	const isUnavailable = (product) => product.unavailable === true || product.status === 'archived' || product.status === 'out_of_stock';

	const availableProducts = cart.product.filter((product) => !isUnavailable(product));
	const availableQuantity = availableProducts.reduce((total, product) => total + product.quantity, 0);
	const availableTotal = availableProducts.reduce((total, product) => total + product.quantity * Number(product.price || 0), 0);
	const hasUnavailableProducts = availableProducts.length !== cart.product.length;

	const hasProducts = cart.product.length > 0;
	const productCount = cart.product.length;

	return (
		<main className='min-h-screen bg-stone-100'>
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

				<div className='relative mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6 sm:pb-36 sm:pt-14'>
					<div className='flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8'>
						<div className='relative h-20 w-20 shrink-0 sm:h-24 sm:w-24'>
							{hasProducts && <span className='oc-ring absolute inset-0 rounded-[28px] border-2 border-amber-400/70' />}
							<span className='relative flex h-full w-full items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-300 to-amber-600 text-3xl text-stone-950 shadow-2xl shadow-amber-900/40 sm:text-4xl'>
								<FaShoppingBag aria-hidden='true' />
							</span>
						</div>

						<div className='min-w-0'>
							<h1 className='oc-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>Shopping Cart</h1>
							<p className='mt-3 max-w-xl text-base text-stone-300 sm:text-lg'>{hasProducts ? 'Review your selection, fine-tune quantities and head to checkout whenever you’re ready.' : 'Nothing here yet — but great finds are only a click away.'}</p>

							<div className='mt-5 inline-flex max-w-full flex-wrap items-center gap-3 rounded-full bg-white/5 py-1.5 pl-5 pr-1.5 ring-1 ring-white/15'>
								<span className='text-sm text-stone-400'>In your cart</span>
								<span className='oc-display text-lg font-bold text-amber-300'>{productCount}</span>
								<span className='rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-stone-100 ring-1 ring-white/15'>{productCount === 1 ? 'product' : 'products'}</span>
							</div>
						</div>
					</div>

					<CheckoutProgress
						current='cart'
						className='mt-10'
					/>
				</div>
			</header>

			<div className='relative z-10 mx-auto -mt-24 max-w-6xl px-4 pb-20 sm:-mt-28 sm:px-6'>
				{hasProducts ? (
					<>
						<div className='grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px]'>
							{/* PRODUCTS */}
							<section
								aria-label='Cart items'
								className='rounded-[28px] border border-stone-200 bg-white p-4 shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)] sm:p-7'>
								<div className='flex items-baseline justify-between gap-4 px-2 sm:px-0'>
									<h2 className='oc-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl'>Your items</h2>
									<p className='text-sm text-stone-500'>
										{productCount} {productCount === 1 ? 'product' : 'products'}
									</p>
								</div>

								<ul className='mt-4 divide-y divide-stone-100'>
									{cart.product.map((product, index) => (
										<CartItem
											key={product.id}
											product={product}
											unavailable={isUnavailable(product)}
											index={index}
											onDecrease={() => decreaseProduct(product.id)}
											onIncrease={() => increaseProduct(product.id)}
											onRemove={() => removeProduct(product.id)}
										/>
									))}
								</ul>
							</section>

							{/* TOTALS */}
							<aside className='lg:sticky lg:top-[5.25rem]'>
								<section
									aria-label='Cart totals'
									className='relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.8)] sm:p-7'
									style={{ background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)' }}>
									<div
										className='pointer-events-none absolute inset-0 opacity-70'
										style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
									/>
									<div
										className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full'
										style={{ background: 'radial-gradient(circle, rgba(251,191,36,.28), transparent 70%)' }}
									/>

									<div className='relative'>
										<h2 className='oc-display text-lg font-bold'>Cart totals</h2>

										<div className='mt-3 border-t border-white/10'>
											<div className='flex items-center justify-between gap-4 border-b border-white/10 py-3 text-sm'>
												<span className='text-stone-400'>Total items</span>
												<span className='oc-display text-base font-bold text-white'>{availableQuantity}</span>
											</div>
										</div>

										{/* Shipping address */}
										<div className='mt-5 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10'>
											<div className='flex items-start gap-3'>
												<span className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm text-amber-400'>
													<FaMapMarkerAlt aria-hidden='true' />
												</span>
												<div className='min-w-0'>
													<p className='text-xs font-medium text-stone-400'>Shipping address</p>
													<p className='mt-0.5 break-words text-sm font-medium text-white'>{address}</p>
												</div>
											</div>

											<button
												type='button'
												onClick={() => setIsModelOpen(true)}
												className='mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400'>
												Change address
											</button>
										</div>

										{hasUnavailableProducts && (
											<p className='mt-4 flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-xs leading-5 text-amber-200 ring-1 ring-amber-300/20'>
												<FaExclamationCircle
													className='mt-0.5 shrink-0'
													aria-hidden='true'
												/>
												Unavailable items aren’t included in your total.
											</p>
										)}

										<div className='mt-6 border-t border-dashed border-white/20 pt-5'>
											<p className='text-xs font-medium text-stone-400'>Total</p>
											<p className='oc-display mt-1 text-4xl font-bold tracking-tight text-amber-300'>${availableTotal.toFixed(2)}</p>
										</div>

										<button
											type='button'
											className='group mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-4 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/25 transition hover:shadow-xl hover:shadow-amber-500/40 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100'
											disabled={availableProducts.length === 0}
											onClick={() => navigate('/checkout')}>
											Proceed to Checkout
											<FaArrowRight
												className='text-xs transition-transform duration-300 group-enabled:group-hover:translate-x-1'
												aria-hidden='true'
											/>
										</button>
									</div>
								</section>
							</aside>
						</div>

						<Modal
							isModelOpen={isModelOpen}
							setIsModelOpen={setIsModelOpen}>
							<ChangeAddress
								address={address}
								setAddress={setAddress}
								closeModal={setIsModelOpen}
							/>
						</Modal>
					</>
				) : (
					<section
						aria-label='Empty cart'
						className='oc-rise relative mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-stone-200 bg-white px-6 py-12 text-center shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)] sm:px-10 sm:py-16'>
						<div
							className='pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full'
							style={{ background: 'radial-gradient(circle, rgba(251,191,36,.2), transparent 70%)' }}
						/>
						<div
							className='pointer-events-none absolute inset-0 opacity-[.5]'
							style={{ backgroundImage: 'radial-gradient(rgba(120,113,108,.14) 1px, transparent 1px)', backgroundSize: '18px 18px', WebkitMaskImage: 'radial-gradient(60% 60% at 50% 30%, #000, transparent)', maskImage: 'radial-gradient(60% 60% at 50% 30%, #000, transparent)' }}
						/>

						<div className='relative'>
							<div className='oc-float relative mx-auto h-44 w-44 sm:h-52 sm:w-52'>
								<span className='absolute -inset-3 rounded-full border-2 border-dashed border-amber-300/70' />
								<div className='relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-stone-100 to-stone-200 p-6 shadow-xl shadow-stone-900/10 ring-1 ring-stone-200'>
									<img
										loading='lazy'
										src={emptyCart}
										alt='Empty Cart'
										className='max-h-full max-w-full object-contain'
									/>
								</div>
								<span className='absolute -bottom-1 -right-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg text-stone-950 shadow-lg shadow-amber-500/30 ring-4 ring-white'>
									<FaShoppingBag aria-hidden='true' />
								</span>
							</div>

							<h2 className='oc-display mt-9 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>Your cart is empty</h2>
							<p className='mx-auto mt-3 max-w-md text-base text-stone-500'>Looks like you haven’t added anything yet. Browse our collections and pick something you’ll love.</p>

							<button
								type='button'
								onClick={() => navigate('/')}
								className='oc-btn mt-8 inline-flex items-center gap-3 rounded-full bg-stone-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stone-900/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[.98]'>
								Continue Shopping
								<FaArrowRight
									className='text-xs'
									aria-hidden='true'
								/>
							</button>
						</div>
					</section>
				)}
			</div>
		</main>
	);
};

export default Cart;
