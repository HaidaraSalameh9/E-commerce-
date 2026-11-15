import { useEffect, useRef, useState } from 'react';

// True once the element has scrolled into view (and stays true). Without
// IntersectionObserver support everything is simply shown.
const useInView = (threshold = 0.12) => {
	const ref = useRef(null);
	const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

	useEffect(() => {
		const el = ref.current;
		if (!el || inView) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ threshold },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [inView, threshold]);

	return [ref, inView];
};

export default useInView;
