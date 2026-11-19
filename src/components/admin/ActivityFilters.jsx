import { Search, SlidersHorizontal, X, CalendarDays } from 'lucide-react';

/**
 * ActivityFilters — same props as before, plus one optional prop:
 *   resultCount – when provided, shows how many activities match the
 *                 current filters. Omit it and nothing changes.
 *
 * Search behaviour: the text field searches users by FULL NAME or
 * EMAIL only (enforced in AdminActivity via matchesUserSearch).
 * User IDs are not searchable and are never shown in this UI.
 */
const activityTypes = [
	{ label: 'All Activities', value: 'all' },
	{ label: 'Orders', value: 'order' },
	{ label: 'Cart', value: 'cart' },
	{ label: 'Order Created', value: 'order_created' },
	{ label: 'Order Status Updated', value: 'order_status_updated' },
	{ label: 'Product Added', value: 'cart_added' },
	{ label: 'Product Removed', value: 'cart_removed' },
	{ label: 'Quantity Updated', value: 'cart_quantity_updated' },
];

const fieldClass =
	'h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-sm text-stone-100 outline-none transition duration-300 placeholder:text-stone-600 focus:border-brass-400 focus:bg-white/[0.06] focus:ring-4 focus:ring-brass-400/15 [&_option]:bg-[#161613] [&_option]:text-stone-100 [color-scheme:dark]';

export default function ActivityFilters({ search, setSearch, type, setType, date, setDate, resultCount }) {
	const clearFilters = () => {
		setSearch('');
		setType('all');
		setDate('');
	};

	const hasFilters = search || type !== 'all' || date;

	return (
		<div className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card sm:p-6'>
			<div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
				<div className='flex items-center gap-2'>
					<SlidersHorizontal
						size={18}
						className='text-brass-300'
						aria-hidden='true'
					/>

					<h2 className='font-display text-sm font-bold text-stone-100'>Filter Activities</h2>

					{typeof resultCount === 'number' && (
						<span
							aria-live='polite'
							className='rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-stone-400'>
							{resultCount} {resultCount === 1 ? 'result' : 'results'}
						</span>
					)}
				</div>

				{hasFilters && (
					<button
						type='button'
						onClick={clearFilters}
						className='flex items-center gap-1.5 rounded-full text-xs font-medium text-stone-400 transition hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400'>
						<X
							size={14}
							aria-hidden='true'
						/>
						Clear filters
					</button>
				)}
			</div>

			<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
				{/* Search — full name or email only, never User ID */}
				<div>
					<label
						htmlFor='activity-search'
						className='mb-2 block text-xs font-semibold text-stone-400'>
						Search User
					</label>

					<div className='relative'>
						<Search
							size={17}
							className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500'
							aria-hidden='true'
						/>

						<input
							id='activity-search'
							type='search'
							autoComplete='off'
							inputMode='search'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder='Search by full name or email...'
							className={`${fieldClass} pl-10 pr-10`}
						/>

						{search && (
							<button
								type='button'
								onClick={() => setSearch('')}
								aria-label='Clear search'
								className='absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/10 hover:text-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
								<X
									size={14}
									aria-hidden='true'
								/>
							</button>
						)}
					</div>

					<p className='mt-2 text-[11px] leading-relaxed text-stone-600'>Matches full name or email only.</p>
				</div>

				{/* Type */}
				<div>
					<label
						htmlFor='activity-type'
						className='mb-2 block text-xs font-semibold text-stone-400'>
						Activity Type
					</label>

					<select
						id='activity-type'
						value={type}
						onChange={(e) => setType(e.target.value)}
						className={`${fieldClass} px-3`}>
						{activityTypes.map((item) => (
							<option
								key={item.value}
								value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>

				{/* Date */}
				<div>
					<label
						htmlFor='activity-date'
						className='mb-2 block text-xs font-semibold text-stone-400'>
						Activity Date
					</label>

					<div className='relative'>
						<CalendarDays
							size={17}
							className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500'
							aria-hidden='true'
						/>

						<input
							id='activity-date'
							type='date'
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className={`${fieldClass} pl-10 pr-3`}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
