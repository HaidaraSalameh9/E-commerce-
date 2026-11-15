import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { FaAlignLeft, FaBoxes, FaCheckCircle, FaCloudUploadAlt, FaDollarSign, FaExchangeAlt, FaExclamationCircle, FaImages, FaPercent, FaStar, FaTag, FaTrashAlt, FaTruck } from 'react-icons/fa';
import { getAdminCustomProducts, createCustomProduct, updateCustomProduct, archivedCustomProduct, deleteCustomProduct } from '../services/productService';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRODUCT_FILTERS = [
	{ value: 'all', label: 'All products' },
	{ value: 'active', label: 'Active' },
	{ value: 'out_of_stock', label: 'Out of stock' },
	{ value: 'archived', label: 'Archived' },
];

/* Light pastel badges for the light surfaces; out-of-stock uses the brand brass. */
const STATUS_STYLES = {
	active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
	out_of_stock: 'bg-brass-400/15 text-brass-700 ring-brass-400/30',
	archived: 'bg-stone-100 text-stone-600 ring-stone-200',
};

const STATUS_LABELS = {
	active: 'Active',
	out_of_stock: 'Out of stock',
	archived: 'Archived',
};

const MAX_IMAGES = 5;
const MAX_IMAGE_SIDE = 900; // px – images are resized before saving
const MAX_TOTAL_CHARS = 900000; // keeps the saved product under Firestore's 1 MB limit

const initialForm = {
	title: '',
	description: '',
	price: '',
	discountPercentage: '0',
	rating: '0',
	stock: '',
	category: '',
	brand: '',
	tags: '',
	images: [],
	status: 'active',
	shippingInformation: 'Ships in 3-5 business days',
};

/* Field styles in the site's own language: small-caps labels, stone-50
   inputs, brass focus ring — the same fields as the Contact page. */
const inputClass = 'h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brass-400 focus:bg-white focus:ring-4 focus:ring-brass-400/15';
const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500';

/* Primary action: the brand brass gradient, ink text — the button language
   of the original page and the About CTA. */
const BTN_PRIMARY =
	'flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-6 text-sm font-bold text-ink shadow-sm shadow-brass-500/25 transition duration-300 ease-soft hover:-translate-y-0.5 hover:from-brass-200 hover:to-brass-400 hover:shadow-md hover:shadow-brass-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm';
/* Secondary action: a charcoal pill — the dark button of the Contact page. */
const BTN_GHOST =
	'flex h-12 w-full items-center justify-center rounded-full bg-charcoal px-6 text-sm font-semibold text-white shadow-sm transition duration-300 ease-soft hover:-translate-y-0.5 hover:bg-graphite focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';
const CARD_BTN = 'rounded-full px-3 py-2 text-sm font-semibold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 disabled:cursor-not-allowed disabled:opacity-40';

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

const Req = () => (
	<span
		aria-hidden='true'
		className='ml-1 text-brass-600'>
		*
	</span>
);

// Input with a small leading icon that turns brass while the field has focus
const Adorn = ({ icon: AdornIcon, children }) => (
	<div className='group relative'>
		<span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400 transition-colors duration-300 group-focus-within:text-brass-600'>
			<AdornIcon aria-hidden='true' />
		</span>
		{children}
	</div>
);

/* A section of the single-sheet form: no card chrome of its own, just
   padding and a hairline divider from the sheet. Brass-tinted icon tile,
   ghost numeral in the lightest brass. */
const FormSection = ({ icon: SectionIcon, title, hint, step, children }) => (
	<section className='px-6 py-7 sm:px-8'>
		<div className='mb-5 flex items-start gap-4'>
			<span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brass-400/15 text-lg text-brass-700 ring-1 ring-inset ring-brass-400/30'>
				<SectionIcon aria-hidden='true' />
			</span>
			<div className='min-w-0 flex-1'>
				<h3 className='font-display text-lg font-bold tracking-tight text-stone-950'>{title}</h3>
				{hint && <p className='mt-0.5 text-sm text-stone-500'>{hint}</p>}
			</div>
			{step && (
				<span
					aria-hidden='true'
					className='select-none font-display text-3xl font-bold leading-none text-brass-200'>
					{step}
				</span>
			)}
		</div>
		{children}
	</section>
);

/* Stars as they appear on the dark storefront preview card. */
const Stars = ({ rating }) => {
	const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
	const row = [0, 1, 2, 3, 4].map((i) => (
		<FaStar
			key={i}
			className='shrink-0 text-sm'
		/>
	));

	return (
		<span
			className='relative inline-flex'
			role='img'
			aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
			<span className='flex gap-0.5 text-graphite'>{row}</span>
			<span
				className='absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden text-brass-400'
				style={{ width: `${pct}%` }}>
				{row}
			</span>
		</span>
	);
};

/* Live preview of the form values, styled as the site's own dark product
   card — the way the product will look on the storefront. Purely visual:
   it reads the form state and changes nothing. */
