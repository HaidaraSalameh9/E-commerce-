import { Activity, Users, ShoppingBag, ShoppingCart, TrendingUp, Clock, CheckCircle2, Package, DollarSign } from 'lucide-react';

/**
 * ActivityStats — same props as before ({ stats }), same eight cards,
 * same data sources (see AdminActivity.jsx). UI quality pass only:
 *
 *  - Equal-height cards: every card is a full-height flex column and
 *    the description footer is pinned to the bottom (mt-auto), so a
 *    two-line description can no longer make one card taller than
 *    its neighbours.
 *  - Clearer hierarchy: small uppercase label → large tabular value →
 *    quiet description, with consistent type sizes at every width.
 *  - Responsive grid: 1 column on phones, 2 on small screens,
 *    3 on laptops, 4 on wide desktops — no cramped 4-up row on a
 *    tablet, no single stretched column on a phone.
 *  - Numbers use tabular figures so digits don't jitter between cards.
 *  - revenue is the sum of metadata.totalPrice across order_created
 *    activities in the loaded window (computed in AdminActivity).
 *    It is null — rendered as "—" — only when no order totals exist
 *    in the window. Nothing invented.
 */
const statConfig = [
	{ key: 'events', title: 'Loaded Events', icon: Activity, description: 'Activities on this page', tone: 'gold' },
	{ key: 'users', title: 'Users in Results', icon: Users, description: 'Unique customers', tone: 'gold' },
	{ key: 'orders', title: 'Order Events', icon: ShoppingBag, description: 'Order-related activity', tone: 'gold' },
	{ key: 'cart', title: 'Cart Events', icon: ShoppingCart, description: 'Cart-related activity', tone: 'gold' },
	{ key: 'pending', title: 'Pending Orders', icon: Clock, description: 'Created, not yet completed', tone: 'amber' },
	{ key: 'completed', title: 'Completed Orders', icon: CheckCircle2, description: 'Delivered / completed', tone: 'green' },
	{ key: 'products', title: 'Products in Activity', icon: Package, description: 'Unique products in this log window', tone: 'gold' },
	{
		key: 'revenue',
		title: 'Total Revenue',
		icon: DollarSign,
		description: 'Order totals in this log window',
		tone: 'gold',
		unavailableText: 'No order totals in this log window yet.',
		currency: true,
	},
];

const toneClass = {
	gold: 'bg-gradient-to-br from-brass-300 to-brass-500 text-ink shadow-lg shadow-brass-500/20',
	amber: 'bg-amber-400/15 text-amber-300',
	green: 'bg-emerald-400/15 text-emerald-300',
};

export default function ActivityStats({ stats }) {
	return (
		<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4'>
			{statConfig.map((item, index) => {
				const Icon = item.icon;
				const value = stats?.[item.key];
				const unavailable = value == null;

				return (
					<div
						key={item.key}
						className='group flex h-full animate-rise flex-col rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card transition duration-300 ease-soft hover:-translate-y-1 hover:border-white/20 hover:shadow-card-hover sm:p-6'
						style={{ animationDelay: `${index * 70}ms` }}>
						<div className='flex items-start justify-between gap-3'>
							<div className='min-w-0'>
								<p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500'>{item.title}</p>

								<h3
									className={`mt-3 font-display text-[28px] font-bold leading-none tracking-tight tabular-nums sm:text-3xl ${unavailable ? 'text-stone-600' : 'text-stone-50'}`}
									title={unavailable ? item.unavailableText || item.description : undefined}>
									{unavailable
										? '—'
										: item.currency
											? `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
											: Number(value).toLocaleString()}
								</h3>
							</div>

							<span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${toneClass[item.tone]}`}>
								<Icon
									size={21}
									aria-hidden='true'
								/>
							</span>
						</div>

						<div className='mt-auto flex items-start gap-2 border-t border-white/5 pt-4'>
							<TrendingUp
								size={15}
								className={`mt-0.5 shrink-0 ${unavailable ? 'text-stone-600' : 'text-emerald-400'}`}
								aria-hidden='true'
							/>

							<p className='text-xs leading-relaxed text-stone-500'>{unavailable ? item.unavailableText || item.description : item.description}</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}
