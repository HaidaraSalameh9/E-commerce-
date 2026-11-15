import { Outlet } from 'react-router';

// Full-bleed pages. No container, no side padding, no top margin.
// Contract for pages rendered here:
//   • own their width (max-w-6xl mx-auto px-4 sm:px-6 inside each section)
//   • start their first (dark) band at the top of the screen and add `pt-nav`
//     so content clears the fixed Navbar
//   • set their own text color (the body default is white, which is invisible on light surfaces)
const BleedLayout = () => {
	return (
		<div className='bg-paper text-charcoal'>
			<Outlet />
		</div>
	);
};

export default BleedLayout;