const ProductPreview = ({ form }) => {
	const price = Number(form.price);
	const hasPrice = form.price !== '' && Number.isFinite(price);
	const discount = Number(form.discountPercentage);
	const hasDiscount = Number.isFinite(discount) && discount > 0 && discount < 100;
	const original = hasPrice && hasDiscount ? price / (1 - discount / 100) : null;
	const rating = Number(form.rating);
	const hasRating = form.rating !== '' && Number.isFinite(rating) && rating > 0;
	const stock = Number(form.stock);
	const hasStock = form.stock !== '' && Number.isFinite(stock);
	const cover = form.images[0];

	return (
		<div className='relative overflow-hidden rounded-card bg-ink p-2.5 text-white shadow-float'>
			<div
				className='pointer-events-none absolute inset-0'
				style={{ background: 'radial-gradient(70% 60% at 100% 0%, rgba(251,191,36,.18), transparent 60%)' }}
			/>
			<div
				className='relative aspect-[5/4] overflow-hidden rounded-inner'
				style={{ background: 'radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f5f5f4 50%, #e7e5e4 100%)' }}>
				<div
					className='pointer-events-none absolute inset-0'
					style={{ background: 'radial-gradient(circle at 50% 45%, rgba(251,191,36,.18), transparent 55%)' }}
				/>
				{cover ? (
					<img
						key={cover.slice(-24)}
						src={cover}
						alt='Cover preview'
						className='absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] animate-swap object-contain mix-blend-multiply'
					/>
				) : (
					<div className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone-400'>
						<FaImages
							className='text-3xl'
							aria-hidden='true'
						/>
						<span className='text-xs'>Cover image</span>
					</div>
				)}
				{hasDiscount && <span className='absolute left-3 top-3 rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-3 py-1.5 text-xs font-bold text-ink shadow-lg'>{Math.round(discount)}% off</span>}
			</div>

			<div className='relative space-y-3 p-4'>
				{form.shippingInformation.trim() && <p className='truncate text-xs text-stone-400'>{form.shippingInformation}</p>}
				<h4 className='line-clamp-2 min-h-[2.75rem] break-words font-display text-base font-semibold leading-snug text-white'>{form.title.trim() || 'Product name'}</h4>
				{(form.category.trim() || form.brand.trim()) && (
					<p className='truncate text-xs text-stone-400'>
						{form.category.trim()}
						{form.brand.trim() ? ` · ${form.brand.trim()}` : ''}
					</p>
				)}

				<div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2'>
					{hasRating ? (
						<div className='flex items-center gap-2'>
							<Stars rating={rating} />
							<span className='text-sm font-semibold text-white'>{rating.toFixed(1)}</span>
						</div>
					) : (
						<span />
					)}
					{hasStock && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${stock <= 0 ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30' : 'bg-white/10 text-stone-200 ring-white/15'}`}>{stock <= 0 ? 'Out of stock' : `${stock} in stock`}</span>}
				</div>

				<div className='flex flex-wrap items-baseline gap-x-2.5'>
					<span className='font-display text-2xl font-bold tracking-tight text-brass-300'>{hasPrice ? `$${price.toFixed(2)}` : '$0.00'}</span>
					{original && <span className='text-sm text-stone-500 line-through'>${original.toFixed(2)}</span>}
				</div>
			</div>
		</div>
	);
};

const getProductStatus = (product) => {
	if (product.status === 'archived') return 'archived';
	if (Number(product.stock) <= 0) return 'out_of_stock';
	return 'active';
};

// Reads an image file, resizes it and returns a compressed JPEG data URL.
const fileToCompressedDataUrl = (file) =>
	new Promise((resolve, reject) => {
		if (!file.type.startsWith('image/')) {
			reject(new Error(`"${file.name}" is not an image.`));
			return;
		}

		const reader = new FileReader();
		reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(new Error(`"${file.name}" is not a valid image.`));
			img.onload = () => {
				const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
				const canvas = document.createElement('canvas');
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);

				const ctx = canvas.getContext('2d');
				ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				resolve(canvas.toDataURL('image/jpeg', 0.8));
			};
			img.src = reader.result;
		};
		reader.readAsDataURL(file);
	});

/* ------------------------------------------------------------------ */
/*  Image uploader                                                     */
/* ------------------------------------------------------------------ */

