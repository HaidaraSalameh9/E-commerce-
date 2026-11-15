/* -------------------------------------------------------------------------- */
/*  Pure selection helpers for the homepage product sections.                 */
/*  They read only fields that already exist on the products and never        */
/*  invent, convert or fill in data.                                          */
/* -------------------------------------------------------------------------- */

const MIN_VALID_TIME = Date.UTC(2000, 0, 1);
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // allow a few minutes of clock skew

// Same provenance-based key idea as the Products page (`${source || 'dummyjson'}-${id}`),
// but taken from which list the product came from, so ids can never collide.
export const getProductKey = (product, origin) => `${origin}:${product?.id}`;

/**
 * createdAt is an ISO date string. Returns a timestamp in ms, or null when the value
 * is missing, not a string, unparseable, before 2000, or in the future.
 */
export const parseCreatedAt = (value, now = Date.now()) => {
	if (typeof value !== 'string' || !value.trim()) return null;

	const time = Date.parse(value);
	if (!Number.isFinite(time) || time < MIN_VALID_TIME || time > now + FUTURE_TOLERANCE_MS) return null;

	return time;
};

/**
 * Availability follows the storefront's rules: a product is only hidden when its data
 * explicitly says so — `isAvailable === false`, or a status other than "active".
 * Missing fields never hide a product, and stock is NOT used (the storefront lists
 * sold-out products and marks them "Out of stock").
 */
export const isListable = (product) => {
	if (!product || product.id == null) return false;
	if (product.isAvailable === false) return false;
	if (product.status != null && product.status !== 'active') return false;
	return true;
};

/**
 * New Arrivals: Firebase (custom) products only, newest first, any age.
 * Returns up to `limit` entries shaped { product, createdAt }.
 */
export const selectNewArrivals = (customProducts, { limit = 6, now = Date.now() } = {}) => {
	if (!Array.isArray(customProducts)) return [];

	const seen = new Set();

	return customProducts
		.map((product) => ({ product, createdAt: parseCreatedAt(product?.createdAt, now) }))
		.filter(({ product, createdAt }) => createdAt !== null && isListable(product))
		.sort((a, b) => b.createdAt - a.createdAt || String(a.product.id).localeCompare(String(b.product.id)))
		.filter(({ product }) => {
			const key = getProductKey(product, 'custom');
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.slice(0, limit);
};
