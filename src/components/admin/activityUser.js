/**
 * activityUser.js — single source of truth for turning an activity's
 * raw `user` / `actor` object into display-safe name, email and avatar.
 *
 * Why this file exists:
 * The Activity pages used to read `activity.user.name` /
 * `activity.user.email` inline in five different places, each with its
 * own fallback — and several of those fallbacks printed the raw
 * `userId` (a Clerk ID like "user_2abc…") whenever the profile was
 * missing or incomplete. That is the bug behind "the UI shows IDs
 * instead of people".
 *
 * The backend enriches each activity with a `user` object, but the
 * exact shape depends on the Clerk lookup on the server. Clerk user
 * objects expose the full name as `fullName` (or `firstName` +
 * `lastName`) and the personal email under
 * `primaryEmailAddress.emailAddress` / `emailAddresses[0].emailAddress`,
 * while the API may also flatten them to `name` / `email`. This helper
 * accepts all of those shapes, rejects placeholder values the API is
 * known to send ("No email"), and — critically — refuses to treat a
 * value that *is* the user ID as a name or email.
 *
 * Rules enforced here:
 *  - User IDs are NEVER returned as a display name or email.
 *  - Missing/invalid profile data returns null, and callers render a
 *    neutral fallback ("Unknown customer" / "No email on file").
 *  - Search matches ONLY the resolved full name and email.
 */

const PLACEHOLDER_EMAILS = new Set(['no email', 'no-email', 'unknown', 'n/a', 'na', '—', '-']);

function clean(value) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

/**
 * True when a value is (or looks like) a user ID rather than a
 * human-readable name/email. Clerk IDs are `user_` + alphanumeric.
 */
export function isIdLike(value, userId) {
	const v = clean(value);
	if (!v) return true;
	if (userId && v === userId) return true;
	if (/^user_[A-Za-z0-9]+$/.test(v)) return true;
	return false;
}

export function getUserDisplayName(user, userId) {
	if (!user || typeof user !== 'object') return null;

	const joinedName = [clean(user.firstName), clean(user.lastName)].filter(Boolean).join(' ') || null;

	const candidates = [user.name, user.fullName, joinedName, user.username];

	for (const candidate of candidates) {
		const value = clean(candidate);
		if (value && !isIdLike(value, userId)) return value;
	}

	return null;
}

export function getUserDisplayEmail(user, userId) {
	if (!user || typeof user !== 'object') return null;

	const candidates = [
		user.email,
		user.emailAddress,
		user.primaryEmailAddress?.emailAddress,
		user.primaryEmail?.emailAddress,
		Array.isArray(user.emailAddresses) ? user.emailAddresses[0]?.emailAddress : null,
	];

	for (const candidate of candidates) {
		const value = clean(candidate);
		if (!value) continue;
		if (PLACEHOLDER_EMAILS.has(value.toLowerCase())) continue;
		if (isIdLike(value, userId)) continue;
		return value;
	}

	return null;
}

export function getUserDisplayImage(user) {
	if (!user || typeof user !== 'object') return null;
	return clean(user.imageUrl) || clean(user.profileImageUrl) || clean(user.image) || clean(user.avatarUrl) || null;
}

/**
 * Normalize any raw user/actor object into display-safe fields.
 * Always returns an object; fields are null when unavailable.
 */
export function normalizeActivityUser(user, userId) {
	return {
		name: getUserDisplayName(user, userId),
		email: getUserDisplayEmail(user, userId),
		imageUrl: getUserDisplayImage(user),
	};
}

/**
 * User search: matches ONLY the resolved full name or email.
 * User IDs are intentionally never searchable.
 * An empty/whitespace query matches everything.
 */
export function matchesUserSearch(user, userId, query) {
	const q = clean(query)?.toLowerCase();
	if (!q) return true;

	const { name, email } = normalizeActivityUser(user, userId);

	return Boolean((name && name.toLowerCase().includes(q)) || (email && email.toLowerCase().includes(q)));
}

/** Fallback labels used across the Activity UI (never a user ID). */
export const UNKNOWN_CUSTOMER_LABEL = 'Unknown customer';
export const NO_EMAIL_LABEL = 'No email on file';
