import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import { X, RefreshCw } from 'lucide-react';

import ActivityTimeline from './ActivityTimeline';
import { getUserActivities } from '../../services/adminActivityService';

/* ------------------------------------------------------------------
 * User profile helpers (duplicated in the other Activity files —
 * each file is self-contained, no shared helper module).
 *
 * Placeholder values the backend writes when its Clerk lookup fails
 * ("Unknown Customer", "Unnamed User", "No email") and any value
 * that IS the user ID are treated as missing — User IDs are never
 * displayed.
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

function getUserDisplayName(user, userId) {
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

function getUserDisplayEmail(user, userId) {
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

function getUserDisplayImage(user) {
	if (!user || typeof user !== 'object') return null;
	return cleanProfileValue(user.imageUrl) || cleanProfileValue(user.profileImageUrl) || cleanProfileValue(user.image) || cleanProfileValue(user.avatarUrl) || null;
}

/**
 * UserActivityModal — same props as before ({ user, onClose }).
 *
 * The header now resolves the customer's display name/email through
 * the helpers above. Previously, when the email was missing, the header
 * printed the raw userId under the name. User IDs are still used
 * internally (the API call below needs one) but are never displayed.
 *
 * Note: ActivityUsers passes an already-normalized user object
 * ({ name, email, imageUrl, userId, … }). The helpers also accept a
 * raw Clerk-shaped object, so this modal works either way.
 */
export default function UserActivityModal({ user, onClose }) {
	const { getToken } = useAuth();

	const [activities, setActivities] = useState([]);
	const [cursor, setCursor] = useState(null);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState('');

	const displayName = getUserDisplayName(user, user.userId);
	const displayEmail = getUserDisplayEmail(user, user.userId);
	const displayImage = getUserDisplayImage(user);

	const loadActivities = useCallback(
		async (nextCursor = null) => {
			try {
				if (nextCursor) {
					setLoadingMore(true);
				} else {
					setLoading(true);
				}

				setError('');

				const data = await getUserActivities(getToken, user.userId, { limit: 20, cursor: nextCursor });

				setActivities((previous) => (nextCursor ? [...previous, ...(data.activities || [])] : data.activities || []));

				setCursor(data.nextCursor || null);
				setHasMore(Boolean(data.nextCursor));
			} catch (err) {
				setError(err.message || 'Could not load user activities.');
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[getToken, user.userId],
	);

	useEffect(() => {
		loadActivities();
	}, [loadActivities]);

	// Escape closes; body scroll locks while the modal is open.
	useEffect(() => {
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
	}, [onClose]);

	return (
		<div
			className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}>
			<div
				role='dialog'
				aria-modal='true'
				aria-labelledby='user-activity-title'
				className='flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111110] text-stone-100 shadow-2xl'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-white/10 bg-[#161613] p-5'>
					<div className='flex min-w-0 items-center gap-3'>
						{displayImage ? (
							<img
								src={displayImage}
								alt={displayName || UNKNOWN_CUSTOMER_LABEL}
								className='h-11 w-11 shrink-0 rounded-xl object-cover'
							/>
						) : (
							<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brass-300 to-brass-500 text-sm font-bold text-ink'>
								{(displayName || '?').slice(0, 1).toUpperCase()}
							</div>
						)}

						<div className='min-w-0'>
							<h2
								id='user-activity-title'
								className='truncate font-display font-bold text-stone-50'>
								{displayName || 'Customer Activity'}
							</h2>
							<p className='mt-0.5 truncate text-xs text-stone-500'>{displayEmail || NO_EMAIL_LABEL}</p>
						</div>
					</div>

					<button
						type='button'
						onClick={onClose}
						aria-label='Close'
						className='rounded-lg p-2 text-stone-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-400'>
						<X
							size={20}
							aria-hidden='true'
						/>
					</button>
				</div>

				{/* Content */}
				<div className='flex-1 space-y-4 overflow-y-auto p-5'>
					<div className='grid grid-cols-2 gap-3'>
						<div className='rounded-xl border border-white/10 bg-white/[0.03] p-4'>
							<p className='text-xs text-stone-500'>Loaded Activities</p>
							<p className='mt-2 font-display text-2xl font-bold tabular-nums text-stone-50'>{activities.length}</p>
						</div>

						<div className='rounded-xl border border-white/10 bg-white/[0.03] p-4'>
							<p className='text-xs text-stone-500'>Total Recorded in This View</p>
							<p className='mt-2 font-display text-2xl font-bold tabular-nums text-stone-50'>
								{activities.length}
								{hasMore ? '+' : ''}
							</p>
						</div>
					</div>

					{error && (
						<div
							role='alert'
							className='rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-300'>
							{error}
							<button
								type='button'
								onClick={() => loadActivities()}
								className='ml-2 font-semibold underline'>
								Retry
							</button>
						</div>
					)}

					{loading ? (
						<div className='rounded-xl border border-white/10 bg-white/[0.03] p-12 text-center'>
							<RefreshCw
								className='mx-auto animate-spin text-brass-300'
								size={25}
								aria-hidden='true'
							/>
							<p className='mt-3 text-sm text-stone-500'>Loading customer activity...</p>
						</div>
					) : (
						<ActivityTimeline activities={activities} />
					)}

					{hasMore && !loading && (
						<button
							type='button'
							onClick={() => loadActivities(cursor)}
							disabled={loadingMore}
							className='w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-stone-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50'>
							{loadingMore ? 'Loading...' : 'Load More Activities'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
