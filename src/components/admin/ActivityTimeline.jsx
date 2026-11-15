import { ShoppingBag, ShoppingCart, Trash2, Package, RefreshCw, Clock, User, Activity } from 'lucide-react';

/**
 * ActivityTimeline — same props as before ({ activities }), same
 * event config and metadata rendering. Only the skin changed: dark
 * card, warm-white type, gold accents, emerald / rose status tiles
 * kept but darkened so they read on charcoal.
 */
const activityStyles = {
	order_created: {
		icon: ShoppingBag,
		color: 'bg-emerald-400/10 text-emerald-300',
		label: 'Order Created',
		category: 'ORDER',
	},

	order_status_updated: {
		icon: RefreshCw,
		color: 'bg-brass-400/15 text-brass-300',
		label: 'Order Status Updated',
		category: 'ORDER',
	},

	cart_added: {
		icon: ShoppingCart,
		color: 'bg-emerald-400/10 text-emerald-300',
		label: 'Product Added',
		category: 'CART',
	},

	cart_removed: {
		icon: Trash2,
		color: 'bg-rose-400/10 text-rose-300',
		label: 'Product Removed',
		category: 'CART',
	},

	cart_quantity_updated: {
		icon: Package,
		color: 'bg-brass-400/15 text-brass-300',
		label: 'Quantity Updated',
		category: 'CART',
	},
};

function formatActivityDate(date) {
	if (!date) return 'Unknown date';

	const parsedDate = new Date(date);

	if (Number.isNaN(parsedDate.getTime())) {
		return 'Unknown date';
	}

	return new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(parsedDate);
}

export default function ActivityTimeline({ activities = [] }) {
	return (
		<section className='rounded-card border border-white/10 bg-gradient-to-b from-[#1b1b17] to-[#161613] shadow-card'>
			{/* Header */}
			<div className='flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-5'>
				<div>
					<h2 className='font-display text-lg font-bold text-stone-100'>Recent Activity</h2>

					<p className='mt-1 text-xs text-stone-500'>Latest events happening across your store</p>
				</div>

				<div className='flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2'>
					<span
						aria-hidden='true'
						className='h-2 w-2 rounded-full bg-emerald-400'
					/>
					<span className='text-xs font-medium text-stone-300'>{activities.length} Events</span>
				</div>
			</div>

			{/* Timeline */}
			<div className='p-4 sm:p-6'>
				{activities.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-14 text-center'>
						<div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-stone-500'>
							<Clock
								size={26}
								aria-hidden='true'
							/>
						</div>

						<h3 className='mt-4 font-display font-semibold text-stone-100'>No activities yet</h3>

						<p className='mt-2 max-w-xs text-sm text-stone-500'>New customer and order activities will appear here.</p>
					</div>
				) : (
					<div className='relative'>
						{/* Vertical Line */}
						<div
							aria-hidden='true'
							className='absolute bottom-6 left-[19px] top-6 w-px bg-white/5'
						/>

						<div className='space-y-7'>
							{activities.map((activity) => {
								const config = activityStyles[activity.type] || {
									icon: Activity,
									color: 'bg-white/5 text-stone-300',
									label: 'Activity',
									category: 'EVENT',
								};

								const Icon = config.icon;

								const isAdminAction = activity.actorUserId && activity.actorUserId !== activity.userId;

								return (
									<div
										key={activity.id}
										className='relative flex gap-4'>
										{/* Icon */}
										<div className='relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-4 border-[#1b1b17] bg-white/5'>
											<div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.color}`}>
												<Icon
													size={17}
													aria-hidden='true'
												/>
											</div>
										</div>

										{/* Content */}
										<div className='min-w-0 flex-1 pb-1'>
											<div className='flex flex-wrap items-center justify-between gap-2'>
												<div className='flex flex-wrap items-center gap-2'>
													<h3 className='text-sm font-semibold text-stone-100'>{config.label}</h3>

													<span className='rounded-md bg-white/5 px-2 py-1 text-[9px] font-bold tracking-wider text-stone-500'>{config.category}</span>
												</div>

												<span className='text-[11px] text-stone-500'>{formatActivityDate(activity.createdAt)}</span>
											</div>

											<p className='mt-2 text-sm leading-relaxed text-stone-400'>{activity.description || 'An activity was recorded.'}</p>

											{/* Metadata */}
											{activity.metadata && (
												<div className='mt-3 flex flex-wrap gap-2'>
													{activity.metadata.orderNumber && (
														<span className='rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-stone-300'>
															Order: <strong>{activity.metadata.orderNumber}</strong>
														</span>
													)}

													{activity.metadata.title && <span className='rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-stone-300'>{activity.metadata.title}</span>}

													{activity.metadata.newStatus && (
														<span className='rounded-lg border border-brass-400/30 bg-brass-400/10 px-3 py-1.5 text-xs font-medium text-brass-300'>
															{activity.metadata.previousStatus}
															{' → '}
															{activity.metadata.newStatus}
														</span>
													)}
												</div>
											)}

											{/* User information */}
											<div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500'>
												<div className='flex items-center gap-1.5'>
													<User
														size={13}
														className='text-stone-500'
														aria-hidden='true'
													/>
													<span className='font-medium text-stone-300'>{activity.user?.name || 'Customer'}</span>
													{activity.user?.email && activity.user.email !== 'No email' && <span className='text-stone-500'>({activity.user.email})</span>}
													{!activity.user?.name && activity.userId && <span className='font-mono text-[11px] text-stone-500'>{activity.userId}</span>}
												</div>

												{isAdminAction && (
													<div className='flex items-center gap-1.5 rounded-md bg-brass-400/10 px-2 py-0.5 text-[11px] font-medium text-brass-300'>
														<span>Action by:</span>
														<span className='font-semibold'>{activity.actor?.name || 'Admin'}</span>
														{activity.actor?.email && activity.actor.email !== 'No email' && <span className='text-brass-400'>({activity.actor.email})</span>}
													</div>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
