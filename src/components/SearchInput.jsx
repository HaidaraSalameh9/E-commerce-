import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSearchResults } from '../app/features/searchSlice';
import { useNavigate } from 'react-router-dom';
import { FaBoxOpen } from 'react-icons/fa';
import { LuSearch, LuX } from 'react-icons/lu';

/* -------------------------------------------------------------------------- */
/*  Result thumbnail — falls back to an icon if the image is missing/broken   */
/* -------------------------------------------------------------------------- */

const ResultThumb = ({ src, alt }) => {
	const [failed, setFailed] = useState(false);

	return (
		<span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 p-1 ring-1 ring-stone-200'>
			{src && !failed ? (
				<img
					src={src}
					alt={alt}
					loading='lazy'
					onError={() => setFailed(true)}
					className='h-full w-full object-contain mix-blend-multiply'
				/>
			) : (
				<FaBoxOpen
					className='text-stone-400'
					aria-hidden='true'
				/>
			)}
		</span>
	);
};

/* -------------------------------------------------------------------------- */
/*  Search                                                                    */
/*                                                                            */
/*  variant='bar'   → compact field inside the desktop navbar; expands on     */
/*                    focus without pushing the other navbar items around.    */
/*  variant='sheet' → full-width field used in the mobile search sheet.       */
/*  Logic is unchanged: 200 ms debounce → fetchSearchResults(query), results  */
/*  and loading come from state.searchProduct, picking a result navigates to  */
/*  /productDetails/:id.                                                      */
/* -------------------------------------------------------------------------- */

