// Cloudflare Worker entry point.
// Paths match the Cloud Functions URL suffixes the frontend already calls, so
// switching hosts only changes VITE_API_BASE_URL.

import { toRequestContext, createResponse } from './http.js';
import { runWithContext, inspectClerkKey } from './runtime.js';
import * as api from './api.js';

const json = (status, body) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});

const HANDLERS = [
	'authCheck',
	'createOrder',
	'getOrder',
	'getMyOrders',
	'cart',
	'getUserFavorites',
	'addUserFavorite',
	'removeUserFavorite',
	'syncUserFavorites',
	'getMyRole',
	'updateUserRole',
	'getAllOrders',
	'updateOrderStatus',
	'cancelOrder',
	'getAllUsers',
	'getCustomProducts',
	'getAdminCustomProducts',
	'createCustomProduct',
	'updateCustomProduct',
	'ArchivedCustomProduct',
	'deleteCustomProduct',
	'getAllUserActivities',
	'getUserActivities',
	'getOwnerDeliveredRevenue',
];

const routes = new Map([['/api', api.api], ...HANDLERS.map((name) => [`/${name}`, api[name]])]);

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname.replace(/\/+$/, '') || '/';
		const handler = routes.get(path);

		if (typeof handler !== 'function') {
			return json(404, { success: false, message: 'Not found' });
		}

		return runWithContext(env, async () => {
			if (path === '/getMyRole') {
				console.log('Clerk key diagnostic:', await inspectClerkKey());
			}
			try {
				const req = await toRequestContext(request);
				const res = createResponse();

				await handler(req, res);

				return res.toResponse();
			} catch (error) {
				console.error('Unhandled worker error:', error.stack || error.message);

				return json(500, { success: false, message: 'Internal server error' });
			}
		});
	},
};
