import { useUser } from '@clerk/react';
import React, { useState } from 'react';
import { FaAngleDown, FaArrowRight, FaBuilding, FaCheck, FaCreditCard, FaEnvelope, FaLock, FaMailBulk, FaMapMarkerAlt, FaMoneyBillWave, FaPhoneAlt, FaReceipt, FaRegCalendarAlt, FaTruck, FaUser } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@clerk/react';
import { createUserOrder } from '../services/ordersService';
import useCartSync from '../hooks/useCartSync';
import CheckoutProgress from '../components/CheckoutProgress';

/* -------------------------------------------------------------------------- */
/*  Styles (same design language as OrderConfirm / Cart)                      */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.oc-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes oc-pulse { 0% { transform: scale(1); opacity: .75; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes oc-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes co-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }

.oc-ring { animation: oc-pulse 2.8s ease-out infinite; }
.oc-rise { animation: oc-rise .7s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 90ms + 80ms); }
.co-bar { animation: co-bar 1.2s ease-in-out infinite; }

/* Inputs: elegant focus + validation-error states (shown after the user interacts or submits) */
.co-input:user-invalid { border-color: #fb7185; background-color: #fff1f2; }
.co-input:user-invalid:focus { border-color: #f43f5e; box-shadow: 0 0 0 4px rgba(244,63,94,.18); }
.co-error { display: none; }
.co-field:has(.co-input:user-invalid) .co-error { display: block; }
.co-field:has(.co-input:user-invalid) .co-icon { color: #f43f5e; }
.co-field:focus-within .co-icon { color: #d97706; }

.co-pay:has(input:focus-visible) { outline: 2px solid #f59e0b; outline-offset: 3px; }

.co-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.28) transparent; }

@media (prefers-reduced-motion: reduce) {
	.oc-ring, .oc-rise, .co-bar { animation: none; }
}
`;

const INPUT =
	'co-input w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-4 text-base text-stone-900 shadow-sm transition placeholder:text-stone-400 hover:border-stone-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-400/25 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-500';

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

// Labelled input with a leading icon. `required` only affects the visual markers —
// the real `required` attribute stays on the <input> itself, exactly as before.
const Field = ({ label, icon, required = false, className = '', children }) => (
	<label className={`co-field block ${className}`}>
		<span className='mb-1.5 flex items-center gap-1 text-sm font-semibold text-stone-700'>
			{label}
			{required && (
				<span
					className='text-amber-600'
					aria-hidden='true'>
					*
				</span>
			)}
		</span>
		<span className='relative block'>
			<span
				className='co-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400 transition-colors'
				aria-hidden='true'>
				{icon}
			</span>
			{children}
		</span>
		{required && <span className='co-error mt-1.5 text-xs font-medium text-rose-600'>This field is required.</span>}
	</label>
);

// Collapsible card section (same toggle behaviour as the original accordions)
const Section = ({ id, index, icon, title, subtitle, open, onToggle, children }) => (
	<section
		className={`oc-rise rounded-[28px] border bg-white transition-shadow duration-300 ${open ? 'border-amber-300/70 shadow-[0_30px_60px_-30px_rgba(28,25,23,.45)]' : 'border-stone-200 shadow-[0_18px_40px_-26px_rgba(28,25,23,.35)] hover:shadow-[0_24px_48px_-28px_rgba(28,25,23,.45)]'}`}
		style={{ '--i': index }}>
		<button
			type='button'
			id={`${id}-header`}
			onClick={onToggle}
			aria-expanded={open}
			aria-controls={`${id}-panel`}
			className='flex w-full select-none items-center gap-4 rounded-[28px] px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:px-7 sm:py-5'>
			<span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base transition-all duration-500 sm:h-12 sm:w-12 sm:text-lg ${open ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30' : 'bg-stone-100 text-stone-600'}`}>
				{icon}
			</span>

			<span className='min-w-0 flex-1'>
				<span className='oc-display block text-lg font-bold tracking-tight text-stone-900 sm:text-xl'>{title}</span>
				<span className='block truncate text-xs text-stone-500 sm:text-sm'>{subtitle}</span>
			</span>

			<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl transition-all duration-300 ${open ? 'rotate-180 bg-stone-900 text-amber-300' : 'rotate-0 bg-stone-100 text-stone-600'}`}>
				<FaAngleDown aria-hidden='true' />
			</span>
		</button>

		<div
			id={`${id}-panel`}
			role='region'
			aria-labelledby={`${id}-header`}
			className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
			<div className='min-h-0 overflow-hidden'>
				<div className='px-5 pb-6 pt-2 sm:px-7 sm:pb-7'>{children}</div>
			</div>
		</div>
	</section>
);

const PaymentOption = ({ selected, onSelect, icon, title, description }) => (
	<label
		className={`co-pay group relative flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-300 ${selected ? 'border-amber-400 bg-amber-50/60 shadow-md shadow-amber-500/10 ring-4 ring-amber-400/15' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'}`}>
		<input
			type='radio'
			name='payment'
			checked={selected}
			onChange={onSelect}
			className='sr-only'
		/>

		<span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg transition-all duration-300 ${selected ? 'bg-stone-900 text-amber-300 shadow-lg shadow-stone-900/20' : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'}`}>{icon}</span>

		<span className='min-w-0 flex-1'>
			<span className='block font-semibold text-stone-900'>{title}</span>
			<span className='block text-xs leading-5 text-stone-500'>{description}</span>
		</span>

		<span
			className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] transition-all duration-300 ${selected ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950' : 'border-2 border-stone-300 bg-white text-transparent'}`}
			aria-hidden='true'>
			<FaCheck />
		</span>
	</label>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const Checkout = ({ setOrder, address }) => {
	const [pillingToggle, setPillingToggle] = useState(true);
	const [shippingToggle, setShippingToggle] = useState(false);
	const [paymentToggle, setPaymentToggle] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState('cod');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { user } = useUser();
	const { getToken } = useAuth();

	const dispatch = useDispatch();
	const { clearUserCart } = useCartSync();

	const [shippingInformation, setShippingInformation] = useState({
		address: address,
		city: '',
		zip: '',
		phone: '',
	});

	const [cardInfo, setCardInfo] = useState({
		cardNumber: '',
		cardHolder: '',
		expiry: '',
		cvv: '',
	});
	const navigate = useNavigate();
	const cart = useSelector((state) => state.cart);

	const handleOrder = async (e) => {
		e.preventDefault();

		if (isSubmitting) return;

		if (!user) {
			alert('Please sign in before placing an order.');
			return;
		}

		if (!cart.product?.length) {
			alert('Your cart is empty.');
			return;
		}

		if (!shippingInformation.address?.trim() || !shippingInformation.city?.trim() || !shippingInformation.zip?.trim() || !shippingInformation.phone?.trim()) {
			alert('Please complete all shipping information.');
			return;
		}

		setIsSubmitting(true);

		try {
			const orderData = {
				products: cart.product,
				shippingInformation,
				paymentMethod,
			};

			const savedOrder = await createUserOrder(orderData, getToken);

			const cartCleared = await clearUserCart();

			setOrder(savedOrder);

			if (!cartCleared) {
				alert('Your order was placed successfully, but the cart could not be cleared. Please refresh your cart before placing another order.');
				return;
			}

			navigate(`/order-confirmation/${savedOrder.orderId}`);
		} catch (error) {
			console.error('Order creation failed:', error);

			alert(error.message || 'Could not place your order.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Display-only values for the summary
	const productCount = cart.product?.length || 0;
	const paymentLabel = paymentMethod === 'cod' ? 'Cash On Delivery' : 'Debit Card';
	const PaymentIcon = paymentMethod === 'cod' ? FaMoneyBillWave : FaCreditCard;

	return (
		<form
			onSubmit={handleOrder}
			className='min-h-screen bg-stone-100'>
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
							<span className='oc-ring absolute inset-0 rounded-[28px] border-2 border-amber-400/70' />
							<span className='relative flex h-full w-full items-center justify-center rounded-[28px] bg-gradient-to-br from-amber-300 to-amber-600 text-3xl text-stone-950 shadow-2xl shadow-amber-900/40 sm:text-4xl'>
								<FaReceipt aria-hidden='true' />
							</span>
						</div>

						<div className='min-w-0'>
							<h1 className='oc-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>Checkout</h1>
							<p className='mt-3 max-w-xl text-base text-stone-300 sm:text-lg'>Just a few details and your order is on its way.</p>

							<p className='mt-5 inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/5 px-4 py-2 text-xs text-stone-300 ring-1 ring-white/15 sm:text-sm'>
								<FaLock
									className='shrink-0 text-amber-300'
									aria-hidden='true'
								/>
								You’re signed in — review your details before placing your order.
							</p>
						</div>
					</div>

					<CheckoutProgress
						current='checkout'
						className='mt-10'
					/>
				</div>
			</header>

			<div className='relative z-10 mx-auto -mt-24 max-w-6xl px-4 pb-20 sm:-mt-28 sm:px-6'>
				<div className='grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start'>
					{/* FORM SECTIONS */}
					<div className='min-w-0 space-y-5 sm:space-y-6'>
						{/* Billing */}
						<Section
							id='billing'
							index={0}
							icon={<FaUser aria-hidden='true' />}
							title='Billing Information'
							subtitle='Your account details'
							open={pillingToggle}
							onToggle={() => setPillingToggle(!pillingToggle)}>
							<div className='grid gap-4 sm:grid-cols-2'>
								<Field
									label='Name'
									icon={<FaUser />}>
									<input
										className={INPUT}
										type='text'
										placeholder='Enter Name'
										value={user?.fullName}
										disabled
									/>
								</Field>

								<Field
									label='Email'
									icon={<FaEnvelope />}>
									<input
										className={INPUT}
										type='email'
										placeholder='Enter Email'
										value={user?.primaryEmailAddress?.emailAddress}
										disabled
									/>
								</Field>

								<Field
									label='Phone'
									icon={<FaPhoneAlt />}
									required
									className='sm:col-span-2'>
									<input
										className={INPUT}
										type='text'
										placeholder='Enter Phone'
										autoComplete='tel'
										required
										onChange={(e) => setShippingInformation({ ...shippingInformation, phone: e.target.value })}
									/>
								</Field>
							</div>
						</Section>

						{/* Shipping */}
						<Section
							id='shipping'
							index={1}
							icon={<FaTruck aria-hidden='true' />}
							title='Shipping Information'
							subtitle='Where should we deliver?'
							open={shippingToggle}
							onToggle={() => setShippingToggle(!shippingToggle)}>
							<div className='grid gap-4 sm:grid-cols-2'>
								<Field
									label='Address'
									icon={<FaMapMarkerAlt />}
									className='sm:col-span-2'>
									<input
										className={INPUT}
										type='text'
										name='address'
										placeholder='Enter Address'
										value={address}
										disabled
									/>
								</Field>

								<Field
									label='City'
									icon={<FaBuilding />}
									required>
									<input
										className={INPUT}
										type='text'
										name='city'
										placeholder='Enter City Name'
										autoComplete='address-level2'
										onChange={(e) => setShippingInformation({ ...shippingInformation, city: e.target.value })}
										required
									/>
								</Field>

								<Field
									label='Zip Code'
									icon={<FaMailBulk />}
									required>
									<input
										className={INPUT}
										type='text'
										name='zip'
										required
										placeholder='Enter Zip Code'
										autoComplete='postal-code'
										onChange={(e) => setShippingInformation({ ...shippingInformation, zip: e.target.value })}
									/>
								</Field>
							</div>
						</Section>

						{/* Payment Method */}
						<Section
							id='payment'
							index={2}
							icon={<FaCreditCard aria-hidden='true' />}
							title='Payment Method'
							subtitle={paymentLabel}
							open={paymentToggle}
							onToggle={() => setPaymentToggle(!paymentToggle)}>
							<div className='grid gap-3 sm:grid-cols-2'>
								{/* Cash on Delivery */}
								<PaymentOption
									selected={paymentMethod === 'cod'}
									onSelect={() => setPaymentMethod('cod')}
									icon={<FaMoneyBillWave aria-hidden='true' />}
									title='Cash On Delivery'
									description='Pay when your order arrives.'
								/>

								{/* Debit Card */}
								<PaymentOption
									selected={paymentMethod === 'dc'}
									onSelect={() => setPaymentMethod('dc')}
									icon={<FaCreditCard aria-hidden='true' />}
									title='Debit Card'
									description='Pay with your debit card.'
								/>
							</div>

							{paymentMethod === 'dc' && (
								<div className='oc-rise mt-5 rounded-2xl bg-stone-50 p-4 ring-1 ring-inset ring-stone-200 sm:p-5'>
									<h3 className='oc-display text-base font-bold text-stone-900 sm:text-lg'>Debit Card Information</h3>

									<div className='mt-4 grid gap-4 sm:grid-cols-2'>
										<Field
											label='Card Number'
											icon={<FaCreditCard />}
											required
											className='sm:col-span-2'>
											<input
												required
												className={INPUT}
												type='text'
												placeholder='Enter Card Number'
												autoComplete='cc-number'
												inputMode='numeric'
												onChange={(e) => setCardInfo({ ...cardInfo, cardNumber: e.target.value })}
											/>
										</Field>

										<Field
											label='Card Holder Name'
											icon={<FaUser />}
											className='sm:col-span-2'>
											<input
												placeholder='Card Holder Name'
												className={INPUT}
												type='text'
												autoComplete='cc-name'
												onChange={(e) => setCardInfo({ ...cardInfo, cardHolder: e.target.value })}
											/>
										</Field>

										<Field
											label='Expiry Date'
											icon={<FaRegCalendarAlt />}>
											<input
												className={INPUT}
												type='text'
												placeholder='Expiry Date'
												autoComplete='cc-exp'
												onChange={(e) => setCardInfo({ ...cardInfo, expiry: e.target.value })}
											/>
										</Field>

										<Field
											label='CVV'
											icon={<FaLock />}>
											<input
												className={INPUT}
												type='text'
												placeholder='CVV'
												autoComplete='cc-csc'
												inputMode='numeric'
												onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value })}
											/>
										</Field>
									</div>
								</div>
							)}
						</Section>
					</div>

					{/* ORDER SUMMARY */}
					<aside className='lg:sticky lg:top-[5.25rem]'>
						<section
							aria-label='Order summary'
							className='oc-rise relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.8)] sm:p-7'
							style={{ background: 'linear-gradient(160deg,#292524 0%,#1c1917 50%,#0c0a09 100%)', '--i': 1 }}>
							<div
								className='pointer-events-none absolute inset-0 opacity-70'
								style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
							/>
							<div
								className='pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full'
								style={{ background: 'radial-gradient(circle, rgba(251,191,36,.28), transparent 70%)' }}
							/>

							{/* Submission progress bar */}
							{isSubmitting && (
								<div
									className='absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/10'
									aria-hidden='true'>
									<span className='co-bar block h-full w-1/4 bg-gradient-to-r from-amber-300 to-amber-500' />
								</div>
							)}

							<div className='relative'>
								<div className='flex items-baseline justify-between gap-4'>
									<h2 className='oc-display text-lg font-bold'>Order Summary</h2>
									<p className='text-sm text-stone-400'>
										{productCount} {productCount === 1 ? 'item' : 'items'}
									</p>
								</div>

								<div className='mt-3 border-t border-white/10'>
									{productCount === 0 ? (
										<p className='py-6 text-center text-sm text-stone-400'>Your cart is empty.</p>
									) : (
										<ul className='co-scroll max-h-[min(18rem,32vh)] divide-y divide-white/10 overflow-y-auto pr-1'>
											{cart.product?.map((product) => (
												<li
													key={product.id}
													className='flex items-center gap-4 py-3'>
													<span className='flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 p-1.5 ring-1 ring-white/10'>
														<img
															src={product.image}
															alt={product.title}
															loading='lazy'
															className='max-h-full max-w-full object-contain'
														/>
													</span>

													<div className='min-w-0 flex-1'>
														<h4 className='line-clamp-2 break-words text-sm font-semibold leading-snug text-white'>{product.title.slice(0.25)}</h4>
														<p className='mt-1 text-xs text-stone-400'>
															${product.price} x {product.quantity}
														</p>
													</div>
												</li>
											))}
										</ul>
									)}
								</div>

								<div className='flex items-center justify-between gap-4 border-t border-white/10 py-3 text-sm'>
									<span className='text-stone-400'>Payment</span>
									<span className='inline-flex items-center gap-2 text-right font-medium text-white'>
										<PaymentIcon
											className='text-amber-400'
											aria-hidden='true'
										/>
										{paymentLabel}
									</span>
								</div>

								<div className='mt-2 border-t border-dashed border-white/20 pt-5'>
									<p className='text-xs font-medium text-stone-400'>Total Price</p>
									<p className='oc-display mt-1 text-4xl font-bold tracking-tight text-amber-300'>${cart.totalPrice.toFixed(2)}</p>
								</div>

								<button
									type='submit'
									disabled={isSubmitting}
									aria-busy={isSubmitting}
									className='group mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-4 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/25 transition hover:shadow-xl hover:shadow-amber-500/40 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:brightness-100 disabled:active:scale-100'>
									{isSubmitting ? (
										<>
											<span
												className='h-4 w-4 animate-spin rounded-full border-2 border-stone-950/30 border-t-stone-950'
												aria-hidden='true'
											/>
											Placing order...
										</>
									) : (
										<>
											Place Order
											<FaArrowRight
												className='text-xs transition-transform duration-300 group-hover:translate-x-1'
												aria-hidden='true'
											/>
										</>
									)}
								</button>

								<p className='mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-stone-400'>
									<FaLock
										className='mt-1 shrink-0 text-amber-400'
										aria-hidden='true'
									/>
									Please check your details before placing your order.
								</p>
							</div>
						</section>
					</aside>
				</div>
			</div>
		</form>
	);
};

export default Checkout;
