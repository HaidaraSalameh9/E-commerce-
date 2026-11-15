import SimilarProducts from './SimilarProducts';
import YouMayAlsoLike from './YouMayAlsoLike';
import useRecommendationCatalog from '../../hooks/useRecommendationCatalog';

const ProductRecommendations = ({ currentProduct, customProducts }) => {
	const { products: catalog, loading } = useRecommendationCatalog(customProducts);
	const hasCatalog = catalog.length > 0;

	if (!currentProduct || (loading && !hasCatalog)) {
		return null;
	}

	return (
		<div className='mt-14 space-y-12'>
			<SimilarProducts
				currentProduct={currentProduct}
				catalog={catalog}
			/>
			<YouMayAlsoLike
				currentProduct={currentProduct}
				catalog={catalog}
			/>
		</div>
	);
};

export default ProductRecommendations;
