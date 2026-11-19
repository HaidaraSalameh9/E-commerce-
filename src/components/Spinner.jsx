import React from 'react';

/**
 * Spinner — same usage as before (<Spinner />), restyled to match
 * the site's dark charcoal + brass identity.
 *
 * Optional props (existing usages keep working unchanged):
 *   size      – diameter in px (default 56)
 *   label     – accessible status text (default "Loading...")
 *   className – extra classes for the wrapper (e.g. spacing)
 */
const Spinner = ({ size = 56, label = 'Loading...', className = '' }) => {
	return (
		<div
			role='status'
			aria-live='polite'
			className={`flex flex-col items-center justify-center gap-4 ${className}`}>
			<span
				aria-hidden='true'
				className='relative inline-block shrink-0'
				style={{ width: size, height: size }}>
				{/* Soft gold glow */}
				<span className='absolute inset-0 rounded-full bg-brass-500/15 blur-md' />

				{/* Track */}
				<span className='absolute inset-0 rounded-full border-4 border-white/10' />

				{/* Spinning brass arc */}
				<span className='absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brass-400 border-r-brass-300' />

				{/* Center dot */}
				<span className='absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-brass-300' />
			</span>

			<span className='sr-only'>{label}</span>
		</div>
	);
};

export default Spinner;
