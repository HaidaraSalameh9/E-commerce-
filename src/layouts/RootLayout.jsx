import { Outlet, useLocation } from 'react-router';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollButtons from '../components/ScrollButtons';
import BackendAuthTest from '../components/BackendAuthTest';

// Everything that appears on every page. Pages render where <Outlet /> is.
// The Navbar is position:fixed, so it does not take part in the page flow.
const RootLayout = () => {
	const { pathname } = useLocation();
	const isAdmin = pathname.startsWith('/admin/activity');
	return (
		<>
			{!isAdmin && <Navbar />}

			<Outlet />

			<div className='px-4'>
				<div className='mb-4'>
					<BackendAuthTest />
				</div>
				<Footer />

				<ScrollButtons />
			</div>
		</>
	);
};

export default RootLayout;
