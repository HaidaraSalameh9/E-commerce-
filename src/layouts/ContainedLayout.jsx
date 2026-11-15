import { Outlet, useLocation } from 'react-router';

// The current look, moved here unchanged: pages sit inside the gray rounded panel.
// Every route lives here today. Pages that are redesigned for full-bleed move to BleedLayout.
const ContainedLayout = () => {
	const { pathname } = useLocation();
	const isAdmin = pathname.startsWith('/admin/activity');
	return (
		<div className='px-4'>
			<div className={`min-h-[72vh] ${!isAdmin ? 'mt-30' : ''} pt-2 px-4 pb-5 container mx-auto bg-gray-100 rounded`}>
				<Outlet />
			</div>
		</div>
	);
};

export default ContainedLayout;
