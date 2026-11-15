import { Activity, Users, ShoppingBag, ShoppingCart, TrendingUp, Clock, CheckCircle2, Package, DollarSign } from 'lucide-react';

/**
 * ActivityStats — same props as before ({ stats }), same four original
 * cards, plus four more derived from the SAME activity data (no new
 * source, no invented numbers). Only the skin changed: dark charcoal
 * cards, gold icon tiles, warm-white type.
 *
 * New cards and where their numbers come from (AdminActivity.jsx):
 *   pending   – order_created minus completed (from status updates)
 *   completed – order_status_updated with newStatus completed/delivered/fulfilled
 *   products  – unique metadata.title values seen in the log window
 *   revenue   – stats.revenue is null unless order totals exist in the
 *               activity metadata. A null value renders as "—" with an
 *               explanation, never as a made-up total.
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
		description: 'Order totals are not in the activity log yet',
		tone: 'gold',
		unavailableText: 'Revenue appears here once order totals are included in activity metadata.',
	},
];

const toneClass = {
	gold: 'bg-gradient-to-br from-brass-300 to-brass-500 text-ink shadow-lg shadow-brass-500/20',
	amber: 'bg-amber-400/15 text-amber-300',
	green: 'bg-emerald-400/15 text-emerald-300',
};

export default function ActivityStats({ stats }) {
	return (
		<div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
			{statConfig.map((item, index) => {
				const Icon = item.icon;
				const value = stats?.[item.key];
				const unavailable = value == null;

				return (
					<div
						key={item.key}
						className='group animate-rise rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] p-5 shadow-card transition duration-300 ease-soft hover:-translate-y-1 hover:border-white/20 hover:shadow-card-hover'
						style={{ animationDelay: `${index * 70}ms` }}>
						<div className='flex items-start justify-between gap-3'>
							<div className='min-w-0'>
								<p className='text-sm font-medium text-stone-400'>{item.title}</p>

								<h3 className={`mt-3 font-display text-3xl font-bold tracking-tight ${unavailable ? 'text-stone-600' : 'text-stone-50'}`}>
									{unavailable ? '—' : Number(value).toLocaleString()}
								</h3>
							</div>

							<span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClass[item.tone]}`}>
								<Icon
									size={22}
									aria-hidden='true'
								/>
							</span>
						</div>

						<div className='mt-5 flex items-start gap-2 border-t border-white/5 pt-4'>
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
