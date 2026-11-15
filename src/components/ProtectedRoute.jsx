import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@clerk/react';
import { useRole } from '../context/RoleContext';

const ProtectedRoute = ({ allowedRoles }) => {
	const { isLoaded, isSignedIn } = useAuth();
	const { role, loading, error } = useRole();

	if (!isLoaded || loading) {
		return <p className='p-6 text-center'>Checking permissions...</p>;
	}

	if (!isSignedIn) {
		return (
			<Navigate
				to='/'
				replace
			/>
		);
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