const SearchInput = ({ variant = 'bar', autoFocus = false, onNavigate }) => {
	const [focused, setFocused] = useState(false);
	const [query, setQuery] = useState('');
	const dispatch = useDispatch();
	const navigate = useNavigate();

	const inputRef = useRef(null);
	const panelRef = useRef(null);
	const blurTimer = useRef(null);

	const { results, loading } = useSelector((state) => state.searchProduct);

	const isBar = variant === 'bar';

	useEffect(() => {
		const timer = setTimeout(() => {
			if (query.trim()) {
				dispatch(fetchSearchResults(query));
			}
		}, 200);

		return () => clearTimeout(timer);
	}, [query, dispatch]);

	// Mobile sheet: focus the field when the sheet opens
	useEffect(() => {
		if (!autoFocus) return;
		const frame = requestAnimationFrame(() => inputRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, [autoFocus]);

	useEffect(() => () => clearTimeout(blurTimer.current), []);

	/* Focus/blur are handled on the wrapper so the panel stays open while focus
	   moves from the field to a result (keyboard users) and still closes 200 ms
	   after focus leaves, exactly like before. */
	const handleFocus = () => {
		clearTimeout(blurTimer.current);
		setFocused(true);
	};

	const handleBlur = () => {
		blurTimer.current = setTimeout(() => setFocused(false), 200);
	};

	const goTo = (product) => {
		navigate(`/productDetails/${product.id}`);
		setFocused(false);
		document.activeElement?.blur?.();
		onNavigate?.();
	};

	const handleInputKeyDown = (e) => {
		if (e.key === 'Escape') {
			setFocused(false);
			inputRef.current?.blur();
		} else if (e.key === 'ArrowDown') {
			const first = panelRef.current?.querySelector('[data-result]');
			if (first) {
				e.preventDefault();
				first.focus();
			}
		}
	};

	const handleResultKeyDown = (e) => {
		const items = Array.from(panelRef.current?.querySelectorAll('[data-result]') || []);
		const index = items.indexOf(e.currentTarget);

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			items[index + 1]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			(index <= 0 ? inputRef.current : items[index - 1])?.focus();
		} else if (e.key === 'Escape') {
			inputRef.current?.focus();
		}
	};

	const panelOpen = focused && query;

	const fieldClass = isBar
		? `absolute right-0 top-0 z-10 flex h-10 items-center gap-2 rounded-full pl-3.5 pr-1.5 ring-1 transition-[width,background-color,box-shadow] duration-500 ease-soft ${focused ? 'w-[min(22rem,60vw)] bg-ink shadow-[0_0_0_4px_rgba(251,191,36,.14)] ring-brass-400/60' : 'w-full bg-white/10 ring-white/15 hover:bg-white/15'}`
		: `flex h-12 w-full items-center gap-2 rounded-full pl-4 pr-1.5 ring-1 transition-[background-color,box-shadow] duration-300 ${focused ? 'bg-white/15 shadow-[0_0_0_4px_rgba(251,191,36,.14)] ring-brass-400/60' : 'bg-white/10 ring-white/15'}`;

	return (
		<div
			className={isBar ? 'relative h-10 w-44 xl:w-56' : 'relative w-full'}
			onFocus={handleFocus}
			onBlur={handleBlur}>
			<div className={fieldClass}>
				<LuSearch
					className={`shrink-0 text-lg transition-colors duration-300 ${focused ? 'text-brass-300' : 'text-white/60'}`}
					aria-hidden='true'
				/>
				<input
					ref={inputRef}
					type='text'
					value={query}
					placeholder='Search products...'
					aria-label='Search products'
					autoComplete='off'
					enterKeyHint='search'
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={handleInputKeyDown}
					className='w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/45'
				/>
				{query && (
					<button
						type='button'
						aria-label='Clear search'
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							setQuery('');
							inputRef.current?.focus();
						}}
						className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
						<LuX className='text-sm' />
					</button>
				)}
			</div>

			{/* Live results */}
			{panelOpen && (
				<div
					ref={panelRef}
					role='region'
					aria-label='Search results'
					className={`absolute z-50 mt-3 animate-swap overflow-hidden rounded-3xl bg-white text-stone-900 shadow-float ring-1 ring-stone-200 ${isBar ? 'right-0 top-full w-[min(26rem,calc(100vw-2rem))] origin-top-right' : 'inset-x-0 top-full origin-top'}`}>
					<div className='max-h-[min(24rem,60vh)] overflow-y-auto p-2'>
						{loading && (
							<div
								role='status'
								aria-live='polite'>
								<p className='px-3 pb-2 pt-2 text-sm text-stone-500'>Loading...</p>
								{[0, 1, 2].map((i) => (
									<div
										key={i}
										className='flex animate-pulse items-center gap-3 p-2'>
										<span className='h-12 w-12 rounded-xl bg-stone-200' />
										<span className='h-3 w-2/3 rounded-full bg-stone-200' />
									</div>
								))}
							</div>
						)}

						{!loading && results.length === 0 && (
							<div
								role='status'
								aria-live='polite'
								className='flex flex-col items-center gap-2 px-4 py-8 text-center'>
								<span className='flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400'>
									<LuSearch aria-hidden='true' />
								</span>
								<p className='text-sm text-stone-500'>No results found</p>
							</div>
						)}

						{!loading && results.length > 0 && (
							<>
								<p className='px-3 pb-1 pt-2 text-xs font-medium text-stone-400'>
									{results.length} {results.length === 1 ? 'result' : 'results'}
								</p>
								{results.map((product) => {
									const hasPrice = product.price != null && Number.isFinite(Number(product.price));

									return (
										<button
											type='button'
											key={product.id}
											data-result
											onMouseDown={() => goTo(product)}
											onClick={(e) => {
												// e.detail === 0 → keyboard activation (Enter/Space); mouse is handled on mousedown
												if (e.detail === 0) goTo(product);
											}}
											onKeyDown={handleResultKeyDown}
											className='group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors duration-200 hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-500'>
											<ResultThumb
												src={product.images?.[0]}
												alt=''
											/>
											<span className='line-clamp-2 min-w-0 flex-1 text-sm font-medium text-stone-800 group-hover:text-stone-950'>{product.title}</span>
											{hasPrice && <span className='shrink-0 font-display text-sm font-bold text-stone-900'>${Number(product.price).toFixed(2)}</span>}
										</button>
									);
								})}
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default SearchInput;
