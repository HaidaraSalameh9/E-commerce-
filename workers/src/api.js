// GENERATED FILE - do not edit by hand.
// Produced by workers/build/port.mjs from functions/index.js.
// Everything below the header is verbatim Cloud Functions code; the runtime
// shims supply db, process.env, verifyToken, createClerkClient and friends.

import {
	FieldValue,
	allowedOriginsView as ALLOWED_ORIGINS,
	createClerkClient,
	currentEnv,
	db,
	defineSecret,
	initializeApp,
	logger,
	onRequest,
	setGlobalOptions,
	verifyToken,
} from './runtime.js';

const CLERK_JWT_KEY = defineSecret('CLERK_JWT_KEY');
const CLERK_SECRET_KEY = defineSecret('CLERK_SECRET_KEY');

// Per-request environment, so handler code can read process.env unchanged.
const process = {
	env: new Proxy({}, { get: (_target, key) => currentEnv()[key] }),
};

initializeApp();
setGlobalOptions();


export const api = onRequest((request, response) => {
	response.status(200).json({
		success: true,
		message: 'Firebase Cloud Functions is working!',
	});
});

export const authCheck = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response, 'POST, OPTIONS');

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	const authorization = request.get('Authorization') || '';
	const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

	if (!token) {
		return response.status(401).json({
			success: false,
			message: 'Authentication required',
		});
	}

	try {
		const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, '\n');

		if (!jwtKey) {
			throw new Error('CLERK_JWT_KEY is not configured');
		}

		const verifiedToken = await verifyToken(token, {
			jwtKey,
			authorizedParties: ALLOWED_ORIGINS,
		});

		return response.status(200).json({
			success: true,
			userId: verifiedToken.sub,
			message: 'Clerk authentication successful',
		});
	} catch (error) {
		console.error('Clerk token verification failed:', error.message);

		return response.status(401).json({
			success: false,
			message: 'Invalid or expired session token',
		});
	}
});

export const createOrder = onRequest({ secrets: [CLERK_JWT_KEY, CLERK_SECRET_KEY] }, async (request, response) => {
	setCartCors(request, response, 'POST, OPTIONS');

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	const authorization = request.get('Authorization') || '';
	const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

	if (!token) {
		return response.status(401).json({
			success: false,
			message: 'Authentication required',
		});
	}

	try {
		// 1. Verify Clerk session
		const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, '\n');

		if (!jwtKey) {
			throw new Error('CLERK_JWT_KEY is not configured');
		}

		const verifiedToken = await verifyToken(token, {
			jwtKey,
			authorizedParties: ALLOWED_ORIGINS,
		});

		const userId = verifiedToken.sub;

		// 2. Get customer information from Clerk
		// Profile lookup failure must not prevent order creation.

		let customer = {
			name: 'Unknown Customer',
			email: 'No email',
			imageUrl: null,
		};

		try {
			const secretKey = process.env.CLERK_SECRET_KEY;

			if (!secretKey) {
				throw new Error('CLERK_SECRET_KEY is not configured');
			}

			const clerk = createClerkClient({
				secretKey: secretKey.trim(),
			});

			const clerkUser = await clerk.users.getUser(userId);

			const primaryEmail = clerkUser.emailAddresses?.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || 'No email';

			customer = {
				name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Unnamed User',

				email: primaryEmail,

				imageUrl: clerkUser.imageUrl || null,
			};
		} catch (profileError) {
			console.error('Could not retrieve Clerk customer profile:', profileError);
		}

		// 3. Read order data
		const { products, shippingInformation, paymentMethod } = request.body || {};

		if (!Array.isArray(products) || products.length === 0 || products.length > 15 || !shippingInformation || typeof shippingInformation !== 'object' || Array.isArray(shippingInformation)) {
			return response.status(400).json({
				success: false,
				message: 'Invalid order data',
			});
		}

		const { address, city, zip, phone } = shippingInformation;

		if (![address, city, zip, phone].every((value) => typeof value === 'string' && value.trim().length > 0)) {
			return response.status(400).json({
				success: false,
				message: 'Complete all shipping information',
			});
		}

		if (!['cod', 'dc'].includes(paymentMethod)) {
			return response.status(400).json({
				success: false,
				message: 'Invalid payment method',
			});
		}

		// 4. Validate products and retrieve real product data
		const seenIds = new Set();

		const orderProducts = await Promise.all(
			products.map(async (item) => {
				const productId = String(item.productId ?? '').trim();
				const quantity = Number(item.quantity);

				if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
					throw new Error('Invalid product ID or quantity');
				}

				if (seenIds.has(productId)) {
					throw new Error('Duplicate product in order');
				}

				seenIds.add(productId);

				const product = await getOrderableProduct(productId);

				return {
					productId: product.id,
					title: product.title,
					price: product.price,
					quantity,
					subtotal: product.price * quantity,
					thumbnail: product.image,
				};
			}),
		);

		// 5. Calculate total price on backend
		const totalPrice = orderProducts.reduce((total, product) => total + product.subtotal, 0);

		// 6. Save order and activity in Firestore

		const orderRef = db.collection('orders').doc();
		const activityRef = db.collection('userActivity').doc();

		const createdAt = new Date().toISOString();

		const order = {
			orderId: orderRef.id,
			orderNumber: `ORD-${Date.now()}`,

			userId,
			customer,

			products: orderProducts,

			shippingInformation: {
				address: address.trim(),
				city: city.trim(),
				zip: zip.trim(),
				phone: phone.trim(),
			},

			paymentMethod,
			totalPrice,
			status: 'pending',
			createdAt,
		};

		// Activity record
		const activity = {
			userId,
			actorUserId: userId,

			type: 'order_created',
			description: `Created order ${order.orderNumber}`,

			metadata: {
				orderId: orderRef.id,
				orderNumber: order.orderNumber,
				totalPrice,
				paymentMethod,
				itemCount: orderProducts.length,

				products: orderProducts.map((product) => ({
					productId: product.productId,
					title: product.title,
					quantity: product.quantity,
				})),
			},

			createdAt,
		};

		// Save both documents together
		const batch = db.batch();

		batch.set(orderRef, order);
		batch.set(activityRef, activity);

		await batch.commit();

		return response.status(201).json({
			success: true,
			message: 'Order created successfully',
			order,
		});
	} catch (error) {
		console.error('Create order failed:', error);

		const errorMessage = String(error.message || '');

		if (errorMessage === 'Invalid product ID or quantity' || errorMessage === 'Duplicate product in order' || errorMessage === 'A product could not be found' || errorMessage === 'Product not found' || errorMessage === 'Not enough product stock') {
			return response.status(400).json({
				success: false,
				message: errorMessage,
			});
		}

		if (errorMessage.toLowerCase().includes('token') || errorMessage.includes('JWT')) {
			return response.status(401).json({
				success: false,
				message: 'Invalid or expired session token',
			});
		}

		return response.status(500).json({
			success: false,
			message: 'Could not create the order',
		});
	}
});

