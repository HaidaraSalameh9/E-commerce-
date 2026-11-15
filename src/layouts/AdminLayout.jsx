import { Outlet } from 'react-router';

// Admin/Owner dashboards (sidebar-driven pages like AdminActivity) own their full width and
// build their own fixed sidebar — they must NOT sit inside ContainedLayout's gray boxed panel,
// since `position: fixed` ignores a parent's padding/margin entirely and would make a sidebar
// dock to the true top of the viewport, overlapping the fixed Navbar above it.
// Contract for pages rendered here, same spirit as BleedLayout:
//   • pages own their width — a page without its own sidebar (e.g. AdminProducts) should wrap
//     its content in its own `mx-auto max-w-* px-4` container
//   • a page's own fixed sidebar should be positioned with `top-nav` (not `inset-y-0`/`top-0`)
//     so it starts below the fixed Navbar instead of covering it
const AdminLayout = () => {
	return (
		<div className='min-h-screen bg-paper text-charcoal'>
			<Outlet />
		</div>
	);
};

export default AdminLayout;
