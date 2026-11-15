import React from 'react';

const Modal = ({ isModelOpen, setIsModelOpen, children }) => {
	if (!isModelOpen) return null;
	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm'
			onClick={() => setIsModelOpen(false)}>
			<div
				className='relative w-full max-w-md animate-pop overflow-hidden rounded-card bg-white shadow-float'
				onClick={(e) => e.stopPropagation()}>
				{/* Brass seam — the brand mark across the top of the panel */}
				<div
					aria-hidden='true'
					className='h-1.5 w-full bg-gradient-to-r from-brass-300 via-brass-500 to-brass-300'
				/>

				<div className='p-6 sm:p-7'>
					<button
						type='button'
						aria-label='Close modal'
						className='absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-xl leading-none text-stone-500 transition duration-300 ease-soft hover:bg-charcoal hover:text-brass-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400'
						onClick={() => setIsModelOpen(false)}>
						&times;
					</button>

					<div>{children}</div>
				</div>
			</div>
		</div>
	);
};

export default Modal;
