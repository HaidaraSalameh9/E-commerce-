import { useMemo } from 'react';
import Hero from '../components/Hero';
import Actual from '../components/Actual';
import TrustedBrand from '../components/TrustedBrand';
import NewArrivals from '../components/NewArrivals';
import TopProducts from '../components/TopProducts';
import useCatalog from '../hooks/useCatalog';
import { selectNewArrivals } from '../utils/catalogSelectors';

const Home = () => {
	// One load for the whole page. DummyJSON is switched on when Best Rated is added.
	const { custom, retryCustom } = useCatalog({ dummyJson: false });

	const newArrivals = useMemo(() => selectNewArrivals(custom.products), [custom.products]);

	return (
		<>
			<Hero />
			<Actual />
			<TrustedBrand />
			<NewArrivals
				items={newArrivals}
				loading={custom.loading}
				error={custom.error}
				onRetry={retryCustom}
			/>
			<TopProducts />
		</>
	);
};

export default Home;
