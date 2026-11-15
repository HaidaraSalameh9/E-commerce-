import { useState } from 'react';
import { FaCheck, FaBox, FaTruck, FaClipboardCheck, FaTimesCircle } from 'react-icons/fa';
import { cancelUserOrder } from '../../services/ordersService';

const steps = [
	{
		status: 'pending',
		title: 'Order Placed',
		description: 'Your order has been received.',
		icon: FaClipboardCheck,
	},
	{
		status: 'processing',
		title: 'Processing',
		description: 'Your order is being prepared.',
		icon: FaBox,
	},
	{
		status: 'shipped',
		title: 'Shipped',
		description: 'Your package is on its way.',
		icon: FaTruck,
	},
	{
		status: 'delivered',
		title: 'Delivered',
		description: 'Your order has been delivered.',
		icon: FaCheck,
	},
];

const OrderTracking = ({ order, getToken, onOrderUpdated }) => {
	const [showModal, setShowModal] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const [error, setError] = useState('');

	const currentStatus = order.status || 'pending';

	const currentIndex = steps.findIndex((step) => step.status === currentStatus);

	const canCancel = ['pending', 'processing'].includes(currentStatus);

	const handleCancel = async () => {
		try {
			setIsCancelling(true);
			setError('');

			const result = await cancelUserOrder(order.orderId, getToken);

			onOrderUpdated({
				...order,
				status: result.status,
				cancelledAt: result.cancelledAt,
				cancelledBy: order.userId,
				updatedAt: result.cancelledAt,
			});

			setShowModal(false);
		} catch (err) {
			setError(err.message || 'Something went wrong.');
		} finally {
			setIsCancelling(false);
		}
	};

	return (
		<section className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h3 className='text-xl font-bold text-gray-900'>Order Tracking</h3>
					<p className='text-sm text-gray-500 mt-1'>Follow your order progress.</p>
				</div>

				<span
					className={`px-4 py-2 rounded-full text-sm font-semibold capitalize
                    ${currentStatus === 'cancelled' ? 'bg-red-100 text-red-700' : currentStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
					{currentStatus}
				</span>
			</div>

			{currentStatus === 'cancelled' ? (
				<div className='rounded-xl bg-red-50 border border-red-100 p-6 text-center space-y-3'>
					<FaTimesCircle className='text-red-500 text-4xl mx-auto' />

					<h4 className='text-lg font-bold text-red-700'>Order Cancelled</h4>

					<p className='text-sm text-red-600'>This order has been cancelled successfully.</p>

					{order.cancelledAt && <p className='text-xs text-red-500'>Cancelled on: {new Date(order.cancelledAt).toLocaleString()}</p>}
				</div>
			) : (
				<>
					<div className='relative'>
						<div className='absolute left-5 top-6 bottom-6 w-0.5 bg-gray-200' />

						<div className='space-y-7 relative'>
							{steps.map((step, index) => {
								const Icon = step.icon;
								const completed = index <= currentIndex;
								const active = index === currentIndex;

								return (
									<div
										key={step.status}
										className='flex items-start gap-4'>
										<div
											className={`relative z-10 w-10 h-10 shrink-0 rounded-full flex items-center justify-center
                                            ${completed ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
											{index < currentIndex ? <FaCheck /> : <Icon />}
										</div>

										<div className='flex-1 pt-1'>
											<div className='flex items-center justify-between gap-2'>
												<h4
													className={`font-semibold
                                                    ${active ? 'text-gray-900' : completed ? 'text-gray-700' : 'text-gray-400'}`}>
													{step.title}
												</h4>

												{active && <span className='text-xs font-semibold text-blue-600'>Current</span>}

												{index < currentIndex && <span className='text-xs text-green-600 font-medium'>Completed</span>}
											</div>

											<p className='text-sm text-gray-500 mt-1'>{step.description}</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{canCancel && (
						<div className='border-t border-gray-100 pt-5'>
							<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
								<div>
									<h4 className='font-semibold text-gray-900'>Want to cancel your order?</h4>
									<p className='text-sm text-gray-500 mt-1'>You can cancel before your order is shipped.</p>
								</div>

								<button
									onClick={() => {
										setError('');
										setShowModal(true);
									}}
									className='px-5 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition'>
									Cancel Order
								</button>
							</div>
						</div>
					)}
				</>
			)}

			{showModal && (
				<div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
					<div className='bg-white rounded-2xl w-full max-w-md p-6 shadow-xl'>
						<div className='w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4'>
							<FaTimesCircle className='text-2xl' />
						</div>

						<h3 className='text-xl font-bold text-gray-900'>Cancel this order?</h3>

						<p className='text-gray-500 text-sm mt-2'>Are you sure you want to cancel this order? This action cannot be undone.</p>

						{error && <p className='text-sm text-red-600 bg-red-50 p-3 rounded-lg mt-4'>{error}</p>}

						<div className='flex gap-3 mt-6'>
							<button
								disabled={isCancelling}
								onClick={() => setShowModal(false)}
								className='flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold disabled:opacity-50'>
								Keep Order
							</button>

							<button
								disabled={isCancelling}
								onClick={handleCancel}
								className='flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50'>
								{isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
};

export default OrderTracking;
