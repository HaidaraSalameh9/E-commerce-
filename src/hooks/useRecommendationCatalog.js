import { useEffect, useMemo, useState } from 'react';
import { dedupeProducts } from '../utils/recommendations';

async function loadDummyJsonProducts() {
	const firstResponse = await fetch('https://dummyjson.com/products?limit=0');

	if (!firstResponse.ok) {
		throw new Error('Could not load products.');
	}

	const firstData = await firstResponse.json();
	let products = Array.isArray(firstData?.products) ? firstData.products : [];
	const total = Number(firstData?.total);

	if (Number.isFinite(total) && total > products.length) {
		const fullResponse = await fetch(`https://dummyjson.com/products?limit=${total}`);

		if (fullResponse.ok) {
			const fullData = await fullResponse.json();
			if (Array.isArray(fullData?.products) && fullData.products.length >= products.length) {
				products = fullData.products;
			}
		}
	}

	return products;
}

export default function useRecommendationCatalog(customProducts = []) {
	const [dummyProducts, setDummyProducts] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		loadDummyJsonProducts()
			.then((products) => {
				if (!cancelled) setDummyProducts(products);
			})
			.catch(() => {
				if (!cancelled) setDummyProducts([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const products = useMemo(() => dedupeProducts([...(Array.isArray(dummyProducts) ? dummyProducts : []), ...(Array.isArray(customProducts) ? customProducts : [])]), [dummyProducts, customProducts]);

	return { products, loading };
}