const ImageUploader = ({ images, onChange, onError, disabled }) => {
	const addInputRef = useRef(null);
	const replaceInputRef = useRef(null);
	const replaceIndexRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	const [busy, setBusy] = useState(false);

	const processFiles = async (files) => {
		const list = Array.from(files);
		if (list.length === 0) return;

		const room = MAX_IMAGES - images.length;
		if (room <= 0) {
			onError(`You can add up to ${MAX_IMAGES} images.`);
			return;
		}

		setBusy(true);
		onError('');

		try {
			const converted = await Promise.all(list.slice(0, room).map(fileToCompressedDataUrl));
			onChange([...images, ...converted]);
			if (list.length > room) onError(`Only ${MAX_IMAGES} images are allowed, extra files were skipped.`);
		} catch (err) {
			onError(err.message || 'Could not add the image.');
		} finally {
			setBusy(false);
		}
	};

	const handleAdd = async (event) => {
		await processFiles(event.target.files);
		event.target.value = ''; // lets the same file be picked again
	};

	const handleReplace = async (event) => {
		const file = event.target.files?.[0];
		const index = replaceIndexRef.current;
		event.target.value = '';
		if (!file || index === null) return;

		setBusy(true);
		onError('');

		try {
			const converted = await fileToCompressedDataUrl(file);
			onChange(images.map((img, i) => (i === index ? converted : img)));
		} catch (err) {
			onError(err.message || 'Could not replace the image.');
		} finally {
			setBusy(false);
			replaceIndexRef.current = null;
		}
	};

	const startReplace = (index) => {
		replaceIndexRef.current = index;
		replaceInputRef.current?.click();
	};

	const removeImage = (index) => onChange(images.filter((_, i) => i !== index));

	const makeCover = (index) => {
		const next = [...images];
		const [picked] = next.splice(index, 1);
		next.unshift(picked);
		onChange(next);
	};

	const handleDrop = (event) => {
		event.preventDefault();
		setDragging(false);
		if (!disabled) processFiles(event.dataTransfer.files);
	};

	const canAddMore = images.length < MAX_IMAGES;

	return (
		<div>
			<div className='mb-4 flex items-center justify-between gap-4'>
				<span className='text-sm font-medium text-stone-700'>Product images</span>
				<div className='flex items-center gap-3'>
					<span
						aria-hidden='true'
						className='flex gap-1'>
						{Array.from({ length: MAX_IMAGES }).map((_, i) => (
							<span
								key={i}
								className={`h-1.5 w-5 rounded-full transition-colors duration-500 ${i < images.length ? 'bg-brass-500' : 'bg-stone-200'}`}
							/>
						))}
					</span>
					<span className='text-xs text-stone-500'>
						{images.length} / {MAX_IMAGES}
					</span>
				</div>
			</div>

			<input
				ref={addInputRef}
				type='file'
				accept='image/*'
				multiple
				onChange={handleAdd}
				className='hidden'
			/>
			<input
				ref={replaceInputRef}
				type='file'
				accept='image/*'
				onChange={handleReplace}
				className='hidden'
			/>

			{/* The first image is shown large as the cover; the rest form a mosaic beside it */}
			<div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
				{images.map((src, index) => (
					<div
						key={`${index}-${src.slice(-24)}`}
						className={`group relative aspect-square overflow-hidden rounded-xl bg-paper ring-1 ring-stone-200 ${index === 0 ? 'col-span-2 row-span-2' : ''}`}>
						<img
							src={src}
							alt={`Product ${index + 1}`}
							className='h-full w-full object-cover transition-transform duration-700 ease-soft group-hover:scale-105'
						/>

						{index === 0 && <span className='absolute left-3 top-3 rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-3 py-1 text-[11px] font-bold text-ink shadow-lg'>Cover</span>}

						{/* Actions: always visible on touch screens, on hover for desktop */}
						<div className='absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10 opacity-100 transition duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'>
							{index !== 0 && (
								<button
									type='button'
									onClick={() => makeCover(index)}
									disabled={disabled || busy}
									title='Make cover image'
									aria-label='Make cover image'
									className='flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm text-white backdrop-blur transition hover:bg-brass-400 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-300 disabled:opacity-50'>
									<FaStar aria-hidden='true' />
								</button>
							)}
							<button
								type='button'
								onClick={() => startReplace(index)}
								disabled={disabled || busy}
								title='Change image'
								aria-label='Change image'
								className='flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm text-white backdrop-blur transition hover:bg-brass-400 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-300 disabled:opacity-50'>
								<FaExchangeAlt aria-hidden='true' />
							</button>
							<button
								type='button'
								onClick={() => removeImage(index)}
								disabled={disabled || busy}
								title='Remove image'
								aria-label='Remove image'
								className='flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/80 text-sm text-white backdrop-blur transition hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 disabled:opacity-50'>
								<FaTrashAlt aria-hidden='true' />
							</button>
						</div>
					</div>
				))}

				{canAddMore && (
					<button
						type='button'
						onClick={() => addInputRef.current?.click()}
						onDragOver={(event) => {
							event.preventDefault();
							setDragging(true);
						}}
						onDragLeave={() => setDragging(false)}
						onDrop={handleDrop}
						disabled={disabled || busy}
						className={`relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed p-4 text-center text-sm transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 disabled:cursor-not-allowed disabled:opacity-50 ${dragging ? 'border-brass-500 bg-brass-400/10 text-brass-700' : 'border-stone-300 bg-stone-50/60 text-stone-500 hover:border-brass-400 hover:bg-brass-400/10 hover:text-stone-700'} ${images.length === 0 ? 'col-span-2 py-14 sm:col-span-4' : 'aspect-square'}`}>
						<span className='relative flex h-14 w-14 items-center justify-center rounded-full bg-brass-400/15 text-2xl text-brass-600 ring-1 ring-brass-400/30'>
							{images.length === 0 && !busy && <span className='absolute inset-0 animate-ring rounded-full border border-brass-400/50' />}
							{busy ? <span className='h-6 w-6 animate-spin rounded-full border-2 border-brass-500 border-t-transparent' /> : <FaCloudUploadAlt aria-hidden='true' />}
						</span>
						<span className='font-medium'>{busy ? 'Processing...' : images.length === 0 ? 'Upload images' : 'Add image'}</span>
						{images.length === 0 && <span className='max-w-xs text-xs text-stone-400'>Click to browse or drag and drop. The first image is the cover.</span>}
					</button>
				)}
			</div>
		</div>
	);
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const AdminProducts = () => {
	const { getToken, isLoaded, isSignedIn } = useAuth();

	const [products, setProducts] = useState([]);
	const [productFilter, setProductFilter] = useState('all');
	const [form, setForm] = useState(initialForm);
	const [editingId, setEditingId] = useState(null);

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [archivingId, setArchivingId] = useState(null);
	const [deletingId, setDeletingId] = useState(null);
	const isProcessing = archivingId !== null || deletingId !== null;

	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	const loadProducts = useCallback(async () => {
		// Wait until Clerk has finished restoring the authentication session.
		if (!isLoaded) return;

		if (!isSignedIn) {
			setProducts([]);
			setError('Please sign in to manage products.');
			setLoading(false);
			return;
		}

		setLoading(true);
		setError('');

		try {
			const data = await getAdminCustomProducts(getToken);
			setProducts(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(err.message || 'Could not load products.');
		} finally {
			setLoading(false);
		}
	}, [getToken, isLoaded, isSignedIn]);

	useEffect(() => {
		loadProducts();
	}, [loadProducts]);

	const filteredProducts = products.filter((product) => productFilter === 'all' || getProductStatus(product) === productFilter);

	const productCounts = products.reduce(
		(counts, product) => {
			counts[getProductStatus(product)] += 1;
			return counts;
		},
		{ active: 0, out_of_stock: 0, archived: 0 },
	);

	const handleChange = (event) => {
		const { name, value } = event.target;

		setForm((current) => ({
			...current,
			[name]: value,
		}));
	};

	const handleImagesChange = (images) => setForm((current) => ({ ...current, images }));

	const handleEdit = (product) => {
		setEditingId(product.id);

		setForm({
			title: product.title || '',
			description: product.description || '',
			price: String(product.price ?? ''),
			discountPercentage: String(product.discountPercentage ?? 0),
			rating: String(product.rating ?? 0),
			stock: String(product.stock ?? ''),
			category: product.category || '',
			brand: product.brand || '',
			tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
			images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
			status: product.status === 'archived' ? 'archived' : 'active',
			shippingInformation: product.shippingInformation || 'Ships in 3-5 business days',
		});

		setError('');
		setMessage('');

		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setForm(initialForm);
		setError('');
		setMessage('');
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!isLoaded || !isSignedIn) {
			setError('Please sign in first.');
			return;
		}

		if (form.images.length === 0) {
			setError('Please add at least one product image.');
			return;
		}

		if (form.images.join('').length > MAX_TOTAL_CHARS) {
			setError('The images are too large together. Remove one or use smaller images.');
			return;
		}

		setSaving(true);
		setError('');
		setMessage('');

		try {
			const sanitizedBrand = form.brand.trim() || null;
			const sanitizedTags = form.tags
				? form.tags
						.split(',')
						.map((t) => t.trim().toLowerCase())
						.filter(Boolean)
				: [];

			const productData = {
				title: form.title.trim(),
				description: form.description.trim(),
				price: Number(form.price),
				discountPercentage: Number(form.discountPercentage),
				rating: Number(form.rating),
				stock: Number(form.stock),
				category: form.category.trim(),
				images: form.images,
				shippingInformation: form.shippingInformation.trim(),
				brand: sanitizedBrand,
				tags: sanitizedTags,
			};

			const isEditing = Boolean(editingId);

			if (isEditing) productData.status = form.status;

			const product = isEditing ? await updateCustomProduct({ id: editingId, ...productData }, getToken) : await createCustomProduct(productData, getToken);

			setProducts((current) => (isEditing ? current.map((item) => (item.id === product.id ? product : item)) : [product, ...current.filter((item) => item.id !== product.id)]));

			setForm(initialForm);
			setEditingId(null);

			setMessage(isEditing ? 'Product updated successfully.' : 'Product added successfully.');
		} catch (err) {
			setError(err.message || 'Could not save product.');
		} finally {
			setSaving(false);
		}
	};

	const handleArchived = async (product) => {
		if (getProductStatus(product) === 'archived') return;

		const confirmed = window.confirm(`Are you sure you want to archive "${product.title}"?`);

		if (!confirmed) return;

		if (!isLoaded || !isSignedIn) {
			setError('Please sign in first.');
			return;
		}

		setArchivingId(product.id);
		setError('');
		setMessage('');

		try {
			const result = await archivedCustomProduct(product.id, getToken);

			// Keep the product in state so it remains visible in the Archived filter.
			setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, status: 'archived', isAvailable: false } : item)));

			if (editingId === product.id) {
				setEditingId(null);
				setForm(initialForm);
			}

			setMessage(result?.message || 'Product archived successfully.');
		} catch (err) {
			setError(err.message || 'Could not archive product.');
		} finally {
			setArchivingId(null);
		}
	};

	const handleDelete = async (product) => {
		const confirmed = window.confirm(`Permanently delete "${product.title}"? This action cannot be undone.`);

		if (!confirmed) return;

		if (!isLoaded || !isSignedIn) {
			setError('Please sign in first.');
			return;
		}

		setDeletingId(product.id);
		setError('');
		setMessage('');

		try {
			const result = await deleteCustomProduct(product.id, getToken);

			setProducts((current) => current.filter((item) => item.id !== product.id));

			if (editingId === product.id) {
				setEditingId(null);
				setForm(initialForm);
			}

			setMessage(result?.message || 'Product deleted successfully.');
		} catch (err) {
			setError(err.message || 'Could not delete product.');
		} finally {
			setDeletingId(null);
		}
	};

	const formDisabled = saving || isProcessing || !isLoaded || !isSignedIn;

	return (
		<section className='min-h-screen bg-paper px-4 py-6 text-stone-900 sm:px-6 sm:py-8 lg:px-10'>
			<div className='mx-auto max-w-7xl'>
				{/* Masthead — the Contact/About hero language, built from the real
				    tokens: ink, brass glow, faint grid, outlined wordmark, and the
				    Great Vibes brand signature in wordmark gold. */}
				<header className='relative animate-rise overflow-hidden rounded-card bg-ink text-white shadow-float'>
					<div
						className='pointer-events-none absolute inset-0'
						style={{ background: 'radial-gradient(60% 90% at 90% 0%, rgba(251,191,36,.24), transparent 60%), radial-gradient(45% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)' }}
					/>
					<div
						className='pointer-events-none absolute inset-0 opacity-[.06]'
						style={{
							backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
							backgroundSize: '44px 44px',
							WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent)',
							maskImage: 'linear-gradient(to bottom, #000, transparent)',
						}}
					/>
					<span
						aria-hidden='true'
						className='pointer-events-none absolute -bottom-4 left-0 select-none whitespace-nowrap font-display text-[18vw] font-bold leading-none tracking-tight lg:text-[11rem]'
						style={{ color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.07)' }}>
						PRODUCTS
					</span>

					<div className='relative flex flex-col gap-8 px-6 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-end lg:justify-between'>
						<div>
							<p className='font-script text-3xl leading-none text-wordmark'>Al-Haidara</p>
							<p className='mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-stone-400'>
								Admin Dashboard <span className='mx-1 text-stone-600'>/</span> <span className='text-brass-300'>Products</span>
							</p>
							<h1 className='mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl'>Manage products</h1>
							<span className='mt-5 block h-[3px] w-8 rounded-full bg-brass-400' />
							<p className='mt-5 max-w-xl text-sm leading-6 text-stone-300 sm:text-base'>Add, edit, archive, and delete products stored in Firebase. Existing DummyJSON products are not changed.</p>
						</div>

						<div className='flex shrink-0 gap-8 sm:gap-10'>
							{[
								{ label: 'Total', value: products.length },
								{ label: 'Active', value: productCounts.active },
								{ label: 'Out of stock', value: productCounts.out_of_stock },
							].map((stat) => (
								<div key={stat.label}>
									<p className='font-display text-4xl font-bold tracking-tight text-brass-300 tabular-nums'>{stat.value}</p>
									<p className='mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400'>{stat.label}</p>
								</div>
							))}
						</div>
					</div>

					{/* Brass seam along the bottom edge */}
					<span
						aria-hidden='true'
						className='absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-brass-500 via-brass-300 to-transparent'
					/>
				</header>

				{error && (
					<div
						role='alert'
						className='mt-6 flex items-start gap-3 rounded-inner border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800'>
						<FaExclamationCircle
							className='mt-0.5 shrink-0 text-base text-rose-500'
							aria-hidden='true'
						/>
						<p>{error}</p>
					</div>
				)}

				{message && (
					<div
						role='status'
						className='mt-6 flex items-start gap-3 rounded-inner border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800'>
						<FaCheckCircle
							className='mt-0.5 shrink-0 text-base text-emerald-500'
							aria-hidden='true'
						/>
						<p>{message}</p>
					</div>
				)}

				{/* ------------------------- Form ------------------------- */}
				<form
					onSubmit={handleSubmit}
					className='mt-8'>
					<div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_23rem]'>
						{/* Single-sheet form: one white card with a charcoal header band,
						    sections divided by hairlines. */}
						<div
							className='animate-rise overflow-hidden rounded-card border border-stone-200 bg-white shadow-card'
							style={{ animationDelay: '100ms' }}>
							<div className='flex items-center justify-between gap-3 bg-charcoal px-6 py-5 sm:px-8'>
								<h2 className='font-display text-xl font-bold tracking-tight text-white sm:text-2xl'>{editingId ? 'Edit product' : 'Add new product'}</h2>
								{editingId && <span className='animate-pop rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-3 py-1 text-xs font-bold text-ink shadow'>Editing</span>}
							</div>

							<div className='divide-y divide-stone-100'>
								{/* Images first: it is the most visual part of a product */}
								<FormSection
									icon={FaImages}
									title='Images'
									step='01'>
									<ImageUploader
										images={form.images}
										onChange={handleImagesChange}
										onError={setError}
										disabled={formDisabled}
									/>
								</FormSection>

								<FormSection
									icon={FaTag}
									title='Product details'
									step='02'>
									<div className='grid gap-5 sm:grid-cols-2'>
										<div>
											<label
												htmlFor='title'
												className={labelClass}>
												Product name
												<Req />
											</label>
											<input
												id='title'
												name='title'
												value={form.title}
												onChange={handleChange}
												required
												maxLength={150}
												className={inputClass}
												placeholder='Product name'
											/>
										</div>

										<div>
											<label
												htmlFor='category'
												className={labelClass}>
												Category
												<Req />
											</label>
											<input
												id='category'
												name='category'
												value={form.category}
												onChange={handleChange}
												required
												maxLength={80}
												className={inputClass}
												placeholder='e.g. electronics'
											/>
										</div>

										<div>
											<label
												htmlFor='brand'
												className={labelClass}>
												Brand (optional)
											</label>
											<input
												id='brand'
												name='brand'
												value={form.brand}
												onChange={handleChange}
												maxLength={100}
												className={inputClass}
												placeholder='e.g. Apple, Sony, Nike'
											/>
										</div>

										<div>
											<label
												htmlFor='tags'
												className={labelClass}>
												Tags (optional, comma-separated)
											</label>
											<input
												id='tags'
												name='tags'
												value={form.tags}
												onChange={handleChange}
												maxLength={200}
												className={inputClass}
												placeholder='e.g. wireless, gaming, audio'
											/>
										</div>
									</div>
								</FormSection>

								<FormSection
									icon={FaDollarSign}
									title='Pricing & inventory'
									step='03'>
									<div className='grid gap-5 sm:grid-cols-2'>
										<div>
											<label
												htmlFor='price'
												className={labelClass}>
												Price ($)
												<Req />
											</label>
											<Adorn icon={FaDollarSign}>
												<input
													id='price'
													name='price'
													type='number'
													min='0'
													step='0.01'
													value={form.price}
													onChange={handleChange}
													required
													className={`${inputClass} pl-11`}
													placeholder='100'
												/>
											</Adorn>
										</div>

										<div>
											<label
												htmlFor='discountPercentage'
												className={labelClass}>
												Discount (%)
												<Req />
											</label>
											<Adorn icon={FaPercent}>
												<input
													id='discountPercentage'
													name='discountPercentage'
													type='number'
													min='0'
													max='100'
													step='0.01'
													value={form.discountPercentage}
													onChange={handleChange}
													required
													className={`${inputClass} pl-11`}
												/>
											</Adorn>
										</div>

										<div>
											<label
												htmlFor='rating'
												className={labelClass}>
												Rating (0-5)
												<Req />
											</label>
											<Adorn icon={FaStar}>
												<input
													id='rating'
													name='rating'
													type='number'
													min='0'
													max='5'
													step='0.1'
													value={form.rating}
													onChange={handleChange}
													required
													className={`${inputClass} pl-11`}
												/>
											</Adorn>
										</div>

										<div>
											<label
												htmlFor='stock'
												className={labelClass}>
												Stock quantity
												<Req />
											</label>
											<Adorn icon={FaBoxes}>
												<input
													id='stock'
													name='stock'
													type='number'
													min='0'
													step='1'
													value={form.stock}
													onChange={handleChange}
													required
													className={`${inputClass} pl-11`}
													placeholder='20'
												/>
											</Adorn>
										</div>
									</div>
								</FormSection>

								<FormSection
									icon={FaAlignLeft}
									title='Description'
									step='04'>
									<label
										htmlFor='description'
										className='sr-only'>
										Description
									</label>
									<textarea
										id='description'
										name='description'
										value={form.description}
										onChange={handleChange}
										required
										maxLength={3000}
										rows={5}
										className={`${inputClass} h-auto min-h-[132px] resize-y py-3.5 leading-6`}
										placeholder='Describe the product...'
									/>
									<p className='mt-2 text-right text-xs text-stone-400'>{form.description.length} / 3000</p>
								</FormSection>

								<FormSection
									icon={FaTruck}
									title={editingId ? 'Shipping & status' : 'Shipping'}
									step='05'>
									<div className='grid gap-5 sm:grid-cols-2'>
										<div className={editingId ? '' : 'sm:col-span-2'}>
											<label
												htmlFor='shippingInformation'
												className={labelClass}>
												Shipping information
												<Req />
											</label>
											<input
												id='shippingInformation'
												name='shippingInformation'
												value={form.shippingInformation}
												onChange={handleChange}
												required
												className={inputClass}
												placeholder='Ships in 3-5 business days'
											/>
										</div>

										{editingId && (
											<fieldset>
												<legend className={labelClass}>Product status</legend>
												<div className='grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200'>
													{[
														{ value: 'active', label: 'Active' },
														{ value: 'archived', label: 'Archived' },
													].map((option) => (
														<label
															key={option.value}
															className='cursor-pointer'>
															<input
																type='radio'
																name='status'
																value={option.value}
																checked={form.status === option.value}
																onChange={handleChange}
																className='peer sr-only'
															/>
															<span
																className={`block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass-500 ${form.status === option.value ? 'bg-charcoal text-white shadow' : 'text-stone-500 hover:text-stone-900'}`}>
																{option.label}
															</span>
														</label>
													))}
												</div>
											</fieldset>
										)}
									</div>
								</FormSection>
							</div>
						</div>

						{/* Preview + actions stay in view on large screens */}
						<aside
							className='animate-rise space-y-4 lg:sticky lg:top-6'
							style={{ animationDelay: '200ms' }}>
							<div>
								<div className='mb-3 flex items-center gap-2'>
									<span
										aria-hidden='true'
										className='h-2 w-2 animate-pulse rounded-full bg-brass-500'
									/>
									<p className='text-xs font-semibold uppercase tracking-[0.24em] text-brass-600'>Live preview</p>
								</div>
								<ProductPreview form={form} />
							</div>

							<div className='flex flex-col gap-3'>
								<button
									type='submit'
									disabled={formDisabled}
									className={BTN_PRIMARY}>
									{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}
								</button>

								{editingId && (
									<button
										type='button'
										onClick={handleCancelEdit}
										disabled={saving}
										className={BTN_GHOST}>
										Cancel editing
									</button>
								)}
							</div>
						</aside>
					</div>
				</form>

				{/* Brand divider between the two work zones — the wordmark,
				    used exactly as the tokens intend. */}
				<div
					className='my-14 flex items-center gap-5'
					aria-hidden='true'>
					<span className='h-px flex-1 bg-stone-200' />
					<span className='select-none font-script text-3xl leading-none text-brass-500'>Al-Haidara</span>
					<span className='h-px flex-1 bg-stone-200' />
				</div>

				{/* ------------------------- Catalogue ------------------------- */}
				<div
					className='animate-rise'
					style={{ animationDelay: '300ms' }}>
					<div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
						<div>
							<p className='text-xs font-semibold uppercase tracking-[0.24em] text-brass-600'>Catalogue</p>
							<h2 className='mt-3 font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl'>Your products</h2>
						</div>

						<button
							type='button'
							onClick={loadProducts}
							disabled={loading || isProcessing || saving}
							className='inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-brass-300 to-brass-500 px-6 text-sm font-bold text-ink shadow-sm shadow-brass-500/25 transition duration-300 ease-soft hover:-translate-y-0.5 hover:from-brass-200 hover:to-brass-400 hover:shadow-md hover:shadow-brass-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'>
							{loading ? 'Loading...' : 'Refresh'}
						</button>
					</div>

					{/* Stat strip — one divided card; each cell filters the list */}
					<div
						role='group'
						aria-label='Filter products'
						className='mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-stone-200 bg-stone-200 shadow-card lg:grid-cols-4'>
						{PRODUCT_FILTERS.map((filter) => {
							const count = filter.value === 'all' ? products.length : productCounts[filter.value];
							const selected = productFilter === filter.value;
							return (
								<button
									key={filter.value}
									type='button'
									onClick={() => setProductFilter(filter.value)}
									aria-pressed={selected}
									className={`p-5 text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brass-400 sm:p-6 ${selected ? 'bg-brass-400/10' : 'bg-white hover:bg-stone-50/60'}`}>
									<span className={`text-xs font-semibold uppercase tracking-[0.14em] ${selected ? 'text-brass-700' : 'text-stone-500'}`}>{filter.label}</span>
									<span className='mt-2 block font-display text-4xl font-bold tracking-tight text-stone-950 tabular-nums'>{count}</span>
									<span
										aria-hidden='true'
										className={`mt-3 block h-[3px] w-8 rounded-full transition-colors duration-300 ${selected ? 'bg-brass-400' : 'bg-stone-200'}`}
									/>
								</button>
							);
						})}
					</div>

					{loading ? (
						<div
							role='status'
							className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
							<span className='sr-only'>Loading products...</span>
							{[0, 1, 2].map((i) => (
								<div
									key={i}
									className='overflow-hidden rounded-card border border-stone-200 bg-white shadow-card'>
									<div className='h-52 animate-pulse bg-stone-100' />
									<div className='space-y-3 p-6'>
										<div className='h-3 w-1/3 animate-pulse rounded-full bg-stone-100' />
										<div className='h-4 w-3/4 animate-pulse rounded-full bg-stone-100' />
										<div className='h-6 w-1/4 animate-pulse rounded-full bg-stone-100' />
										<div className='h-10 w-full animate-pulse rounded-full bg-stone-100' />
									</div>
								</div>
							))}
						</div>
					) : products.length === 0 ? (
						<p className='rounded-card border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500'>No custom products yet. Use the form above to add your first product.</p>
					) : filteredProducts.length === 0 ? (
						<p className='rounded-card border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500'>No products in this category.</p>
					) : (
						<div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
							{filteredProducts.map((product) => {
								const status = getProductStatus(product);
								const imageCount = product.images?.filter(Boolean).length || 0;
								const isEditing = editingId === product.id;

								return (
									<article
										key={product.id}
										className={`group flex flex-col overflow-hidden rounded-card border border-stone-200 bg-white shadow-card transition duration-300 ease-soft hover:-translate-y-1 hover:border-stone-300 hover:shadow-card-hover ${isEditing ? 'ring-2 ring-brass-400' : ''}`}>
										<div className='relative overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200'>
											{product.images?.[0] ? (
												<img
													src={product.images[0]}
													alt={product.title}
													className={`h-52 w-full object-cover transition-transform duration-700 ease-soft group-hover:scale-105 ${status === 'archived' ? 'opacity-50 grayscale' : ''}`}
												/>
											) : (
												<div className='flex h-52 w-full items-center justify-center bg-stone-100 text-sm text-stone-400'>No image</div>
											)}

											<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset backdrop-blur ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>

											{imageCount > 1 && <span className='absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-stone-200 backdrop-blur'>{imageCount} photos</span>}
										</div>

										<div className='flex flex-1 flex-col p-6'>
											<p className='text-xs text-stone-500'>
												{product.category}
												{product.brand ? ` · ${product.brand}` : ''}
											</p>
											<div className='mt-1 flex flex-wrap items-center gap-2'>
												<h3 className='font-display text-lg font-bold leading-snug text-stone-950'>{product.title}</h3>
												{isEditing && <span className='animate-pop rounded-full bg-brass-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-brass-700 ring-1 ring-inset ring-brass-400/30'>Editing</span>}
											</div>

											<div className='mt-3 flex items-baseline gap-2'>
												<span className='font-display text-2xl font-bold tracking-tight text-brass-700'>${Number(product.price).toFixed(2)}</span>
												{Number(product.discountPercentage) > 0 && <span className='rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200'>-{product.discountPercentage}%</span>}
											</div>

											<div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600'>
												<span>Rating: {product.rating} / 5</span>
												<span className={Number(product.stock) <= 0 ? 'font-medium text-rose-600' : ''}>Stock: {product.stock ?? 0}</span>
											</div>

											{status === 'archived' && <p className='mt-3 rounded-xl bg-stone-100 p-3 text-xs leading-5 text-stone-600'>This product is archived and is not available for purchase. Set it to Active in the editor to restore it.</p>}
											{status === 'out_of_stock' && <p className='mt-3 rounded-xl bg-brass-400/10 p-3 text-xs leading-5 text-brass-700'>Stock is zero. Restock this product to make it available again.</p>}

											<p className='mt-3 line-clamp-3 text-sm leading-6 text-stone-600'>{product.description}</p>
											<p className='mt-2 text-xs text-stone-500'>{product.shippingInformation}</p>
											<p className='mt-2 break-all text-[11px] text-stone-400'>ID: {product.id}</p>

											<div className='mt-auto flex gap-2 pt-5'>
												<button
													type='button'
													onClick={() => handleEdit(product)}
													disabled={saving || isProcessing}
													className={`${CARD_BTN} flex-1 bg-gradient-to-r from-brass-300 to-brass-500 text-ink shadow-sm hover:from-brass-200 hover:to-brass-400`}>
													Edit
												</button>

												<button
													type='button'
													onClick={() => handleArchived(product)}
													disabled={isProcessing || saving || !isLoaded || !isSignedIn || status === 'archived'}
													className={`${CARD_BTN} flex-1 border border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50`}>
													{archivingId === product.id ? 'Archiving...' : status === 'archived' ? 'Archived' : 'Archive'}
												</button>

												<button
													type='button'
													onClick={() => handleDelete(product)}
													disabled={isProcessing || saving || !isLoaded || !isSignedIn}
													className={`${CARD_BTN} flex-1 border border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}>
													{deletingId === product.id ? 'Deleting...' : 'Delete'}
												</button>
											</div>
										</div>
									</article>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</section>
	);
};

export default AdminProducts;