export const getOrder = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		const userId = await verifyClerkUser(request);
		const orderId = request.query.orderId;

		if (typeof orderId !== 'string' || !orderId.trim()) {
			return response.status(400).json({
				success: false,
				message: 'Order ID is required',
			});
		}

		const orderRef = db.collection('orders').doc(orderId);
		const snapshot = await orderRef.get();

		if (!snapshot.exists) {
			return response.status(404).json({
				success: false,
				message: 'Order not found',
			});
		}

		const order = snapshot.data();

		if (order.userId !== userId) {
			return response.status(403).json({
				success: false,
				message: 'You are not allowed to view this order',
			});
		}

		return response.status(200).json({
			success: true,
			order: {
				...order,
				orderId: snapshot.id,
			},
		});
	} catch (error) {
		console.error('Get order failed:', error.message);

		if (error.status === 401 || error.message.includes('token') || error.message.includes('JWT')) {
			return response.status(401).json({
				success: false,
				message: 'Invalid or expired session token',
			});
		}

		return response.status(500).json({
			success: false,
			message: 'Could not retrieve the order',
		});
	}
});

export const getMyOrders = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		// Verify the signed-in Clerk user
		const userId = await verifyClerkUser(request);

		// Get only this user's orders
		const snapshot = await db.collection('orders').where('userId', '==', userId).get();

		const orders = snapshot.docs.map((doc) => doc.data()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

		return response.status(200).json({
			success: true,
			count: orders.length,
			orders,
		});
	} catch (error) {
		console.error('Get my orders failed:', error.message);

		if (error.status === 401 || error.message?.includes('token') || error.message?.includes('JWT')) {
			return response.status(401).json({
				success: false,
				message: 'Invalid or expired session token',
			});
		}

		return response.status(500).json({
			success: false,
			message: 'Could not retrieve your orders',
		});
	}
});

async function verifyClerkUser(request) {
	const authorization = request.get('Authorization') || '';
	const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

	if (!token) {
		const error = new Error('Authentication required');
		error.status = 401;
		throw error;
	}

	const origin = request.get('Origin');

	if (!ALLOWED_ORIGINS.includes(origin)) {
		const error = new Error('Origin not allowed');
		error.status = 403;
		throw error;
	}

	const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, '\n');

	if (!jwtKey) {
		throw new Error('CLERK_JWT_KEY is not configured');
	}

	const verifiedToken = await verifyToken(token, {
		jwtKey,
		authorizedParties: ALLOWED_ORIGINS,
	});

	return verifiedToken.sub;
}

function setCartCors(request, response, methods = 'GET, POST, PUT, DELETE, OPTIONS') {
	const origin = request.get('Origin');

	if (ALLOWED_ORIGINS.includes(origin)) {
		response.set('Access-Control-Allow-Origin', origin);
	}

	response.set('Access-Control-Allow-Methods', methods);
	response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
	response.set('Vary', 'Origin');
}

const productCache = new Map();
const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getDummyProduct(productId) {
	const now = Date.now();
	const cached = productCache.get(productId);

	if (cached && cached.expiresAt > now) {
		return cached.product;
	}

	productCache.delete(productId);

	const request = fetch(`https://dummyjson.com/products/${productId}`, { signal: AbortSignal.timeout(5000) }).then(async (response) => {
		if (response.status === 404) {
			const error = new Error('Product not found');
			error.status = 404;
			throw error;
		}

		if (!response.ok) {
			throw new Error('Could not verify product');
		}

		const product = await response.json();

		if (product.id !== productId || typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0) {
			throw new Error('Invalid product data');
		}

		return product;
	});

	// Cache the in-flight request too, so concurrent requests can share it.
	const entry = {
		expiresAt: now + PRODUCT_CACHE_TTL,
		product: null,
		request,
	};

	productCache.set(productId, entry);

	try {
		const product = await request;
		entry.product = product;
		return product;
	} catch (error) {
		if (productCache.get(productId) === entry) {
			productCache.delete(productId);
		}
		throw error;
	}
}

async function getOrderableProduct(productId) {
	const id = String(productId ?? '').trim();

	if (!id) {
		throw new Error('Product not found');
	}

	// Keep existing DummyJSON products working.
	if (/^\d+$/.test(id)) {
		const numericId = Number(id);

		if (Number.isSafeInteger(numericId) && numericId > 0) {
			try {
				const product = await getDummyProduct(numericId);

				return {
					id: product.id,
					title: product.title,
					price: product.price,
					image: product.thumbnail || product.images?.[0] || '',
					stock: product.stock,
					status: product.stock === 0 ? 'out_of_stock' : 'active',
					isAvailable: product.stock > 0,
				};
			} catch (error) {
				if (error.message !== 'Product not found') {
					throw error;
				}
			}
		}
	}

	// Support Firebase custom products.
	const doc = await db.collection('customProducts').doc(id).get();

	if (!doc.exists) {
		throw new Error('Product not found');
	}

	const product = doc.data();

	if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0) {
		throw new Error('Invalid product data');
	}

	const stock = Number(product.stock);
	const isOutOfStock = Number.isFinite(stock) && stock <= 0;

	return {
		id: doc.id,
		title: product.title,
		price: product.price,
		image: product.images?.[0] || '',
		stock: product.stock,
		status: product.status === 'archived' ? 'archived' : isOutOfStock ? 'out_of_stock' : 'active',
		isAvailable: product.status === 'active' && Number.isFinite(stock) && stock > 0,
	};
}

