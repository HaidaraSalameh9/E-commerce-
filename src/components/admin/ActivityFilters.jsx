import { Search, SlidersHorizontal, X, CalendarDays } from 'lucide-react';

/**
 * ActivityFilters — same props as before, same activity types.
 * Only the skin changed: dark inputs on the charcoal card, gold focus
 * rings. The date picker's native indicator is inverted so it stays
 * visible on the dark field.
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

export default function ActivityFilters({ search, setSearch, type, setType, date, setDate }) {
	const clearFilters = () => {
		setSearch('');
		setType('all');
		setDate('');
	};

	const hasFilters = search || type !== 'all' || date;

	return (
		<div className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card sm:p-6'>
			<div className='mb-5 flex items-center justify-between'>
				<div className='flex items-center gap-2'>
					<SlidersHorizontal
						size={18}
						className='text-brass-300'
						aria-hidden='true'
					/>

					<h2 className='font-display text-sm font-bold text-stone-100'>Filter Activities</h2>
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
				{/* Search */}
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
							type='text'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder='Search by name, email or User ID...'
							className={`${fieldClass} pl-10 pr-3`}
						/>
					</div>
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
