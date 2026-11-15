import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../app/features/allProductSlice';
import { getCustomProducts } from '../services/productService';

/**
 * Loads the two product sources ONCE for the whole homepage.
 * Call it a single time (in Home) and pass the results down as props.
 *
 *  • Firebase custom products → fetched once on mount, kept in local state.
 *  • DummyJSON products       → already in Redux (state.allProducts). A request is made only
 *                               if the slice is empty and idle; otherwise the existing data
 *                               is reused. Pass { dummyJson: false } to skip it entirely.
 *
 * Each source has its own loading/error, so one failing never hides the other.
 * Nothing refetches on its own: retries only happen when the visitor asks.
 */
const useCatalog = ({ dummyJson: useDummyJson = true } = {}) => {
	const dispatch = useDispatch();

	/* ---------------------------- DummyJSON (Redux) ---------------------------- */
	const { loading, error, products = [] } = useSelector((state) => state.allProducts);

	const requestedDummyJson = useRef(false);

	useEffect(() => {
		if (!useDummyJson || requestedDummyJson.current) return;
		requestedDummyJson.current = true;

		if (products.length === 0 && !loading) {
			dispatch(fetchProducts());
		}
	}, [useDummyJson, dispatch, products.length, loading]);

	const retryDummyJson = useCallback(() => {
		dispatch(fetchProducts());
	}, [dispatch]);

	/* ------------------------------- Firebase --------------------------------- */
	const [custom, setCustom] = useState({ products: [], loading: true, error: false });

	const loadCustom = useCallback(async () => {
		try {
			const data = await getCustomProducts();
			setCustom({ products: Array.isArray(data) ? data : [], loading: false, error: false });
		} catch (err) {
			console.error('Failed to load Firebase products:', err);
			setCustom((prev) => ({ ...prev, loading: false, error: true }));
		}
	}, []);

	const requestedCustom = useRef(false);

	useEffect(() => {
		if (requestedCustom.current) return;
		requestedCustom.current = true;
		loadCustom();
	}, [loadCustom]);

	const retryCustom = useCallback(() => {
		setCustom((prev) => ({ ...prev, loading: true, error: false }));
		loadCustom();
	}, [loadCustom]);

	return useMemo(() => ({ dummyJson: { products, loading, error }, custom, retryDummyJson, retryCustom }), [products, loading, error, custom, retryDummyJson, retryCustom]);
};

export default useCatalog;
