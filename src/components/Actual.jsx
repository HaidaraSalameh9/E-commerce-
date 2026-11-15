import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { LuArrowUpRight } from 'react-icons/lu';
import actual_1 from '../assets/actual-1.png';
import actual_2 from '../assets/actual-2.png';
import actual_3 from '../assets/actual-3.png';
import actual_4 from '../assets/actual-4.png';

/* -------------------------------------------------------------------------- */
/*  Collections                                                               */
/*                                                                            */
/*  `to`  – There are no collection-specific routes in the app yet, so every   */
/*          tile points at the existing catalog page. Replace per item once   */
/*          real destinations exist.                                          */
/*  `fit` – 'contain' keeps the whole picture visible and lets it stand on    */
/*          the dark stage (right for cut-outs). Use 'cover' for a full-bleed */
/*          photograph.                                                       */
/*  `area`– Placement: a compact 2-column mosaic below lg, and an asymmetric  */
/*          12-column editorial mosaic from lg up (bottoms align, tops are    */
/*          staggered, the heading sits in the notch above Men).              */
/* -------------------------------------------------------------------------- */

const CATALOG = '/products';

const COLLECTIONS = [
	{
		key: 'women',
		title: 'Women',
		image: actual_1,
		to: CATALOG,
		fit: 'contain',
		big: true,
		area: 'col-span-2 aspect-[16/11] lg:col-span-5 lg:col-start-1 lg:row-span-13 lg:row-start-1 lg:aspect-auto',
	},
	{
		key: 'accessories',
		title: 'Accessories',
		image: actual_2,
		to: CATALOG,
		fit: 'contain',
		big: false,
		area: 'aspect-[4/5] lg:col-span-3 lg:col-start-10 lg:row-span-6 lg:row-start-1 lg:aspect-auto',
	},
	{
		key: 'kids',
		title: 'Kids',
		image: actual_3,
		to: CATALOG,
		fit: 'contain',
		big: false,
		area: 'aspect-[4/5] lg:col-span-3 lg:col-start-10 lg:row-span-7 lg:row-start-7 lg:aspect-auto',
	},
	{
		key: 'men',
		title: 'Men',
		image: actual_4,
		to: CATALOG,
		fit: 'contain',
		big: true,
		area: 'col-span-2 aspect-[16/11] lg:col-span-4 lg:col-start-6 lg:row-span-10 lg:row-start-4 lg:aspect-auto',
	},
];

/* -------------------------------------------------------------------------- */
/*  Reveal once when the mosaic scrolls into view                             */
/* -------------------------------------------------------------------------- */

const useInView = () => {
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
			{ threshold: 0.12 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [inView]);

	return [ref, inView];
};

/* -------------------------------------------------------------------------- */
/*  One collection tile                                                       */
/* -------------------------------------------------------------------------- */

const CollectionTile = ({ item, index, inView }) => (
	// The wrapper owns the grid placement and the one-time reveal, so the reveal's
	// transition delay never slows the hover effects on the link inside.
	<div
		className={`${item.area} transition-[clip-path,opacity] duration-1000 ease-soft ${inView ? 'opacity-100 [clip-path:inset(-3rem)]' : 'opacity-0 [clip-path:inset(100%_0_0_0)]'}`}
		style={{ transitionDelay: inView ? `${index * 130}ms` : '0ms' }}>
		<Link
			to={item.to}
			className='group relative isolate block h-full w-full overflow-hidden rounded-card bg-ink shadow-card ring-1 ring-black/5 transition-[transform,box-shadow] duration-500 ease-soft hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-500'>
			{/* stage */}
			<span className='absolute inset-0 bg-gradient-to-br from-graphite via-charcoal to-ink' />
			<span
				className='absolute inset-0 opacity-70 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100'
				style={{ background: 'radial-gradient(65% 55% at 50% 85%, rgba(251,191,36,.28), transparent 70%)' }}
			/>

			{/* image: slightly muted on pointer devices, full colour on hover/focus */}
			<img
				src={item.image}
				alt=''
				loading='lazy'
				decoding='async'
				draggable={false}
				className={`absolute inset-0 h-full w-full origin-bottom transition-all duration-[900ms] ease-soft group-hover:scale-[1.06] group-focus-visible:scale-[1.06] [@media(hover:hover)]:saturate-[.6] [@media(hover:hover)]:group-hover:saturate-100 [@media(hover:hover)]:group-focus-visible:saturate-100 ${item.fit === 'cover' ? 'object-cover' : 'object-contain object-bottom'}`}
				style={item.fit === 'cover' ? undefined : { filter: 'drop-shadow(0 24px 24px rgba(0,0,0,.45))' }}
			/>

			{/* readability: a soft shade that only covers the lower part */}
			<span className='absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent' />

			{/* title + arrow */}
			<span className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6'>
				<span className='min-w-0 transition-transform duration-500 ease-soft group-hover:-translate-y-1'>
					<span className={`block font-display font-bold leading-none tracking-tight text-white ${item.big ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl'}`}>{item.title}</span>
					<span className='mt-2 block text-sm text-stone-300'>Collection</span>
					<span className='mt-3 block h-0.5 w-6 rounded-full bg-brass-400 transition-all duration-500 ease-soft group-hover:w-14' />
				</span>

				<span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur transition-all duration-500 ease-soft group-hover:bg-brass-400 group-hover:text-ink group-hover:ring-brass-400 group-focus-visible:bg-brass-400 group-focus-visible:text-ink'>
					<LuArrowUpRight className='text-xl transition-transform duration-500 ease-soft group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
				</span>
			</span>
		</Link>
	</div>
);

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

const Actual = () => {
	const [ref, inView] = useInView();

	return (
		<section
			aria-labelledby='actual-title'
			className='bg-paper py-20 text-charcoal sm:py-28'>
			<div className='mx-auto max-w-6xl px-4 sm:px-6'>
				<div
					ref={ref}
					className='grid grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[2.25rem] lg:grid-cols-12'>
					{/* Heading: its own row on small screens, tucked into the notch above Men on large ones */}
					<div className='col-span-2 mb-3 lg:col-span-4 lg:col-start-6 lg:row-span-3 lg:row-start-1 lg:mb-0 lg:self-end'>
						<h2
							id='actual-title'
							className='font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl'>
							Actual
							<br />
							Collection
						</h2>
						<p className='mt-4 flex items-center gap-3 text-sm text-stone-500'>
							<span
								aria-hidden='true'
								className='h-0.5 w-8 rounded-full bg-brass-500'
							/>
							{COLLECTIONS.length} collections
						</p>
					</div>

					{COLLECTIONS.map((item, index) => (
						<CollectionTile
							key={item.key}
							item={item}
							index={index}
							inView={inView}
						/>
					))}
				</div>
			</div>
		</section>
	);
};

export default Actual;
