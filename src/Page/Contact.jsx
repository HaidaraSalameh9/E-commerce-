import React from "react";
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaPaperPlane } from "react-icons/fa";

/* Contact details exactly as on the original page — nothing added. */
const CHANNELS = [
	{ icon: FaPhoneAlt, label: "Phone", value: "+123 456 789" },
	{ icon: FaEnvelope, label: "Email", value: "haidarhsalamh@gmail.com" },
	{ icon: FaMapMarkerAlt, label: "Location", value: "New York, USA" },
];

/* -------------------------------------------------------------------------- */
/*  Styles — display font, gold-sweep button, staggered rise-in               */
/* -------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&display=swap');
.ct-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

@keyframes ct-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.ct-rise { animation: ct-rise .8s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: calc(var(--i, 0) * 120ms); }

.ct-btn { position: relative; overflow: hidden; isolation: isolate; transition: color .3s ease, transform .15s ease; }
.ct-btn::before {
	content: ''; position: absolute; inset: 0; z-index: -1;
	background: linear-gradient(90deg, #fcd34d, #f59e0b);
	transform: translateX(-101%);
	transition: transform .45s cubic-bezier(.2,.8,.2,1);
}
.ct-btn:hover, .ct-btn:focus-visible { color: #1c1917; }
.ct-btn:hover::before, .ct-btn:focus-visible::before { transform: none; }

@media (prefers-reduced-motion: reduce) {
	.ct-rise, .ct-btn, .ct-btn::before { animation: none; transition: none; }
}
`;

const FIELD_LABEL = "mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500";
const FIELD_INPUT =
	"h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15";

const Contact = () => {
	return (
		<main className="min-h-screen bg-stone-100">
			<style>{STYLES}</style>

			{/* Hero — dark stone, gold glow, faint grid, outlined wordmark */}
			<header className="relative overflow-hidden bg-stone-950 text-white">
				<div
					className="pointer-events-none absolute inset-0"
					style={{ background: "radial-gradient(60% 90% at 90% 0%, rgba(251,191,36,.24), transparent 60%), radial-gradient(45% 70% at 0% 100%, rgba(120,113,108,.28), transparent 60%)" }}
				/>
				<div
					className="pointer-events-none absolute inset-0 opacity-[.06]"
					style={{
						backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
						backgroundSize: "44px 44px",
						WebkitMaskImage: "linear-gradient(to bottom, #000, transparent)",
						maskImage: "linear-gradient(to bottom, #000, transparent)",
					}}
				/>
				<span
					aria-hidden="true"
					className="ct-display pointer-events-none absolute -bottom-5 left-0 select-none whitespace-nowrap text-[20vw] font-bold leading-none tracking-tight lg:text-[15rem]"
					style={{ color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.07)" }}>
					AL-HAIDARA
				</span>

				<div className="relative mx-auto max-w-6xl px-4 pb-32 pt-12 sm:px-6 sm:pb-36 sm:pt-16">
					<p
						className="ct-rise text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
						style={{ "--i": 0 }}>
						Contact Us
					</p>
					<h1
						className="ct-rise ct-display mt-5 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
						style={{ "--i": 1 }}>
						We'd love to <span className="text-amber-300">hear from you.</span>
					</h1>
					<p
						className="ct-rise mt-5 max-w-xl text-base leading-7 text-stone-300 sm:text-lg"
						style={{ "--i": 2 }}>
						Please fill out this form.
					</p>
				</div>
			</header>

			{/* Split card — rises over the hero */}
			<div className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 pb-20 sm:-mt-24 sm:px-6">
				<div
					className="ct-rise overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_30px_60px_-30px_rgba(28,25,23,.5)]"
					style={{ "--i": 3 }}>
					<div className="grid lg:grid-cols-5">
						{/* Dark contact panel */}
						<aside className="relative overflow-hidden bg-stone-950 p-7 text-white sm:p-9 lg:col-span-2">
							<div
								className="pointer-events-none absolute inset-0"
								style={{ background: "radial-gradient(70% 60% at 100% 0%, rgba(251,191,36,.16), transparent 60%)" }}
							/>
							<div className="relative">
								<p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Write to us</p>
								<h2 className="ct-display mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Send us a message</h2>
								<span className="mt-5 block h-[3px] w-8 rounded-full bg-amber-400" />
								<p className="mt-5 text-sm leading-6 text-stone-300">You can also reach us directly:</p>

								<div className="mt-6 space-y-1">
									{CHANNELS.map((channel) => {
										const Icon = channel.icon;
										return (
											<div
												key={channel.label}
												className="flex items-center gap-4 rounded-2xl p-3 transition hover:bg-white/5">
												<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-base text-amber-300 ring-1 ring-white/15">
													<Icon aria-hidden="true" />
												</span>
												<div className="min-w-0">
													<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">{channel.label}</p>
													<p className="mt-0.5 break-all text-[15px] font-medium text-white">{channel.value}</p>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</aside>

						{/* Form — fields, placeholders and button unchanged */}
						<div className="p-6 sm:p-8 lg:col-span-3 lg:p-10">
							<form className="space-y-5 sm:space-y-6">
								<div>
									<label
										htmlFor="contact-name"
										className={FIELD_LABEL}>
										Name
									</label>
									<input
										id="contact-name"
										type="text"
										placeholder="Your name"
										className={FIELD_INPUT}
									/>
								</div>

								<div>
									<label
										htmlFor="contact-email"
										className={FIELD_LABEL}>
										Email
									</label>
									<input
										id="contact-email"
										type="email"
										placeholder="Your email"
										className={FIELD_INPUT}
									/>
								</div>

								<div>
									<label
										htmlFor="contact-message"
										className={FIELD_LABEL}>
										Message
									</label>
									<textarea
										id="contact-message"
										rows="5"
										placeholder="Write your message..."
										className="min-h-[132px] w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3.5 text-sm leading-6 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/15"
									/>
								</div>

								<button
									type="submit"
									className="ct-btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-stone-950 text-sm font-semibold text-white shadow-lg shadow-stone-900/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[.98]">
									<FaPaperPlane
										size={14}
										aria-hidden="true"
									/>
									Send Message
								</button>
							</form>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
};

export default Contact;