export const cart = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (!['GET', 'POST'].includes(request.method)) {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		const userId = await verifyClerkUser(request);
		const cartRef = db.collection('carts').doc(userId);

		// Load the signed-in user's cart
		// Load the signed-in user's cart
		if (request.method === 'GET') {
			const snapshot = await cartRef.get();

			if (!snapshot.exists) {
				return response.status(200).json({
					success: true,
					products: [],
				});
			}

			const savedProducts = snapshot.data().products || [];

			const updatedProducts = await Promise.all(
				savedProducts.map(async (item) => {
					const productId = item.id ?? item.productId;
					const quantity = Number(item.quantity);

					if (!Number.isInteger(quantity) || quantity < 1 || quantity > 8) {
						throw new Error('Invalid cart product or quantity');
					}

					try {
						const product = await getOrderableProduct(productId);

						const isOutOfStock = product.status === 'out_of_stock' || (Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0);

						const isArchived = product.status === 'archived';

						return {
							id: product.id,
							title: product.title,
							price: product.price,
							image: product.image || item.image || '',
							quantity,
							totalPrice: product.price * quantity,
							status: isArchived ? 'archived' : isOutOfStock ? 'out_of_stock' : 'active',
							unavailable: isArchived || isOutOfStock,
						};
					} catch (error) {
						if (error.message === 'Product not found' || error.message === 'Product is no longer available') {
							return {
								...item,
								id: item.id ?? item.productId,
								quantity,
								totalPrice: Number(item.price) * quantity,
								status: 'archived',
								unavailable: true,
							};
						}

						throw error;
					}
				}),
			);

			await cartRef.update({
				products: updatedProducts,
				updatedAt: new Date().toISOString(),
			});

			return response.status(200).json({
				success: true,
				products: updatedProducts,
			});
		}

		// Save the signed-in user's cart

		// Save the signed-in user's cart
		const { products } = request.body || {};

		if (!Array.isArray(products) || products.length > 15) {
			return response.status(400).json({
				success: false,
				message: 'Invalid cart products',
			});
		}

		const seenIds = new Set();

		const validatedProducts = await Promise.all(
			products.map(async (item) => {
				const productId = String(item.productId ?? '').trim();
				const quantity = Number(item.quantity);

				if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 8 || seenIds.has(productId)) {
					throw new Error('Invalid cart product or quantity');
				}

				seenIds.add(productId);

				const product = await getOrderableProduct(productId);

				return {
					id: product.id,
					title: product.title,
					price: product.price,
					image: product.image,
					quantity,
					totalPrice: product.price * quantity,
				};
			}),
		);

		// Compare old cart with new cart and record activities
		const updatedAt = new Date().toISOString();

		await db.runTransaction(async (transaction) => {
			const cartSnapshot = await transaction.get(cartRef);

			const oldProducts = cartSnapshot.exists && Array.isArray(cartSnapshot.data().products) ? cartSnapshot.data().products : [];

			const oldProductsMap = new Map(oldProducts.map((item) => [String(item.id ?? item.productId), item]));

			const newProductsMap = new Map(validatedProducts.map((item) => [String(item.id), item]));

			const activities = [];

			// Detect added products and quantity changes
			for (const product of validatedProducts) {
				const oldProduct = oldProductsMap.get(String(product.id));

				if (!oldProduct) {
					activities.push({
						type: 'cart_added',
						description: `Added ${product.title} to cart`,
						metadata: {
							productId: product.id,
							productTitle: product.title,
							quantity: product.quantity,
						},
					});
				} else if (Number(oldProduct.quantity) !== product.quantity) {
					activities.push({
						type: 'cart_quantity_updated',
						description: `Updated quantity of ${product.title}`,
						metadata: {
							productId: product.id,
							productTitle: product.title,
							previousQuantity: Number(oldProduct.quantity),
							newQuantity: product.quantity,
						},
					});
				}
			}

			// Detect removed products
			for (const oldProduct of oldProducts) {
				const productId = String(oldProduct.id ?? oldProduct.productId);

				if (!newProductsMap.has(productId)) {
					activities.push({
						type: 'cart_removed',
						description: `Removed ${oldProduct.title || 'a product'} from cart`,
						metadata: {
							productId,
							productTitle: oldProduct.title || 'Unknown Product',
							quantity: Number(oldProduct.quantity) || 0,
						},
					});
				}
			}

			// Save the updated cart
			transaction.set(cartRef, {
				userId,
				products: validatedProducts,
				updatedAt,
			});

			// Save activity records
			for (const activity of activities) {
				const activityRef = db.collection('userActivity').doc();

				transaction.set(activityRef, {
					userId,
					actorUserId: userId,
					...activity,
					createdAt: updatedAt,
				});
			}

			return activities.length;
		});

		return response.status(200).json({
			success: true,
			products: validatedProducts,
			message: 'Cart saved successfully',
		});
	} catch (error) {
		console.error('Cart request failed:', error.message);

		if (['Invalid cart product or quantity', 'Product not found', 'Not enough product stock'].includes(error.message)) {
			return response.status(400).json({
				success: false,
				message: error.message,
			});
		}

		if (error.status === 404) {
			return response.status(400).json({
				success: false,
				message: 'Product not found',
			});
		}

		return response.status(500).json({
			success: false,
			message: 'Could not process the cart',
		});
	}
});

// ==========================================
// FAVORITES FUNCTIONS
// ==========================================

const MAX_FAVORITES = 15;

// Validate and normalize product IDs
function normalizeProductId(productId) {
	if ((typeof productId !== 'string' && typeof productId !== 'number') || !String(productId).trim()) {
		throw new Error('Invalid product ID');
	}

	const id = String(productId).trim();

	if (id.length > 1500 || id.includes('/')) {
		throw new Error('Invalid product ID');
	}

	return id;
}

// Get the user's favorites collection
function getFavoritesRef(userId) {
	return db.collection('users').doc(userId).collection('favorites');
}

// Return consistent favorite data
async function buildFavoritesResponse(snapshot) {
	const unavailableProductIds = [];

	const favorites = await Promise.all(
		snapshot.docs.map(async (doc) => {
			try {
				const product = await getOrderableProduct(doc.id);

				return {
					...product,
					productId: doc.id,
					addedAt: doc.data().addedAt?.toDate?.().toISOString() || null,
				};
			} catch (error) {
				unavailableProductIds.push(doc.id);
				return null;
			}
		}),
	);

	return {
		favorites: favorites.filter(Boolean),
		unavailableProductIds,
	};
}

