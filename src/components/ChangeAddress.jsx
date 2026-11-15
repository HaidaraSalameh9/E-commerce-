import React, { useState, useRef, useEffect } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';

const ChangeAddress = ({ address, setAddress, closeModal }) => {
	const [newAddress, setNewAddress] = useState(address || '');
	const [focused, setFocused] = useState(false);
	const inputRef = useRef();

	useEffect(() => {
		inputRef.current.focus();
	}, []);

	const onClose = () => {
		if (!newAddress.trim()) return;
		setAddress(newAddress);
		closeModal(false);
	};

	return (
		<div>
			<div
				className={`flex w-full items-center gap-3 rounded-2xl border px-4 transition-all duration-300 ease-soft ${
					focused ? 'border-brass-400 bg-white ring-4 ring-brass-400/15' : 'border-stone-200 bg-stone-50/60 hover:border-stone-300'
				}`}>
				<FaMapMarkerAlt
					aria-hidden='true'
					className={`shrink-0 text-base transition-colors duration-300 ${focused ? 'text-brass-600' : 'text-stone-400'}`}
				/>
				<input
					ref={inputRef}
					className='h-12 w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400'
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					value={newAddress}
					onChange={(e) => setNewAddress(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && onClose()}
					type='text'
					placeholder='Change Address'
				/>
			</div>

			<div className='mt-5 flex justify-end gap-2'>
				<button
					onClick={() => closeModal(false)}
					className='rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition duration-300 ease-soft hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400'>
					Cancel
				</button>

				<button
					onClick={onClose}
					disabled={!newAddress.trim()}
					className='rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-5 py-2.5 text-sm font-bold text-ink shadow-sm shadow-brass-500/25 transition duration-300 ease-soft hover:-translate-y-0.5 hover:from-brass-200 hover:to-brass-400 hover:shadow-md hover:shadow-brass-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm'>
					Save Address
				</button>
			</div>
		</div>
	);
};

export default ChangeAddress;
