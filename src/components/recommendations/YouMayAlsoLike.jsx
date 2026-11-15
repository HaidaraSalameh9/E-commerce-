import { useMemo } from 'react';
import ProductCarousel from './ProductCarousel';
import { getSimilarProducts, getYouMayAlsoLike } from '../../utils/recommendations';

const YouMayAlsoLike = ({ currentProduct, catalog }) => {
	const products = useMemo(() => {
		const similarProducts = getSimilarProducts(currentProduct, catalog);
		return getYouMayAlsoLike(currentProduct, catalog, similarProducts);
	}, [currentProduct, catalog]);

	return (
		<ProductCarousel
			title='You May Also Like'
			products={products}
		/>
	);
};

export default YouMayAlsoLike;
