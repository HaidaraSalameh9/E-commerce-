import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@clerk/react';
import { useRole } from '../context/RoleContext';

const ProtectedRoute = ({ allowedRoles }) => {
	const { isLoaded, isSignedIn } = useAuth();
	const { role, loading, error } = useRole();

	if (!isLoaded) {
		return <p className='p-6 text-center text-stone-500'>Checking permissions...</p>;
	}

	// Signed-out visitors are redirected straight away: waiting for the role
	// request to settle left guests on a blank "Checking permissions..." page.
	if (!isSignedIn) {
		return <Navigate to='/' replace />;
	}

	if (loading) {
		return <p className='p-6 text-center text-stone-500'>Checking permissions...</p>;
	}

	if (error) {
		return <p className='p-6 text-center text-red-600'>Could not verify your permissions. Please try again.</p>;
	}

	if (!allowedRoles.includes(role)) {
		return (
			<Navigate
				to='/'
				replace
			/>
		);
	}

	return <Outlet />;
};

export default ProtectedRoute;
