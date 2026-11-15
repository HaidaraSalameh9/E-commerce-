/**
 * Recommendation ranking for the product details page.
 *
 * Inspected fields:
 * DummyJSON products include id, title, category, brand, tags[], price,
 * discountPercentage, rating, stock, reviews[], images[], shippingInformation,
 * and availabilityStatus. They have no status or isAvailable flag.
 * Firebase custom products include id, title, category, price,
 * discountPercentage, rating, stock, images[], shippingInformation,
 * source: "firebase", status, and isAvailable. They have no tags, brand,
 * or reviews. getCustomProducts already returns active products; archived,
 * out_of_stock, unavailable, and zero-stock custom products are still
 * filtered here.
 */

export const RECOMMENDATION_LIMIT = 6;

const TAG_WEIGHT = 2;
const CATEGORY_WEIGHT = 10;
const BRAND_WEIGHT = 4;
const PRICE_WEIGHT = 2;

export function getProductSource(product) {
	if (product?.source === 'firebase' || product?.status != null || typeof product?.isAvailable === 'boolean') {
		return 'firebase';
	}

	return 'dummyjson';
}

export function getProductKey(product) {
	return `${getProductSource(product)}:${String(product?.id)}`;
}

export function normalizeCategory(value) {
	if (typeof value !== 'string') return '';
	return value
		.trim()
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function normalizeLabel(value) {
	if (typeof value !== 'string') return '';
	return value.trim().toLowerCase();
}

export function getProductTags(product) {
	if (!Array.isArray(product?.tags)) return [];

	const tags = product.tags.map((tag) => normalizeLabel(typeof tag === 'string' ? tag : '')).filter(Boolean);

	return [...new Set(tags)];
}

export function getProductCategory(product) {
	return normalizeCategory(product?.category);
}

export function getProductBrand(product) {
	const brand = normalizeLabel(product?.brand);
	return brand || '';
}

export function getProductPrice(product) {
	const price = Number(product?.price);
	return Number.isFinite(price) ? price : null;
}

export function getProductRating(product) {
	const rating = Number(product?.rating);
	if (!Number.isFinite(rating)) return 0;
	return Math.min(Math.max(rating, 0), 5);
}

export function isRecommendableProduct(product) {
	if (product?.id === undefined || product?.id === null || product?.id === '') return false;
	if (!Array.isArray(product.images) || !product.images[0]) return false;

	const isCustom = getProductSource(product) === 'firebase' || product.status != null || typeof product.isAvailable === 'boolean' || product.unavailable != null;

	if (!isCustom) return true;

	if (product.status === 'archived' || product.status === 'out_of_stock') return false;
	if (product.unavailable === true || product.isAvailable === false) return false;

	const stock = Number(product.stock);
	if (Number.isFinite(stock) && stock <= 0) return false;

	return true;
}

export function dedupeProducts(products) {
	const seen = new Set();
	const unique = [];

	for (const product of Array.isArray(products) ? products : []) {
		if (!product) continue;

		const key = getProductKey(product);
		if (seen.has(key)) continue;

		seen.add(key);
		unique.push(product);
	}

	return unique;
}

function sharedTagCount(currentProduct, candidate) {
	const currentTags = new Set(getProductTags(currentProduct));
	if (currentTags.size === 0) return 0;

	return getProductTags(candidate).filter((tag) => currentTags.has(tag)).length;
}

function priceCloseness(currentPrice, candidatePrice) {
	if (currentPrice == null || candidatePrice == null || currentPrice <= 0) return 0;

	const ratio = Math.abs(candidatePrice - currentPrice) / currentPrice;

	if (ratio <= 0.1) return 1;
	if (ratio <= 0.25) return 0.66;
	if (ratio <= 0.5) return 0.33;
	return 0;
}

function priceDistance(currentPrice, candidatePrice) {
	if (currentPrice == null || candidatePrice == null) return Number.POSITIVE_INFINITY;
	return Math.abs(candidatePrice - currentPrice);
}

function eligibleCatalog(currentProduct, catalog, extraExcluded = []) {
	const excluded = new Set([...(currentProduct ? [getProductKey(currentProduct)] : []), ...extraExcluded.map((product) => getProductKey(product))]);

	return dedupeProducts(catalog).filter((product) => isRecommendableProduct(product) && !excluded.has(getProductKey(product)));
}

export function getSimilarProducts(currentProduct, catalog, limit = RECOMMENDATION_LIMIT) {
	if (!currentProduct) return [];

	const currentCategory = getProductCategory(currentProduct);
	const currentBrand = getProductBrand(currentProduct);
	const currentPrice = getProductPrice(currentProduct);

	const ranked = eligibleCatalog(currentProduct, catalog)
		.map((product) => {
			const tags = sharedTagCount(currentProduct, product);
			const sameCategory = currentCategory && getProductCategory(product) === currentCategory ? 1 : 0;
			const sameBrand = currentBrand && getProductBrand(product) === currentBrand ? 1 : 0;
			const candidatePrice = getProductPrice(product);
			const qualitativeScore = tags * TAG_WEIGHT + sameCategory * CATEGORY_WEIGHT + sameBrand * BRAND_WEIGHT;

			return {
				product,
				score: qualitativeScore + priceCloseness(currentPrice, candidatePrice) * PRICE_WEIGHT,
				qualitativeScore,
				priceDistance: priceDistance(currentPrice, candidatePrice),
			};
		})
		.filter((item) => item.qualitativeScore > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			if (a.priceDistance !== b.priceDistance) return a.priceDistance - b.priceDistance;
			return getProductKey(a.product).localeCompare(getProductKey(b.product));
		});

	return ranked.slice(0, limit).map((item) => item.product);
}

