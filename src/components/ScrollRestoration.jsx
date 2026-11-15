import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router';

const scrollPositions = new Map();

const ScrollRestoration = () => {
	const location = useLocation();

	useLayoutEffect(() => {
		const currentPath = location.pathname;

		// Restore the position belonging to this page only
		const savedPosition = scrollPositions.get(currentPath) ?? 0;

		const frame = requestAnimationFrame(() => {
			window.scrollTo({
				top: savedPosition,
				left: 0,
				behavior: 'smooth',
			});
		});

		// Save this page's own scroll position
		const savePosition = () => {
			scrollPositions.set(currentPath, window.scrollY);
		};

		window.addEventListener('scroll', savePosition, {
			passive: true,
		});

		return () => {
			scrollPositions.set(currentPath, window.scrollY);

			window.removeEventListener('scroll', savePosition);
			cancelAnimationFrame(frame);
		};
	}, [location.pathname]);

	return null;
};

export default ScrollRestoration;