// ------------------------------------------
// 1. GET USER FAVORITES
// ------------------------------------------

export const getUserFavorites = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		const userId = await verifyClerkUser(request);
		const favoritesRef = getFavoritesRef(userId);

		const snapshot = await favoritesRef.get();

		const result = await buildFavoritesResponse(snapshot);

		return response.status(200).json({
			success: true,
			...result,
		});
	} catch (error) {
		logger.error('getUserFavorites error:', error);

		return response.status(error.status || 500).json({
			success: false,
			message: error.message || 'Could not retrieve favorites',
		});
	}
});

// ------------------------------------------
// 2. ADD USER FAVORITE
// ------------------------------------------

export const addUserFavorite = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		const userId = await verifyClerkUser(request);

		const productId = normalizeProductId(request.body?.productId);

		// Verify that the product actually exists
		await getOrderableProduct(productId);

		const favoritesRef = getFavoritesRef(userId);
		const favoriteRef = favoritesRef.doc(productId);

		const result = await db.runTransaction(async (transaction) => {
			const snapshot = await transaction.get(favoritesRef);

			// Do not count an already-added product twice
			if (snapshot.docs.some((doc) => doc.id === productId)) {
				return { alreadyExists: true };
			}

			if (snapshot.size >= MAX_FAVORITES) {
				const error = new Error(`You can save a maximum of ${MAX_FAVORITES} favorites`);
				error.status = 409;
				throw error;
			}

			transaction.set(favoriteRef, {
				productId,
				addedAt: FieldValue.serverTimestamp(),
			});

			return { alreadyExists: false };
		});

		return response.status(200).json({
			success: true,
			message: result.alreadyExists ? 'Product is already in favorites' : 'Product added to favorites',
			productId,
		});
	} catch (error) {
		logger.error('addUserFavorite error:', error);

		return response.status(error.status || (error.message === 'Product not found' ? 404 : 500)).json({
			success: false,
			message: error.message || 'Could not add favorite',
		});
	}
});

// ------------------------------------------
// 3. REMOVE USER FAVORITE
// ------------------------------------------

export const removeUserFavorite = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'DELETE') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		const userId = await verifyClerkUser(request);

		const productId = normalizeProductId(request.body?.productId);

		const favoriteRef = getFavoritesRef(userId).doc(productId);

		await favoriteRef.delete();

		return response.status(200).json({
			success: true,
			message: 'Product removed from favorites',
			productId,
		});
	} catch (error) {
		logger.error('removeUserFavorite error:', error);

		return response.status(error.status || 500).json({
			success: false,
			message: error.message || 'Could not remove favorite',
		});
	}
});

// ------------------------------------------
// 4. SYNC LOCAL FAVORITES WITH FIRESTORE
// ------------------------------------------

export const syncUserFavorites = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		const userId = await verifyClerkUser(request);

		const incomingIds = request.body?.productIds;

		if (!Array.isArray(incomingIds)) {
			return response.status(400).json({
				success: false,
				message: 'productIds must be an array',
			});
		}

		const localIds = [...new Set(incomingIds.map(normalizeProductId))];

		// Verify all local products before syncing
		await Promise.all(localIds.map((id) => getOrderableProduct(id)));

		const favoritesRef = getFavoritesRef(userId);

		const syncedIds = await db.runTransaction(async (transaction) => {
			const snapshot = await transaction.get(favoritesRef);

			const existingIds = snapshot.docs.map((doc) => doc.id);

			const mergedIds = [...new Set([...existingIds, ...localIds])];

			if (mergedIds.length > MAX_FAVORITES) {
				const error = new Error(`Your favorites exceed the maximum of ${MAX_FAVORITES} products. Remove some products before syncing.`);
				error.status = 409;
				throw error;
			}

			for (const id of localIds) {
				if (!existingIds.includes(id)) {
					transaction.set(favoritesRef.doc(id), {
						productId: id,
						addedAt: FieldValue.serverTimestamp(),
					});
				}
			}

			return mergedIds;
		});

		return response.status(200).json({
			success: true,
			message: 'Favorites synchronized successfully',
			productIds: syncedIds,
		});
	} catch (error) {
		logger.error('syncUserFavorites error:', error);

		return response.status(error.status || (error.message === 'Product not found' ? 404 : 500)).json({
			success: false,
			message: error.message || 'Could not synchronize favorites',
		});
	}
});

export const getMyRole = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		const userId = await verifyClerkUser(request);
		const ownerId = process.env.OWNER_CLERK_USER_ID;

		if (!ownerId) {
			throw new Error('OWNER_CLERK_USER_ID is not configured');
		}

		const userRef = db.collection('users').doc(userId);
		const userSnapshot = await userRef.get();

		// The configured owner always has the owner role.
		if (userId === ownerId) {
			await userRef.set(
				{
					userId,
					role: 'owner',
					updatedAt: new Date().toISOString(),
				},
				{ merge: true },
			);

			return response.status(200).json({
				success: true,
				role: 'owner',
			});
		}

		// Other users default to user; preserve existing roles.
		const role = userSnapshot.exists ? userSnapshot.data().role : 'user';

		if (!userSnapshot.exists) {
			await userRef.set({
				userId,
				role: 'user',
				createdAt: new Date().toISOString(),
			});
		}

		if (!['user', 'admin'].includes(role)) {
			return response.status(403).json({
				success: false,
				message: 'Invalid user role',
			});
		}

		return response.status(200).json({
			success: true,
			role,
		});
	} catch (error) {
		console.error('Get my role failed:', error.message);

		if (error.status === 401) {
			return response.status(401).json({
				success: false,
				message: 'Authentication required',
			});
		}

		return response.status(500).json({
			success: false,
			message: 'Could not retrieve user role',
		});
	}
});

