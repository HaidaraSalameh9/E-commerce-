import { ShoppingBag, ShoppingCart, Trash2, Package, RefreshCw, Clock, User, Activity, SearchX } from 'lucide-react';

/* ------------------------------------------------------------------
 * User profile helpers (duplicated in the other Activity files —
 * each file is self-contained, no shared helper module).
 *
 * The backend stores the customer snapshot on each activity under
 * `customer` ({ name, email, imageUrl }); `user` is checked first in
 * case a future response maps it. Placeholder values the backend
 * writes when its Clerk lookup fails ("Unknown Customer",
 * "Unnamed User", "No email") and any value that IS the user ID are
 * treated as missing — User IDs are never displayed or searched.
 * ------------------------------------------------------------------ */
const UNKNOWN_CUSTOMER_LABEL = 'Unknown customer';
const PLACEHOLDER_EMAILS = new Set(['no email', 'no-email', 'unknown', 'n/a', 'na', '—', '-']);
const PLACEHOLDER_NAMES = new Set(['unknown customer', 'unnamed user', 'unknown user', 'customer', 'unknown', 'n/a', '—', '-']);

function cleanProfileValue(value) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function isIdLikeValue(value, userId) {
	const v = cleanProfileValue(value);
	if (!v) return true;
	if (userId && v === userId) return true;
	return /^user_[A-Za-z0-9]+$/.test(v);
}

function getDisplayName(user, userId) {
	if (!user || typeof user !== 'object') return null;
	const joinedName = [cleanProfileValue(user.firstName), cleanProfileValue(user.lastName)].filter(Boolean).join(' ') || null;
	for (const candidate of [user.name, user.fullName, joinedName, user.username]) {
		const value = cleanProfileValue(candidate);
		if (!value) continue;
		if (PLACEHOLDER_NAMES.has(value.toLowerCase())) continue;
		if (isIdLikeValue(value, userId)) continue;
		return value;
	}
	return null;
}

function getDisplayEmail(user, userId) {
	if (!user || typeof user !== 'object') return null;
	const candidates = [
		user.email,
		user.emailAddress,
		user.primaryEmailAddress?.emailAddress,
		user.primaryEmail?.emailAddress,
		Array.isArray(user.emailAddresses) ? user.emailAddresses[0]?.emailAddress : null,
	];
	for (const candidate of candidates) {
		const value = cleanProfileValue(candidate);
		if (!value) continue;
		if (PLACEHOLDER_EMAILS.has(value.toLowerCase())) continue;
		if (isIdLikeValue(value, userId)) continue;
		return value;
	}
	return null;
}

function getDisplayImage(user) {
	if (!user || typeof user !== 'object') return null;
	return cleanProfileValue(user.imageUrl) || cleanProfileValue(user.profileImageUrl) || cleanProfileValue(user.image) || cleanProfileValue(user.avatarUrl) || null;
}

function normalizeActivityUser(user, userId) {
	return {
		name: getDisplayName(user, userId),
		email: getDisplayEmail(user, userId),
		imageUrl: getDisplayImage(user),
	};
}

function getActivityCustomer(activity) {
	if (!activity || typeof activity !== 'object') return null;
	return activity.user || activity.customer || null;
}

function getActivityActor(activity) {
	if (!activity || typeof activity !== 'object') return null;
	if (activity.actor) return activity.actor;
	if (activity.actorUserId && activity.actorUserId === activity.userId) return getActivityCustomer(activity);
	return null;
}

// Product titles across every metadata shape the backend writes:
// cart events use metadata.productTitle, orders use
// metadata.products[].title (metadata.title kept for safety).
function getActivityProductTitles(activity) {
	const metadata = activity?.metadata;
	if (!metadata || typeof metadata !== 'object') return [];
	const titles = [metadata.title, metadata.productTitle];
	if (Array.isArray(metadata.products)) {
		for (const product of metadata.products) titles.push(product?.title);
	}
	return [...new Set(titles.map(cleanProfileValue).filter(Boolean))];
}

/**
 * ActivityTimeline — same props as before ({ activities }), plus one
 * optional prop:
 *   search – the active user-search text. When provided and the list
 *            is empty, the empty state explains that nothing matched
 *            the search instead of claiming there is no activity.
 *
 * User display rules (helpers above):
 *  - Shows the customer's real full name and personal email.
 *  - NEVER shows a User ID. Missing profile data renders as
 *    "Unknown customer" with no email, never as an ID.
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

export default function ActivityTimeline({ activities = [], search = '' }) {
	const searchTerm = typeof search === 'string' ? search.trim() : '';

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
							{searchTerm ? (
								<SearchX
									size={26}
									aria-hidden='true'
								/>
							) : (
								<Clock
									size={26}
									aria-hidden='true'
								/>
							)}
						</div>

						<h3 className='mt-4 font-display font-semibold text-stone-100'>
							{searchTerm ? 'No results found' : 'No activities yet'}
						</h3>

						<p className='mt-2 max-w-xs text-sm leading-relaxed text-stone-500'>
							{searchTerm
								? `Nothing matches “${searchTerm}”. Try a customer's full name or email, or clear the filters.`
								: 'New customer and order activities will appear here.'}
						</p>
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

								// Resolve display-safe profile data. The backend stores
								// the snapshot under `customer` (see helpers above).
								// IDs are never used as a name/email fallback.
								const customer = normalizeActivityUser(getActivityCustomer(activity), activity.userId);
								const actor = normalizeActivityUser(getActivityActor(activity), activity.actorUserId);
								const productTitles = getActivityProductTitles(activity);

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

													{productTitles.length > 0 && (
														<span
															className='rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-stone-300'
															title={productTitles.join(', ')}>
															{productTitles[0]}
															{productTitles.length > 1 ? ` +${productTitles.length - 1} more` : ''}
														</span>
													)}

													{activity.metadata.newStatus && (
														<span className='rounded-lg border border-brass-400/30 bg-brass-400/10 px-3 py-1.5 text-xs font-medium text-brass-300'>
															{activity.metadata.previousStatus}
															{' → '}
															{activity.metadata.newStatus}
														</span>
													)}
												</div>
											)}

											{/* User information — full name + personal email only */}
											<div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500'>
												<div className='flex min-w-0 flex-wrap items-center gap-1.5'>
													<User
														size={13}
														className='shrink-0 text-stone-500'
														aria-hidden='true'
													/>
													<span className='font-medium text-stone-300'>{customer.name || UNKNOWN_CUSTOMER_LABEL}</span>
													{customer.email && <span className='break-all text-stone-500'>({customer.email})</span>}
												</div>

												{isAdminAction && (
													<div className='flex flex-wrap items-center gap-1.5 rounded-md bg-brass-400/10 px-2 py-0.5 text-[11px] font-medium text-brass-300'>
														<span>Action by:</span>
														<span className='font-semibold'>{actor.name || 'Admin'}</span>
														{actor.email && <span className='break-all text-brass-400'>({actor.email})</span>}
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
