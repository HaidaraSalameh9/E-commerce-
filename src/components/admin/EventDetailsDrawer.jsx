import { useEffect, useState } from 'react';
import { X, Activity, UserRound, ShoppingBag, Clock, ShieldCheck, Database } from 'lucide-react';

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
const NO_EMAIL_LABEL = 'No email on file';
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

function formatDate(timestamp) {
	if (!timestamp) return '—';

	const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

	if (Number.isNaN(date.getTime())) return '—';

	return date.toLocaleString('en-US', {
		dateStyle: 'full',
		timeStyle: 'medium',
	});
}

function formatPrice(value) {
	if (value == null || value === '') return null;
	if (typeof value === 'number') return `$${value.toFixed(2)}`;
	return String(value);
}

/**
 * The raw metadata dump is a debugging aid, but user identifiers must
 * never be displayed anywhere in this UI — including here. Strip any
 * user-id-shaped keys before rendering (the stored data is untouched).
 */
function redactUserIds(metadata) {
	if (!metadata || typeof metadata !== 'object') return metadata;
	const copy = { ...metadata };
	for (const key of Object.keys(copy)) {
		if (/^(user|actor|actoruser|customer)id$/i.test(key.replace(/[_-]/g, ''))) {
			delete copy[key];
		}
	}
	return copy;
}

function DetailItem({ label, value }) {
	// A real 0 (e.g. Items Count: 0) is a value, not "missing" — the old
	// `{value || '—'}` hid it. Only null / undefined / empty string
	// render as a dash.
	const shown = value === null || value === undefined || value === '' ? '—' : value;
	return (
		<div className='space-y-1'>
			<p className='text-xs font-medium text-stone-500'>{label}</p>

			<p className='break-all text-sm font-medium text-stone-200'>{shown}</p>
		</div>
	);
}