export const updateUserRole = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed',
		});
	}

	try {
		// Verify the signed-in user using Clerk.
		const callerId = await verifyClerkUser(request);
		const ownerId = process.env.OWNER_CLERK_USER_ID;

		// Only the configured owner can manage roles.
		if (!ownerId || callerId !== ownerId) {
			return response.status(403).json({
				success: false,
				message: 'Only the owner can manage user roles.',
			});
		}

		const { targetUserId, role } = request.body || {};

		if (typeof targetUserId !== 'string' || !targetUserId.startsWith('user_') || !['admin', 'user'].includes(role)) {
			return response.status(400).json({
				success: false,
				message: 'Invalid user ID or role.',
			});
		}

		// Never allow changing the configured owner's role.
		if (targetUserId === ownerId) {
			return response.status(403).json({
				success: false,
				message: 'The owner role cannot be changed here.',
			});
		}

		await db.collection('users').doc(targetUserId).set(
			{
				userId: targetUserId,
				role,
				updatedAt: new Date().toISOString(),
			},
			{ merge: true },
		);

		return response.status(200).json({
			success: true,
			message: `User role updated to ${role}.`,
			targetUserId,
			role,
		});
	} catch (error) {
		console.error('Update user role failed:', error.message);

		if (error.status === 401 || error.message.includes('token') || error.message.includes('JWT')) {
			return response.status(401).json({
				success: false,
				message: 'Invalid or expired session token.',
			});
		}

		return response.status(500).json({
			success: false,
			message: 'Could not update user role.',
		});
	}
});

async function verifyAdminOrOwner(request) {
	const userId = await verifyClerkUser(request);

	const ownerId = process.env.OWNER_CLERK_USER_ID;

	if (ownerId && userId === ownerId) {
		return userId;
	}

	const userDoc = await db.collection('users').doc(userId).get();

	if (!userDoc.exists) {
		throw new Error('Access denied.');
	}

	const role = userDoc.data().role;

	if (role !== 'admin' && role !== 'owner') {
		throw new Error('Access denied.');
	}

	return userId;
}

export const getAllOrders = onRequest({ secrets: [CLERK_JWT_KEY, CLERK_SECRET_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	// 1. Verify Admin / Owner permissions
	try {
		await verifyAdminOrOwner(request);
	} catch (error) {
		console.error('getAllOrders authentication failed:', error);

		const status = error.status || (error.message === 'Access denied.' ? 403 : 401);

		return response.status(status).json({
			success: false,
			message: status === 403 ? 'You do not have permission to view all orders.' : 'Authentication failed.',
		});
	}

	try {
		// 2. Fetch orders from Firestore
		const snapshot = await db.collection('orders').get();

		const orders = snapshot.docs.map((doc) => ({
			...doc.data(),
			orderId: doc.id,
		}));

		// 3. Prepare default customer information
		const usersMap = new Map();

		// 4. Get unique customer IDs
		const userIds = [...new Set(orders.map((order) => order.userId).filter(Boolean))];

		// 5. Fetch customer information from Clerk
		const secretKey = process.env.CLERK_SECRET_KEY;

		if (secretKey && userIds.length > 0) {
			try {
				const clerk = createClerkClient({
					secretKey,
				});

				const batchSize = 100;

				for (let i = 0; i < userIds.length; i += batchSize) {
					const batch = userIds.slice(i, i + batchSize);

					const { data: clerkUsers } = await clerk.users.getUserList({
						userId: batch,
						limit: batch.length,
					});

					for (const user of clerkUsers) {
						const primaryEmail = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress;

						usersMap.set(user.id, {
							name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed User',

							email: primaryEmail || 'No email',

							imageUrl: user.imageUrl || null,
						});
					}
				}
			} catch (error) {
				console.error('Could not fetch customers from Clerk:', error);
			}
		} else if (!secretKey) {
			console.warn('CLERK_SECRET_KEY is missing. Returning orders without customer details.');
		}

		// 6. Attach customer information to orders
		const enrichedOrders = orders.map((order) => {
			const customer = usersMap.get(order.userId);

			return {
				...order,

				customer: {
					name: customer?.name || 'Unknown Customer',
					email: customer?.email || 'No email',
					imageUrl: customer?.imageUrl || null,
				},
			};
		});

		// 7. Sort newest orders first
		enrichedOrders.sort((a, b) => {
			const getTimestamp = (value) => {
				if (!value) return 0;

				if (typeof value.toDate === 'function') {
					return value.toDate().getTime();
				}

				if (typeof value.seconds === 'number') {
					return value.seconds * 1000;
				}

				if (typeof value._seconds === 'number') {
					return value._seconds * 1000;
				}

				const date = new Date(value);

				return Number.isNaN(date.getTime()) ? 0 : date.getTime();
			};

			return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
		});

		// 8. Return orders
		return response.status(200).json({
			success: true,
			orders: enrichedOrders,
		});
	} catch (error) {
		console.error('getAllOrders failed:', error);

		return response.status(500).json({
			success: false,
			message: 'Could not retrieve orders.',
		});
	}
});

export const updateOrderStatus = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	try {
		const adminUserId = await verifyAdminOrOwner(request);

		const { orderId, status } = request.body || {};

		const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

		if (typeof orderId !== 'string' || !orderId.trim() || !allowedStatuses.includes(status)) {
			return response.status(400).json({
				success: false,
				message: 'Invalid order ID or status.',
			});
		}

		const orderRef = db.collection('orders').doc(orderId);

		// Create activity document reference
		const activityRef = db.collection('userActivity').doc();

		const updatedAt = new Date().toISOString();

		await db.runTransaction(async (transaction) => {
			const orderDoc = await transaction.get(orderRef);

			if (!orderDoc.exists) {
				throw Object.assign(new Error('Order not found.'), {
					status: 404,
				});
			}

			const orderData = orderDoc.data();
			const previousStatus = orderData.status;

			if (previousStatus === 'cancelled') {
				throw Object.assign(new Error('This order has already been cancelled.'), { status: 409 });
			}

			// Update order
			const updateData = {
				status,
				updatedAt,
			};

			if (status === 'cancelled') {
				updateData.cancelledAt = updatedAt;
				updateData.cancelledBy = adminUserId;
				updateData.cancellationSource = 'admin';
			}

			transaction.update(orderRef, updateData);

			// Record activity
			transaction.set(activityRef, {
				userId: orderData.userId,
				actorUserId: adminUserId,

				type: 'order_status_updated',

				description: `Order status changed from ${previousStatus} to ${status}`,

				metadata: {
					orderId,
					orderNumber: orderData.orderNumber || null,
					previousStatus,
					newStatus: status,
				},

				createdAt: updatedAt,
			});
		});

		return response.status(200).json({
			success: true,
			message: 'Order status updated successfully.',
			orderId,
			status,
		});
	} catch (error) {
		console.error('Update order status failed:', error);

		const status = error.status || (error.message === 'Access denied.' ? 403 : 401);

		return response.status(status).json({
			success: false,
			message: error.message || 'Could not update order status.',
		});
	}
});

