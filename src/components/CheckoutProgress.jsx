import React, { useEffect, useState } from 'react';
import { FaCheck, FaCheckCircle, FaCreditCard, FaShoppingBag } from 'react-icons/fa';

/* -------------------------------------------------------------------------- */
/*  CheckoutProgress                                                          */
/*                                                                            */
/*  One shared tracker for the whole journey:                                 */
/*      Cart  →  Checkout  →  Order Confirmation                              */
/*                                                                            */
/*  The PAGE decides the active step through the `current` prop:              */
/*      <CheckoutProgress current='cart' />                                   */
/*      <CheckoutProgress current='checkout' />                               */
/*      <CheckoutProgress current='confirmation' />                           */
/*                                                                            */
/*  Steps before `current` are completed, `current` is highlighted, and the   */
/*  rest are upcoming. Purely visual — no data, routing or business logic.    */
/*  Built for the dark stone hero header used on all three pages.             */
/* -------------------------------------------------------------------------- */

const DISPLAY_FONT = "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif";
const DASH = 'repeating-linear-gradient(90deg,rgba(255,255,255,.22) 0 6px,transparent 6px 12px)';

const STEPS = [
	{ key: 'cart', label: 'Cart', shortLabel: 'Cart', note: 'Review your items', icon: FaShoppingBag },
	{ key: 'checkout', label: 'Checkout', shortLabel: 'Checkout', note: 'Details & payment', icon: FaCreditCard },
	{ key: 'confirmation', label: 'Order Confirmation', shortLabel: 'Confirmation', note: 'Your order is placed', icon: FaCheckCircle },
];

const NODE_LOOK = {
	done: 'bg-gradient-to-br from-amber-300 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30',
	current: 'scale-110 bg-stone-900 text-amber-300 ring-4 ring-amber-400/50 shadow-[0_0_32px_rgba(251,191,36,.35)]',
	upcoming: 'border-2 border-dashed border-white/25 bg-stone-950 text-white/40',
};

const LABEL_LOOK = {
	done: 'text-stone-200',
	current: 'text-white',
	upcoming: 'text-stone-500',
};

const STATUS_TEXT = {
	done: 'completed',
	current: 'current step',
	upcoming: 'upcoming',
};

const CheckoutProgress = ({ current = 'cart', className = '' }) => {
	const foundIndex = STEPS.findIndex((step) => step.key === current);
	const currentIndex = foundIndex === -1 ? 0 : foundIndex;
	const targetPct = (currentIndex / (STEPS.length - 1)) * 100;

	// The line fills up to the active step when the page appears.
	const [pct, setPct] = useState(0);

	useEffect(() => {
		const timer = setTimeout(() => setPct(targetPct), 80);
		return () => clearTimeout(timer);
	}, [targetPct]);

	const stateOf = (index) => (index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming');

	return (
		<nav
			aria-label='Checkout progress'
			className={`relative w-full max-w-xl ${className}`}>
			{/* Connecting line: runs from the first step's centre to the last step's centre */}
			<div
				aria-hidden='true'
				className='absolute left-[16.667%] right-[16.667%] top-[22px] h-[3px] -translate-y-1/2 overflow-hidden rounded-full sm:top-6'
				style={{ backgroundImage: DASH }}>
				<div
					className='h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-1000 ease-out motion-reduce:transition-none'
					style={{ width: `${pct}%` }}
				/>
			</div>

			<ol className='relative grid grid-cols-3'>
				{STEPS.map((step, index) => {
					const state = stateOf(index);
					const Icon = step.icon;

					return (
						<li
							key={step.key}
							aria-current={state === 'current' ? 'step' : undefined}
							className='flex flex-col items-center px-1 text-center'>
							<span className={`relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-base transition-all duration-700 motion-reduce:transition-none sm:h-12 sm:w-12 sm:text-lg ${NODE_LOOK[state]}`}>
								{state === 'current' && <span className='absolute inset-0 rounded-full border-2 border-amber-400/70 animate-ping motion-reduce:animate-none' />}

								<Icon aria-hidden='true' />

								{state === 'done' && (
									<span className='absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 text-[8px] text-amber-300 ring-2 ring-stone-950 sm:h-5 sm:w-5 sm:text-[9px]'>
										<FaCheck aria-hidden='true' />
									</span>
								)}
							</span>

							<span
								className={`mt-3 text-xs font-bold tracking-tight transition-colors duration-700 motion-reduce:transition-none sm:text-sm ${LABEL_LOOK[state]}`}
								style={{ fontFamily: DISPLAY_FONT }}>
								<span className='sm:hidden'>{step.shortLabel}</span>
								<span className='hidden sm:inline'>{step.label}</span>
								<span className='sr-only'> ({STATUS_TEXT[state]})</span>
							</span>

							<span className={`mt-0.5 hidden text-xs transition-colors duration-700 sm:block ${state === 'upcoming' ? 'text-stone-600' : 'text-stone-400'}`}>{step.note}</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
};

export default CheckoutProgress;