export default function EventDetailsDrawer({ activity, onClose }) {
	// Entry animation without a plugin: the drawer mounts off-canvas
	// (translate-x-full) and slides in on the next frame. The old
	// `animate-in slide-in-from-right` classes need the tailwindcss-animate
	// plugin and silently did nothing without it.
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const frame = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	// Escape closes; body scroll locks while the drawer is open.
	// Guarded by `activity`: the drawer returns null when closed, and
	// an open drawer must never lock scrolling behind an empty screen.
	useEffect(() => {
		if (!activity) return undefined;
		const onKey = (e) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = previousOverflow;
		};
	}, [onClose, activity]);

	if (!activity) return null;

	const metadata = activity.metadata || {};

	// Display-safe profile data — full name + personal email only.
	// User IDs are never rendered in this drawer.
	const customer = normalizeActivityUser(getActivityCustomer(activity), activity.userId);
	const actor = normalizeActivityUser(getActivityActor(activity), activity.actorUserId);
	const showActor = Boolean(activity.actorUserId && activity.actorUserId !== activity.userId);

	return (
		<div className='fixed inset-0 z-50 flex justify-end'>
			{/* Overlay */}
			<button
				type='button'
				aria-label='Close event details'
				onClick={onClose}
				className='absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm'
			/>

			{/* Drawer */}
			<aside
				role='dialog'
				aria-modal='true'
				aria-label='Event details'
				className={`relative z-10 flex h-full w-full max-w-[520px] flex-col border-l border-white/10 bg-[#111110] text-stone-100 shadow-2xl transition-transform duration-300 ease-soft ${
					visible ? 'translate-x-0' : 'translate-x-full'
				}`}>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-white/10 px-6 py-5'>
					<div>
						<div className='flex items-center gap-2'>
							<Activity
								size={17}
								className='text-brass-300'
								aria-hidden='true'
							/>

							<span className='text-xs font-semibold uppercase tracking-wider text-brass-300'>Event Details</span>
						</div>

						<h2 className='mt-2 font-display text-lg font-bold text-stone-50'>Activity Information</h2>
					</div>

					<button
						type='button'
						onClick={onClose}
						aria-label='Close event details'
						className='rounded-xl border border-white/10 bg-white/5 p-2 text-stone-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
						<X
							size={18}
							aria-hidden='true'
						/>
					</button>
				</div>

				{/* Content */}
				<div className='flex-1 space-y-7 overflow-y-auto p-6'>
					{/* Event Overview */}
					<section>
						<div className='mb-4 flex items-center gap-2'>
							<Activity
								size={17}
								className='text-stone-500'
								aria-hidden='true'
							/>

							<h3 className='text-sm font-semibold text-stone-100'>Event Overview</h3>
						</div>

						<div className='space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
							<DetailItem
								label='Event Type'
								value={activity.type}
							/>

							<DetailItem
								label='Description'
								value={activity.description}
							/>

							<DetailItem
								label='Event ID'
								value={activity.id}
							/>

							<DetailItem
								label='Created At'
								value={formatDate(activity.createdAt)}
							/>
						</div>
					</section>

					{/* User Information — name + email only, never User ID */}
					<section>
						<div className='mb-4 flex items-center gap-2'>
							<UserRound
								size={17}
								className='text-stone-500'
								aria-hidden='true'
							/>

							<h3 className='text-sm font-semibold text-stone-100'>User Information</h3>
						</div>

						<div className='grid grid-cols-1 gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2'>
							<DetailItem
								label='Full Name'
								value={customer.name || UNKNOWN_CUSTOMER_LABEL}
							/>

							<DetailItem
								label='Email Address'
								value={customer.email || NO_EMAIL_LABEL}
							/>

							{showActor && (
								<>
									<DetailItem
										label='Performed By'
										value={actor.name || 'Admin'}
									/>

									<DetailItem
										label='Performer Email'
										value={actor.email || NO_EMAIL_LABEL}
									/>
								</>
							)}
						</div>
					</section>

					{/* Order Information */}
					{(metadata.orderId || metadata.orderNumber) && (
						<section>
							<div className='mb-4 flex items-center gap-2'>
								<ShoppingBag
									size={17}
									className='text-stone-500'
									aria-hidden='true'
								/>

								<h3 className='text-sm font-semibold text-stone-100'>Order Information</h3>
							</div>

							<div className='grid grid-cols-1 gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2'>
								<DetailItem
									label='Order Number'
									value={metadata.orderNumber}
								/>

								<DetailItem
									label='Order ID'
									value={metadata.orderId}
								/>

								<DetailItem
									label='Total Price'
									value={formatPrice(metadata.totalPrice)}
								/>

								<DetailItem
									label='Payment Method'
									value={metadata.paymentMethod}
								/>

								<DetailItem
									label='Items Count'
									value={metadata.itemCount}
								/>
							</div>
						</section>
					)}

					{/* Status Information */}
					{(metadata.previousStatus || metadata.newStatus) && (
						<section>
							<div className='mb-4 flex items-center gap-2'>
								<ShieldCheck
									size={17}
									className='text-stone-500'
									aria-hidden='true'
								/>

								<h3 className='text-sm font-semibold text-stone-100'>Status Changes</h3>
							</div>

							<div className='grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5'>
								<DetailItem
									label='Previous Status'
									value={metadata.previousStatus}
								/>

								<DetailItem
									label='New Status'
									value={metadata.newStatus}
								/>
							</div>
						</section>
					)}

					{/* Product Information */}
					{Array.isArray(metadata.products) && metadata.products.length > 0 && (
						<section>
							<div className='mb-4 flex items-center gap-2'>
								<ShoppingBag
									size={17}
									className='text-stone-500'
									aria-hidden='true'
								/>

								<h3 className='text-sm font-semibold text-stone-100'>Products</h3>
							</div>

							<div className='overflow-hidden rounded-2xl border border-white/10'>
								{metadata.products.map((product, index) => (
									<div
										key={product.productId || index}
										className='flex items-center justify-between gap-4 border-b border-white/5 bg-white/[0.03] p-4 last:border-0'>
										<div className='min-w-0'>
											<p className='truncate text-sm font-medium text-stone-100'>{product.title || 'Unknown Product'}</p>

											<p className='mt-1 text-xs text-stone-500'>ID: {product.productId || '—'}</p>
										</div>

										<span className='shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300'>Qty: {product.quantity ?? '—'}</span>
									</div>
								))}
							</div>
						</section>
					)}

					{/* Other Metadata (user identifiers redacted) */}
					<section>
						<div className='mb-4 flex items-center gap-2'>
							<Database
								size={17}
								className='text-stone-500'
								aria-hidden='true'
							/>

							<h3 className='text-sm font-semibold text-stone-100'>Complete Metadata</h3>
						</div>

						<pre className='overflow-x-auto rounded-2xl border border-white/10 bg-black p-5 text-xs leading-6 text-emerald-300'>{JSON.stringify(redactUserIds(metadata), null, 2)}</pre>
					</section>
				</div>

				{/* Footer */}
				<div className='flex items-center justify-between border-t border-white/10 bg-[#111110] px-6 py-4'>
					<div className='flex items-center gap-2 text-xs text-stone-500'>
						<Clock
							size={14}
							aria-hidden='true'
						/>
						Activity Record
					</div>

					<button
						type='button'
						onClick={onClose}
						className='rounded-xl bg-gradient-to-r from-brass-300 to-brass-500 px-5 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-brass-500/20 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400'>
						Close Details
					</button>
				</div>
			</aside>
		</div>
	);
}
