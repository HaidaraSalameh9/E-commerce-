import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'admin:sidebar-collapsed';
const MOBILE_QUERY = '(max-width: 1023.5px)';

/**
 * Desktop "collapsed" (icon rail) state is persisted in localStorage, so it
 * survives navigating between Admin pages, each of which mounts its own
 * instance of the sidebar. Mobile "open" state is per-page and never
 * persisted — a drawer should always start closed on a fresh page load.
 *
 * Fixes vs. the previous version (same API, same storage key — every
 * page that already uses this hook keeps working unchanged):
 *  1. Escape closes the mobile drawer.
 *  2. Body scroll locks while the drawer is open, so the page behind
 *     it cannot scroll.
 *  3. Resizing up to desktop auto-closes the drawer, so the backdrop
 *     can never linger after the desktop rail takes over.
 */
const useSidebarState = () => {
	const [collapsed, setCollapsed] = useState(() => {
		try {
			return localStorage.getItem(STORAGE_KEY) === '1';
		} catch {
			return false;
		}
	});

	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
		} catch {
			/* storage unavailable (private browsing, etc.) — state still works for this session */
		}
	}, [collapsed]);

	// One control serves both: a real toggle button in the header decides what it means
	// to "toggle the sidebar" based on the current breakpoint.
	const toggle = useCallback(() => {
		const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
		if (isDesktop) {
			setCollapsed((prev) => !prev);
		} else {
			setMobileOpen((prev) => !prev);
		}
	}, []);

	const closeMobile = useCallback(() => setMobileOpen(false), []);

	// If the viewport grows to desktop while the drawer is open, drop it:
	// the desktop rail takes over and the backdrop must not linger.
	useEffect(() => {
		const mq = window.matchMedia(MOBILE_QUERY);
		const onChange = (e) => {
			if (!e.matches) setMobileOpen(false);
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);

	// Escape closes the drawer. Body scroll is locked while it is open.
	useEffect(() => {
		if (!mobileOpen) return undefined;
		const onKey = (e) => {
			if (e.key === 'Escape') setMobileOpen(false);
		};
		document.addEventListener('keydown', onKey);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = previousOverflow;
		};
	}, [mobileOpen]);

	return { collapsed, mobileOpen, toggle, closeMobile };
};

export default useSidebarState;