export const cancelOrder = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	try {
		const userId = await verifyClerkUser(request);
		const { orderId } = request.body || {};

		if (typeof orderId !== 'string' || !orderId.trim()) {
			return response.status(400).json({
				success: false,
				message: 'Order ID is required.',
			});
		}

		const orderRef = db.collection('orders').doc(orderId);

		const result = await db.runTransaction(async (transaction) => {
			const orderDoc = await transaction.get(orderRef);

			if (!orderDoc.exists) {
				throw Object.assign(new Error('Order not found.'), { status: 404 });
			}

			const order = orderDoc.data();

			if (order.userId !== userId) {
				throw Object.assign(new Error('You are not allowed to cancel this order.'), { status: 403 });
			}

			if (!['pending', 'processing'].includes(order.status)) {
				throw Object.assign(new Error('This order can no longer be cancelled.'), { status: 409 });
			}

			const cancelledAt = new Date().toISOString();

			transaction.update(orderRef, {
				status: 'cancelled',
				cancelledAt,
				cancelledBy: userId,
				updatedAt: cancelledAt,
			});

			return {
				status: 'cancelled',
				cancelledAt,
			};
		});

		return response.status(200).json({
			success: true,
			message: 'Order cancelled successfully.',
			orderId,
			...result,
		});
	} catch (error) {
		console.error('Cancel order failed:', error.message);

		const status = error.status || (error.message?.includes('token') || error.message?.includes('JWT') ? 401 : 500);

		return response.status(status).json({
			success: false,
			message: status === 500 ? 'Could not cancel your order.' : error.message,
		});
	}
});

export const getAllUsers = onRequest({ secrets: [CLERK_JWT_KEY, CLERK_SECRET_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	try {
		const callerId = await verifyClerkUser(request);

		if (callerId !== process.env.OWNER_CLERK_USER_ID) {
			return response.status(403).json({
				success: false,
				message: 'Only the owner can manage users.',
			});
		}

		const secretKey = process.env.CLERK_SECRET_KEY;

		if (!secretKey) {
			throw new Error('CLERK_SECRET_KEY is not configured.');
		}

		const roleSnapshot = await db.collection('users').get();

		const roles = new Map(roleSnapshot.docs.map((doc) => [doc.id, doc.data().role || 'user']));

		const users = [];
		let offset = 0;
		const limit = 100;
		let hasMoreUsers = true;

		while (hasMoreUsers) {
			const clerkResponse = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
				headers: {
					Authorization: `Bearer ${secretKey}`,
				},
			});

			if (!clerkResponse.ok) {
				throw new Error('Failed to retrieve users from Clerk.');
			}

			const clerkUsers = await clerkResponse.json();
			hasMoreUsers = clerkUsers.length === limit;

			for (const user of clerkUsers) {
				const primaryEmail = user.email_addresses?.find((email) => email.id === user.primary_email_address_id)?.email_address;

				users.push({
					userId: user.id,
					name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed User',
					email: primaryEmail || 'No email',
					imageUrl: user.image_url || null,
					role: roles.get(user.id) || 'user',
					createdAt: user.created_at || null,
				});
			}

			offset += limit;
		}

		return response.status(200).json({
			success: true,
			users,
		});
	} catch (error) {
		console.error('getAllUsers failed:', error.message);

		return response.status(500).json({
			success: false,
			message: 'Could not load users. Please try again.',
		});
	}
});
// 0000000000000000000000000000000000000000000000
/*
 * Custom products – Cloud Functions
 *
 * Paste this into your functions file, replacing the old versions of:
 *   getCustomProducts, createCustomProduct, updateCustomProduct,
 *   ArchivedCustomProduct, getAdminCustomProducts, deleteCustomProduct
 *
 * It assumes you already have these in the same file (as in your current code):
 *   onRequest, db, setCartCors, verifyAdminOrOwner
 * If `FieldValue` is already imported, delete the import line below.
 */


/* ------------------------------------------------------------------ */
/*  Shared validation                                                  */
/* ------------------------------------------------------------------ */

const MAX_IMAGES = 5;
const MAX_IMAGES_CHARS = 900000; // Firestore documents are limited to 1 MB
const PRODUCT_STATUSES = ['active', 'archived'];

// Accepts uploaded images (compressed JPEG data URLs from the admin page)
// and normal HTTPS links (older products or Firebase Storage URLs).
const isValidImage = (image) => typeof image === 'string' && (image.startsWith('https://') || image.startsWith('data:image/jpeg;base64,'));

const getProductValidationError = (data) => {
	const { title, description, price, discountPercentage, rating, stock, category, images, shippingInformation } = data || {};

	if (typeof title !== 'string' || !title.trim() || title.length > 150) return 'Valid product name is required.';
	if (typeof description !== 'string' || !description.trim() || description.length > 3000) return 'Valid description is required.';
	if (typeof category !== 'string' || !category.trim() || category.length > 80) return 'Valid category is required.';
	if (typeof shippingInformation !== 'string' || !shippingInformation.trim()) return 'Shipping information is required.';

	if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return 'Valid price is required.';
	if (typeof discountPercentage !== 'number' || !Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) return 'Discount must be between 0 and 100.';
	if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 5) return 'Rating must be between 0 and 5.';
	if (!Number.isInteger(stock) || stock < 0) return 'Stock must be a whole number.';

	if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) return `Add between 1 and ${MAX_IMAGES} images.`;
	if (!images.every(isValidImage)) return 'Images must be uploaded files or HTTPS links.';
	if (images.join('').length > MAX_IMAGES_CHARS) return 'Images are too large. Remove one or use smaller images.';

	return null;
};

// Runs the admin check and sends the right error response if it fails.
// Returns true when the caller is allowed to continue.
const requireAdmin = async (request, response, forbiddenMessage) => {
	try {
		await verifyAdminOrOwner(request);
		return true;
	} catch (error) {
		const isForbidden = error.message === 'Access denied.';

		response.status(isForbidden ? 403 : 401).json({
			success: false,
			message: isForbidden ? forbiddenMessage : 'Please sign in again.',
		});

		return false;
	}
};

/* ------------------------------------------------------------------ */
/*  Public: active products only (storefront)                          */
/* ------------------------------------------------------------------ */

