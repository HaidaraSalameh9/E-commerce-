import { createContext, useContext, useEffect, useState } from 'react';

import { useAuth, useUser } from '@clerk/react';
import { getMyRole } from '../services/userRoleService';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
	const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
	const { isLoaded: userLoaded } = useUser();

	const [role, setRole] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let cancelled = false;

		async function loadRole() {
			if (!authLoaded || !userLoaded) return;

			if (!isSignedIn) {
				setRole(null);
				setError('');
				setLoading(false);
				return;
			}

			setLoading(true);
			setError('');

			try {
				const currentRole = await getMyRole(getToken);

				if (!['owner', 'admin', 'user'].includes(currentRole)) {
					throw new Error('Unknown user role.');
				}

				if (!cancelled) setRole(currentRole);
			} catch (err) {
				if (!cancelled) {
					setRole(null);
					setError(err.message || 'Could not load user role.');
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		loadRole();

		return () => {
			cancelled = true;
		};
	}, [authLoaded, userLoaded, isSignedIn, getToken]);

	return <RoleContext.Provider value={{ role, loading, error }}>{children}</RoleContext.Provider>;
}

export function useRole() {
	const context = useContext(RoleContext);

	if (!context) {
		throw new Error('useRole must be used inside RoleProvider.');
	}

	return context;
}
