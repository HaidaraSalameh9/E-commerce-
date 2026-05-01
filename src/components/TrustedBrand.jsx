import logo_1 from './../assets/logo-1.png';
import logo_2 from './../assets/logo-2.png';
import logo_3 from './../assets/logo-3.png';
import logo_4 from './../assets/logo-4.png';

export const TrustedBrand = () => {
    const companiesLogo = [
        { name: "1", logo: logo_1 },
        { name: "2", logo: logo_3 },
        { name: "3", logo: logo_2 },
        { name: "4", logo: logo_4 },
        { name: "5", logo: logo_3 },
    ];


    return (
        <>
            <style>{`
                .marquee {
                    display: flex;
                    width: max-content;
                    animation: scroll 20s linear infinite;
                }

                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>

            <div className="overflow-hidden w-full relative  mx-auto py-10">

                {/* LEFT FADE */}
                <div className="absolute left-0 top-0 h-full w-30   z-10 pointer-events-none" />

                {/* RIGHT FADE */}
                <div className="absolute right-0 top-0 h-full w-30  z-10 pointer-events-none" />

                {/* LOGOS */}
                <div className="marquee">
                    {[...companiesLogo, ...companiesLogo].map((company, index) => (
                        <div key={index} className="mx-10 flex items-center justify-center">
                            <img
                                src={company.logo}
                                alt={company.name}
                                className="h-20 w-auto object-contain opacity-70 
                                hover:opacity-100 hover:scale-110 bg-gray-100 
                                transition-all duration-300 grayscale hover:grayscale-0"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default TrustedBrand;