import logo_1 from '../assets/logo-1.png';
import logo_2 from '../assets/logo-2.png';
import logo_3 from '../assets/logo-3.png';
import logo_4 from '../assets/logo-4.png';

/* -------------------------------------------------------------------------- */
/*  Brands                                                                    */
/*                                                                            */
/*  The old list had five entries but only four images: logo_3 appeared twice */
/*  (entries "2" and "5"), and the entry names did not match their images     */
/*  ("2" → logo-3, "3" → logo-2). That looks like padding to make the marquee */
/*  longer, not a fifth brand — and the loop already repeats every logo — so   */
/*  each real logo is listed once here, in the order it first appeared.       */
/*  Add `name` to give a logo proper alt text; until then logos are           */
/*  treated as decorative.                                                    */
/* -------------------------------------------------------------------------- */

const BRANDS = [
	{ key: 'logo-1', logo: logo_1 },
	{ key: 'logo-3', logo: logo_3 },
	{ key: 'logo-2', logo: logo_2 },
	{ key: 'logo-4', logo: logo_4 },
];

// With only four logos, one pass is shorter than a wide screen. Each marquee
// group therefore holds the set twice, and a group is never narrower than the
// container (min-w-full), so the loop can't open a gap on any screen size.
const REPEAT = 2;

/* -------------------------------------------------------------------------- */
/*  One marquee group — two identical copies sit side by side. Both animate    */
/*  by their own width + the gap, which makes the loop seamless.              */
/* -------------------------------------------------------------------------- */

const MarqueeGroup = ({ hidden = false }) => (
	<ul
		aria-hidden={hidden || undefined}
		className='flex min-w-full shrink-0 animate-marquee items-center justify-around gap-[var(--marquee-gap)] group-hover:[animation-play-state:paused] motion-reduce:animate-none'>
		{Array.from({ length: REPEAT }).flatMap((_, set) =>
			BRANDS.map((brand) => (
				<li
					key={`${set}-${brand.key}`}
					className='flex shrink-0 items-center gap-[var(--marquee-gap)]'>
					<img
						src={brand.logo}
						alt={brand.name || ''}
						loading='lazy'
						decoding='async'
						draggable={false}
						className='h-10 w-auto max-w-[8rem] object-contain mix-blend-multiply transition-all duration-500 ease-soft hover:-translate-y-0.5 hover:scale-105 sm:h-12 sm:max-w-[10rem] lg:h-14 [@media(hover:hover)]:opacity-55 [@media(hover:hover)]:grayscale [@media(hover:hover)]:hover:opacity-100 [@media(hover:hover)]:hover:grayscale-0'
					/>
					<span
						aria-hidden='true'
						className='h-1.5 w-1.5 shrink-0 rotate-45 bg-brass-400/70'
					/>
				</li>
			)),
		)}
	</ul>
);

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export const TrustedBrand = () => {
	return (
		<section
			aria-labelledby='trusted-brands-title'
			className='bg-paper pb-20 text-charcoal sm:pb-28'>
			<div className='mx-auto max-w-6xl px-4 sm:px-6'>
				<div className='relative overflow-hidden rounded-card bg-white shadow-card ring-1 ring-stone-200 lg:flex lg:items-stretch'>
					{/* quiet brass glow in the corner */}
					<div
						aria-hidden='true'
						className='pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full'
						style={{ background: 'radial-gradient(circle, rgba(251,191,36,.18), transparent 70%)' }}
					/>

					{/* heading */}
					<div className='relative flex flex-col justify-center gap-4 px-6 pb-2 pt-8 sm:px-8 lg:w-72 lg:shrink-0 lg:border-r lg:border-dashed lg:border-stone-300 lg:py-10'>
						<h2
							id='trusted-brands-title'
							className='font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl'>
							Trusted
							<br />
							brands
						</h2>
						<span
							aria-hidden='true'
							className='block h-0.5 w-8 rounded-full bg-brass-500'
						/>
					</div>

					{/* marquee — pauses on hover, stops entirely for reduced motion */}
					<div className='relative min-w-0 flex-1 py-8 lg:py-10'>
						<div className='group flex gap-[var(--marquee-gap)] overflow-hidden [--marquee-duration:30s] [--marquee-gap:3.5rem] [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)] sm:[--marquee-gap:5rem] md:[--marquee-duration:45s]'>
							<MarqueeGroup />
							<MarqueeGroup hidden />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default TrustedBrand;