export const getCustomProducts = onRequest(async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	try {
		const snapshot = await db.collection('customProducts').where('status', '==', 'active').get();

		const products = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		return response.status(200).json({
			success: true,
			products,
		});
	} catch (error) {
		console.error('getCustomProducts failed:', error.message);

		return response.status(500).json({
			success: false,
			message: 'Could not load products.',
		});
	}
});

/* ------------------------------------------------------------------ */
/*  Admin: all products, including archived                            */
/* ------------------------------------------------------------------ */

export const getAdminCustomProducts = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);
	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}
	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}
	if (!(await requireAdmin(request, response, 'You do not have permission to view products.'))) return;
	try {
		const snapshot = await db.collection('customProducts').get();

		// Newest first, so a product that was just added appears at the top
		const products = snapshot.docs
			.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}))
			.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

		return response.status(200).json({
			success: true,
			products,
		});
	} catch (error) {
		console.error('getAdminCustomProducts failed:', error.message);

		return response.status(500).json({
			success: false,
			message: 'Could not load admin products.',
		});
	}
});

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export const createCustomProduct = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'POST') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	if (!(await requireAdmin(request, response, 'You do not have permission to add products.'))) return;

	try {
		const validationError = getProductValidationError(request.body);

		if (validationError) {
			return response.status(400).json({
				success: false,
				message: validationError,
			});
		}

		const { title, description, price, discountPercentage, rating, stock, category, images, shippingInformation } = request.body;

		const productRef = db.collection('customProducts').doc();

		const product = {
			id: productRef.id,
			title: title.trim(),
			description: description.trim(),
			price,
			discountPercentage,
			rating,
			stock,
			category: category.trim(),
			images: images.map((image) => image.trim()),
			shippingInformation: shippingInformation.trim(),
			source: 'firebase',
			status: 'active',
			isAvailable: true,
			createdAt: new Date().toISOString(),
		};

		await productRef.set(product);

		return response.status(201).json({
			success: true,
			product,
		});
	} catch (error) {
		console.error('createCustomProduct failed:', error.message);

		return response.status(500).json({
			success: false,
			message: 'Could not create product.',
		});
	}
});

/* ------------------------------------------------------------------ */
/*  Update (also changes status: active <-> archived)                  */
/* ------------------------------------------------------------------ */

export const updateCustomProduct = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'PUT') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	if (!(await requireAdmin(request, response, 'You do not have permission to update products.'))) return;

	try {
		const { id, status: requestedStatus, ...updates } = request.body || {};

		if (typeof id !== 'string' || !id.trim()) {
			return response.status(400).json({
				success: false,
				message: 'Valid product ID is required.',
			});
		}

		const validationError = getProductValidationError(updates);

		if (validationError) {
			return response.status(400).json({
				success: false,
				message: validationError,
			});
		}

		if (requestedStatus !== undefined && !PRODUCT_STATUSES.includes(requestedStatus)) {
			return response.status(400).json({
				success: false,
				message: 'Invalid product status.',
			});
		}

		const productRef = db.collection('customProducts').doc(id.trim());
		const productDoc = await productRef.get();

		if (!productDoc.exists) {
			return response.status(404).json({
				success: false,
				message: 'Product not found.',
			});
		}

		// Keep the current status unless the admin changed it on purpose.
		const status = requestedStatus ?? productDoc.data().status ?? 'active';

		const productUpdates = {
			title: updates.title.trim(),
			description: updates.description.trim(),
			price: updates.price,
			discountPercentage: updates.discountPercentage,
			rating: updates.rating,
			stock: updates.stock,
			category: updates.category.trim(),
			images: updates.images.map((image) => image.trim()),
			shippingInformation: updates.shippingInformation.trim(),
			status,
			isAvailable: status === 'active',
			updatedAt: new Date().toISOString(),
		};

		if (status === 'active') {
			// Restoring a product removes its old archive date.
			productUpdates.archivedAt = FieldValue.delete();
		} else if (!productDoc.data().archivedAt) {
			productUpdates.archivedAt = new Date().toISOString();
		}

		await productRef.update(productUpdates);

		const updatedDoc = await productRef.get();

		return response.status(200).json({
			success: true,
			product: {
				id: updatedDoc.id,
				...updatedDoc.data(),
			},
		});
	} catch (error) {
		console.error('updateCustomProduct failed:', error.message);

		return response.status(500).json({
			success: false,
			message: 'Could not update product.',
		});
	}
});

/* ------------------------------------------------------------------ */
/*  Archive (soft delete)                                              */
/* ------------------------------------------------------------------ */

export const ArchivedCustomProduct = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'DELETE') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	if (!(await requireAdmin(request, response, 'You do not have permission to archive products.'))) return;

	try {
		const id = request.body?.id;

		if (typeof id !== 'string' || !id.trim()) {
			return response.status(400).json({
				success: false,
				message: 'Valid product ID is required.',
			});
		}

		const productRef = db.collection('customProducts').doc(id.trim());
		const productDoc = await productRef.get();

		if (!productDoc.exists) {
			return response.status(404).json({
				success: false,
				message: 'Product not found.',
			});
		}

		// Archive the product instead of permanently deleting it.
		await productRef.update({
			status: 'archived',
			isAvailable: false,
			archivedAt: new Date().toISOString(),
		});

		return response.status(200).json({
			success: true,
			message: 'Product archived successfully.',
			id: id.trim(),
		});
	} catch (error) {
		console.error('ArchivedCustomProduct failed:', error.message);

		return response.status(500).json({
			success: false,
			message: 'Could not archive product.',
		});
	}
});

/* ------------------------------------------------------------------ */
/*  Permanent delete                                                   */
/* ------------------------------------------------------------------ */

export const deleteCustomProduct = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'DELETE') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	if (!(await requireAdmin(request, response, 'You do not have permission to delete products.'))) return;

	try {
		const { id } = request.body || {};

		if (typeof id !== 'string' || !id.trim()) {
			return response.status(400).json({
				success: false,
				message: 'Valid product ID is required.',
			});
		}

		const productRef = db.collection('customProducts').doc(id.trim());
		const productDoc = await productRef.get();

		if (!productDoc.exists) {
			return response.status(404).json({
				success: false,
				message: 'Product not found.',
			});
		}

		await productRef.delete();

		return response.status(200).json({
			success: true,
			message: 'Product deleted successfully.',
			productId: id.trim(),
		});
	} catch (error) {
		console.error('deleteCustomProduct failed:', error.message);

		return response.status(500).json({
			success: false,
			message: 'Could not delete product.',
		});
	}
});

