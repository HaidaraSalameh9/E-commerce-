import { Route, Routes } from 'react-router';
import { useLocation } from 'react-router';
import Home from './Page/Home';

import Products from './Page/Products';
import Cart from './Page/Cart';
import ProductDetails from './Page/ProductDetails';
import Contact from './Page/Contact';
import About from './Page/About';
import Checkout from './Page/Checkout';
import OrderConfirm from './Page/OrderConfirm';
import { useState } from 'react';
import Favorite from './Page/Favorite';
import NotFound from './Page/NotFound';
import MyOrders from './Page/MyOrders';
import { RoleProvider } from './context/RoleContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './Page/AdminDashboard';
import AdminOrders from './Page/AdminOrders';
import OwnerDashboard from './Page/OwnerDashboard';
import OwnerUsers from './Page/OwnerUsers';
import OwnerDeliveredRevenue from './Page/OwnerDeliveredRevenue';
import AdminProducts from './Page/AdminProducts';
import AdminActivity from './Page/AdminActivity';
import ActivityUsers from './Page/ActivityUsers';
import ActivityEvents from './Page/ActivityEvents';

import RootLayout from './layouts/RootLayout';
import ContainedLayout from './layouts/ContainedLayout';
import BleedLayout from './layouts/BleedLayout';

import ScrollRestoration from './components/ScrollRestoration';

const App = () => {
	const [order, setOrder] = useState(null);
	const [address, setAddress] = useState('main street, 0012');
	const { pathname } = useLocation();
	const isAdmin = pathname.startsWith('/admin');

	return (
		<RoleProvider>
			<ScrollRestoration />
			<Routes>
				{/* Navbar, Footer, ScrollButtons, BackendAuthTest */}
				<Route element={<RootLayout />}>
					{/* Current look: gray rounded panel. Every existing route stays here for now. */}
					<Route element={<ContainedLayout />}>
						<Route
							path='/favorite'
							element={<Favorite />}
						/>
						<Route
							path='/contact'
							element={<Contact />}
						/>
						<Route
							path='/about'
							element={<About />}
						/>
						<Route
							path='/productDetails/:id'
							element={<ProductDetails />}
						/>
						<Route
							path='/cart'
							element={
								<Cart
									address={address}
									setAddress={setAddress}
								/>
							}
						/>
						<Route
							path='/checkout'
							element={
								<Checkout
									setOrder={setOrder}
									address={address}
								/>
							}
						/>
						<Route
							path='/order-confirmation/:orderId'
							element={<OrderConfirm />}
						/>
						<Route
							path='*'
							element={<NotFound />}
						/>
						<Route element={<ProtectedRoute allowedRoles={['user', 'admin', 'owner']} />}>
							<Route
								path='/my-orders'
								element={<MyOrders />}
							/>
						</Route>

						<Route element={<ProtectedRoute allowedRoles={['admin', 'owner']} />}>
							<Route
								path='/admin'
								element={<AdminDashboard />}
							/>
							<Route
								path='/admin/orders'
								element={<AdminOrders />}
							/>
							<Route
								path='/admin/products'
								element={<AdminProducts />}
							/>
							<Route
								path='/admin/activity'
								element={<AdminActivity />}
							/>
							<Route
								path='/admin/activity/users'
								element={<ActivityUsers />}
							/>
							<Route
								path='/admin/activity/events'
								element={<ActivityEvents />}
							/>
						</Route>
						<Route element={<ProtectedRoute allowedRoles={['owner']} />}>
							<Route
								path='/owner'
								element={<OwnerDashboard />}
							/>
							<Route
								path='/owner/users'
								element={<OwnerUsers />}
							/>
							<Route
								path='/owner/delivered-revenue'
								element={<OwnerDeliveredRevenue />}
							/>
							<Route
								path='/owner/revenue'
								element={<OwnerDeliveredRevenue />}
							/>
							<Route
								path='/admin/products'
								element={<AdminProducts />}
							/>
						</Route>
					</Route>

					{/* Full-bleed pages (added one by one as they are redesigned) */}
					<Route element={<BleedLayout />}>
						<Route
							path='/'
							element={<Home />}
						/>
						<Route
							path='/products'
							element={<Products />}
						/>
					</Route>
				</Route>
			</Routes>
		</RoleProvider>
	);
};

export default App;
