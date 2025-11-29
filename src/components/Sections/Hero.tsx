import React from 'react';

const Hero: React.FC = () => {
    return (
        <section className="bg-hero-gradient pt-32 pb-24 text-center">
            <div className="max-w-4xl mx-auto px-6">
                {/* Headline */}
                <h2 className="text-6xl md:text-7xl font-extrabold leading-tight tracking-tighter mb-6 text-white">
                    Cross-Catalog Promotions,
                    <span className="text-gradient block">Instantly Generated.</span>
                </h2>
                {/* Subtext */}
                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                    For the first time, distributors and retailers can create personalized, multi-product bundles
                    by combining inventory, backed by AI-generated text and high-quality visuals.
                </p>

                {/* Main CTA */}
                <a
                    href="#demo"
                    className="inline-block px-12 py-4 bg-accent-purple text-lg font-bold rounded-xl shadow-2xl shadow-violet-500/50 hover:bg-violet-600 transition duration-300 transform hover:scale-[1.02]"
                >
                    Start Generating Sales
                </a>

                {/* Placeholder Image/Mockup */}
                <div className="mt-20">
                    <div className="bg-secondary-dark p-8 rounded-2xl border border-slate-700/50 shadow-inner shadow-slate-900">
                        <img
                            src="https://placehold.co/1200x500/1E293B/64748B?text=CoPromote.ai+Dashboard+Mockup+%7C+AI+Generation+View"
                            alt="CoPromote.ai app interface mockup showing instant promotion generation."
                            className="w-full h-auto rounded-xl border border-slate-700 opacity-90 transition duration-500 ease-in-out hover:opacity-100"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