// ************************************
async function fetchActivityPage(request, userId = null) {
	const pageSize = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 20, 1), 50);

	let query = db.collection('userActivity');

	if (userId) {
		query = query.where('userId', '==', userId);
	}

	query = query.orderBy('createdAt', 'desc');

	const cursor = request.query.cursor;

	if (cursor) {
		if (typeof cursor !== 'string') {
			throw Object.assign(new Error('Invalid pagination cursor.'), {
				status: 400,
			});
		}

		const cursorDoc = await db.collection('userActivity').doc(cursor).get();

		if (!cursorDoc.exists || (userId && cursorDoc.data().userId !== userId)) {
			throw Object.assign(new Error('Invalid pagination cursor.'), {
				status: 400,
			});
		}

		query = query.startAfter(cursorDoc);
	}

	const snapshot = await query.limit(pageSize + 1).get();

	const hasMore = snapshot.docs.length > pageSize;
	const pageDocs = snapshot.docs.slice(0, pageSize);

	return {
		activities: pageDocs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		})),
		nextCursor: hasMore ? pageDocs[pageDocs.length - 1].id : null,
	};
}

export const getAllUserActivities = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	try {
		await verifyAdminOrOwner(request);

		const result = await fetchActivityPage(request);

		return response.status(200).json({
			success: true,
			...result,
		});
	} catch (error) {
		console.error('getAllUserActivities failed:', error);

		const status = error.status || (error.message === 'Access denied.' ? 403 : 500);

		return response.status(status).json({
			success: false,
			message: error.message || 'Could not load activities.',
		});
	}
});

export const getUserActivities = onRequest({ secrets: [CLERK_JWT_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	try {
		await verifyAdminOrOwner(request);

		const userId = request.query.userId;

		if (typeof userId !== 'string' || !userId.trim()) {
			return response.status(400).json({
				success: false,
				message: 'A valid userId is required.',
			});
		}

		const result = await fetchActivityPage(request, userId);

		return response.status(200).json({
			success: true,
			userId,
			...result,
		});
	} catch (error) {
		console.error('getUserActivities failed:', error);

		const status = error.status || (error.message === 'Access denied.' ? 403 : 500);

		return response.status(status).json({
			success: false,
			message: error.message || 'Could not load user activities.',
		});
	}
});

/* ------------------------------------------------------------------ */
/*  Owner: delivered orders revenue                                    */
/* ------------------------------------------------------------------ */

export const getOwnerDeliveredRevenue = onRequest({ secrets: [CLERK_JWT_KEY, CLERK_SECRET_KEY] }, async (request, response) => {
	setCartCors(request, response);

	if (request.method === 'OPTIONS') {
		return response.status(204).send('');
	}

	if (request.method !== 'GET') {
		return response.status(405).json({
			success: false,
			message: 'Method not allowed.',
		});
	}

	try {
		const userId = await verifyClerkUser(request);
		const ownerId = process.env.OWNER_CLERK_USER_ID;

		if (!ownerId || userId !== ownerId) {
			return response.status(403).json({
				success: false,
				message: 'You do not have permission to access owner revenue data.',
			});
		}

		const snapshot = await db.collection('orders').where('status', '==', 'delivered').get();

		let totalDeliveredRevenue = 0;
		const deliveredOrders = [];

		for (const doc of snapshot.docs) {
			const data = doc.data();

			if (String(data.status || '').toLowerCase().trim() !== 'delivered') {
				continue;
			}

			const rawPrice = data.totalPrice;
			const price = typeof rawPrice === 'number' ? rawPrice : Number.parseFloat(rawPrice);
			const validPrice = Number.isFinite(price) && price >= 0 ? price : 0;

			totalDeliveredRevenue += validPrice;

			deliveredOrders.push({
				...data,
				orderId: doc.id,
				totalPrice: validPrice,
			});
		}

		// Enrich with customer details from Clerk (best effort).
		const userIds = [...new Set(deliveredOrders.map((order) => order.userId).filter(Boolean))];
		const usersMap = new Map();
		const secretKey = process.env.CLERK_SECRET_KEY;

		if (secretKey && userIds.length > 0) {
			try {
				const clerk = createClerkClient({
					secretKey: secretKey.trim(),
				});

				const batchSize = 100;

				for (let i = 0; i < userIds.length; i += batchSize) {
					const batch = userIds.slice(i, i + batchSize);

					const { data: clerkUsers } = await clerk.users.getUserList({
						userId: batch,
						limit: batch.length,
					});

					for (const user of clerkUsers) {
						const primaryEmail = user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses?.[0]?.emailAddress || 'No email';

						usersMap.set(user.id, {
							name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed User',
							email: primaryEmail,
							imageUrl: user.imageUrl || null,
						});
					}
				}
			} catch (error) {
				console.error('Could not fetch customers for revenue:', error.message);
			}
		}

		const orders = deliveredOrders.map((order) => {
			const clerkUser = usersMap.get(order.userId);

			return {
				...order,
				customer: {
					name: order.customer?.name || clerkUser?.name || 'Unknown Customer',
					email: order.customer?.email || clerkUser?.email || 'No email',
					imageUrl: order.customer?.imageUrl || clerkUser?.imageUrl || null,
				},
			};
		});

		const getTimestamp = (value) => {
			if (!value) return 0;
			if (typeof value.toDate === 'function') return value.toDate().getTime();
			if (typeof value.seconds === 'number') return value.seconds * 1000;
			if (typeof value._seconds === 'number') return value._seconds * 1000;

			const date = new Date(value);

			return Number.isNaN(date.getTime()) ? 0 : date.getTime();
		};

		orders.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));

		return response.status(200).json({
			success: true,
			totalDeliveredRevenue: Math.round(totalDeliveredRevenue * 100) / 100,
			totalDeliveredOrders: orders.length,
			orders,
		});
	} catch (error) {
		console.error('getOwnerDeliveredRevenue failed:', error.message);

		const status = error.status || 500;

		return response.status(status).json({
			success: false,
			message: status === 500 ? 'Could not retrieve delivered orders revenue.' : error.message,
		});
	}
});
