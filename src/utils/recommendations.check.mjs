import { getSimilarProducts, getYouMayAlsoLike, getProductKey } from './recommendations.js';

const image = ['https://example.com/image.png'];

const current = {
	id: 1,
	title: 'Mascara',
	source: undefined,
	category: 'beauty',
	brand: 'Essence',
	tags: ['beauty', 'mascara'],
	price: 10,
	rating: 4.2,
	reviews: [{}, {}],
	images: image,
};

const catalog = [
	current,
	{
		id: 2,
		title: 'Closer mascara',
		category: 'beauty',
		brand: 'Essence',
		tags: ['beauty', 'mascara'],
		price: 11,
		rating: 3,
		reviews: [],
		images: image,
	},
	{
		id: 3,
		title: 'Other beauty',
		category: 'beauty',
		brand: 'Other',
		tags: ['beauty'],
		price: 40,
		rating: 5,
		reviews: [{}, {}, {}],
		images: image,
	},
	{
		id: 4,
		title: 'Same brand far price',
		category: 'fragrances',
		brand: 'Essence',
		tags: [],
		price: 90,
		rating: 4.9,
		reviews: [{}],
		images: image,
	},
	{
		id: 5,
		title: 'Missing fields',
		price: 10,
		images: image,
	},
	{
		id: 6,
		title: 'No image',
		category: 'beauty',
		brand: 'Essence',
		tags: ['mascara'],
		price: 10,
		images: [],
	},
	{
		id: 'custom-archived',
		source: 'firebase',
		title: 'Archived beauty',
		category: 'beauty',
		price: 10,
		rating: 5,
		stock: 4,
		status: 'archived',
		isAvailable: false,
		images: image,
	},
	{
		id: 'custom-stock',
		source: 'firebase',
		title: 'Out of stock beauty',
		category: 'beauty',
		price: 10,
		rating: 5,
		stock: 0,
		status: 'active',
		isAvailable: true,
		images: image,
	},
	{
		id: 'custom-live',
		source: 'firebase',
		title: 'Custom beauty',
		category: 'Beauty',
		price: 12,
		rating: 4.8,
		stock: 3,
		status: 'active',
		isAvailable: true,
		images: image,
	},
	{
		id: 1,
		source: 'firebase',
		title: 'Custom with numeric id',
		category: 'groceries',
		price: 12,
		rating: 4.8,
		stock: 3,
		status: 'active',
		isAvailable: true,
		images: image,
	},
	{
		id: 7,
		title: 'Laptop',
		category: 'laptops',
		brand: 'Acer',
		tags: ['laptop'],
		price: 999,
		rating: 4.7,
		reviews: [{}, {}],
		images: image,
	},
	{
		id: 8,
		title: 'Phone',
		category: 'smartphones',
		brand: 'Apple',
		tags: ['phone'],
		price: 800,
		rating: 4.6,
		reviews: [{}],
		images: image,
	},
	{
		id: 9,
		title: 'Chair',
		category: 'furniture',
		brand: 'Ikea',
		tags: ['chair'],
		price: 80,
		rating: 4.4,
		reviews: [{}],
		images: image,
	},
	{
		id: 10,
		title: 'Perfume',
		category: 'fragrances',
		brand: 'Dior',
		tags: ['perfume'],
		price: 70,
		rating: 4.1,
		images: image,
	},
	{
		id: 11,
		title: 'Shirt',
		category: 'tops',
		brand: 'Zara',
		tags: ['shirt'],
		price: 30,
		rating: null,
		images: image,
	},
	{
		id: 12,
		title: 'Second beauty',
		category: 'beauty',
		brand: 'Maybelline',
		tags: ['cream'],
		price: 15,
		rating: 4,
		reviews: [{}],
		images: image,
	},
];

const similar = getSimilarProducts(current, catalog);
const also = getYouMayAlsoLike(current, catalog, similar);
const similarKeys = new Set(similar.map(getProductKey));
const alsoKeys = new Set(also.map(getProductKey));

const failures = [];

if (similar.length > 6) failures.push(`similar length ${similar.length}`);
if (also.length > 6) failures.push(`also length ${also.length}`);
if (similar.some((product) => getProductKey(product) === 'dummyjson:1')) failures.push('similar contains current');
if (also.some((product) => getProductKey(product) === 'dummyjson:1')) failures.push('also contains current');
if ([...alsoKeys].some((key) => similarKeys.has(key))) failures.push('overlap between sections');
if (similar.some((product) => product.status === 'archived' || product.stock === 0)) failures.push('similar contains unavailable custom');
if (also.some((product) => product.status === 'archived' || Number(product.stock) === 0)) failures.push('also contains unavailable custom');
if (similar[0]?.id !== 2) failures.push(`expected closest shared product first, got ${similar[0]?.title}`);
if (!similar.some((product) => product.id === 'custom-live')) failures.push('custom category match missing');
if (!alsoKeys.has('firebase:1')) failures.push('firebase id 1 was treated as the dummyjson product');
if (similarKeys.has('dummyjson:5')) failures.push('product with no shared tags, brand, or category was included');

const alsoCategories = also.map((product) => String(product.category || '').toLowerCase());
const uniqueCategories = new Set(alsoCategories);
if (uniqueCategories.size < Math.min(6, also.length)) failures.push(`category diversity failed: ${alsoCategories.join(', ')}`);

if (failures.length) {
	console.error(failures.join('\n'));
	console.error(
		'similar',
		similar.map((product) => product.title),
	);
	console.error(
		'also',
		also.map((product) => `${product.title} (${product.category})`),
	);
	process.exit(1);
}

console.log(
	'similar',
	similar.map((product) => product.title),
);
console.log(
	'also',
	also.map((product) => `${product.title} [${product.category || 'none'}]`),
);
console.log('recommendation checks passed');
