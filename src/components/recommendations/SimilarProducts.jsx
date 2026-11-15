import { useMemo } from 'react';
import ProductCarousel from './ProductCarousel';
import { getSimilarProducts } from '../../utils/recommendations';

const SimilarProducts = ({ currentProduct, catalog }) => {
	const products = useMemo(() => getSimilarProducts(currentProduct, catalog), [currentProduct, catalog]);

	return (
		<ProductCarousel
			title='Similar Products'
			products={products}
		/>
	);
};

export default SimilarProducts;