function categoryKey(product) {
	return getProductCategory(product) || `uncategorized:${getProductKey(product)}`;
}

function compareProductsWithinCategory(a, b) {
	const rawRatingA = Number(a?.rating);
	const rawRatingB = Number(b?.rating);
	const hasRatingA = Number.isFinite(rawRatingA) && rawRatingA > 0;
	const hasRatingB = Number.isFinite(rawRatingB) && rawRatingB > 0;

	// Both rated: higher rating takes precedence
	if (hasRatingA && hasRatingB) {
		if (Math.abs(rawRatingB - rawRatingA) >= 0.1) {
			return rawRatingB - rawRatingA;
		}
	} else if (hasRatingA && !hasRatingB) {
		// A is rated, B is unrated: high-rated A (>= 4.0) ranks ahead of unrated B;
		// poorly rated A (< 3.0) ranks behind unrated B
		if (rawRatingA >= 4.0) return -1;
		if (rawRatingA < 3.0) return 1;
	} else if (!hasRatingA && hasRatingB) {
		// A is unrated, B is rated:
		if (rawRatingB >= 4.0) return 1;
		if (rawRatingB < 3.0) return -1;
	}

	// Promotion / discount percentage as secondary signal
	const discountA = Number(a?.discountPercentage) || 0;
	const discountB = Number(b?.discountPercentage) || 0;
	if (Math.abs(discountB - discountA) >= 1) {
		return discountB - discountA;
	}

	// Deterministic stable tie-breaker by unique product key
	return getProductKey(a).localeCompare(getProductKey(b));
}

export function getYouMayAlsoLike(currentProduct, catalog, excludedProducts = [], limit = RECOMMENDATION_LIMIT) {
	const currentCatKey = currentProduct ? categoryKey(currentProduct) : '';
	const eligible = eligibleCatalog(currentProduct, catalog, excludedProducts);

	if (eligible.length === 0) return [];

	// Group eligible products by category
	const categoryBuckets = new Map();
	for (const product of eligible) {
		const key = categoryKey(product);
		if (!categoryBuckets.has(key)) {
			categoryBuckets.set(key, []);
		}
		categoryBuckets.get(key).push(product);
	}

	// Sort candidates within each category using the neutral ranking strategy
	for (const [key, products] of categoryBuckets.entries()) {
		categoryBuckets.set(key, products.sort(compareProductsWithinCategory));
	}

	// Prioritize cross-categories (different from current product's category)
	const crossCategoryKeys = [];
	const sameCategoryKeys = [];
	for (const key of categoryBuckets.keys()) {
		if (currentCatKey && key === currentCatKey) {
			sameCategoryKeys.push(key);
		} else {
			crossCategoryKeys.push(key);
		}
	}

	// Sort cross categories deterministically or by category's top product quality
	crossCategoryKeys.sort((catA, catB) => {
		const topA = categoryBuckets.get(catA)[0];
		const topB = categoryBuckets.get(catB)[0];
		return compareProductsWithinCategory(topA, topB);
	});

	const selected = [];
	const selectedKeys = new Set();

	// First pass: select 1 best representative from each cross-category
	for (const catKey of crossCategoryKeys) {
		if (selected.length >= limit) break;
		const products = categoryBuckets.get(catKey);
		const candidate = products.find((p) => !selectedKeys.has(getProductKey(p)));
		if (candidate) {
			selected.push(candidate);
			selectedKeys.add(getProductKey(candidate));
		}
	}

	// Second pass: if cross-categories did not fill the limit, pull next best products across available categories
	if (selected.length < limit) {
		const allCatKeys = [...crossCategoryKeys, ...sameCategoryKeys];
		let addedInRound = true;

		while (selected.length < limit && addedInRound) {
			addedInRound = false;
			for (const catKey of allCatKeys) {
				if (selected.length >= limit) break;
				const products = categoryBuckets.get(catKey);
				const candidate = products.find((p) => !selectedKeys.has(getProductKey(p)));
				if (candidate) {
					selected.push(candidate);
					selectedKeys.add(getProductKey(candidate));
					addedInRound = true;
				}
			}
		}
	}

	return selected;
}
