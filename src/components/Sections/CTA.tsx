import React from 'react';

const CTA: React.FC = () => {
    return (
        <section id="demo" className="py-24 bg-secondary-dark border-t border-slate-800 text-center">
            <div className="max-w-3xl mx-auto px-6">
                <h3 className="text-4xl md:text-5xl font-bold mb-4">Ready to Amplify Your Sales?</h3>
                <p className="text-xl text-slate-300 mb-10">
                    Join the distributors and retailers who are already building smarter, faster, and more profitable promotions.
                </p>
                <form className="flex flex-col sm:flex-row gap-4 justify-center" onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="email"
                        placeholder="Your Work Email"
                        required
                        className="w-full sm:w-80 p-4 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-accent-purple focus:border-accent-purple transition duration-200"
                    />
                    <button
                        type="submit"
                        className="w-full sm:w-auto px-8 py-4 bg-accent-blue text-lg font-bold rounded-lg hover:bg-accent-purple transition duration-300 transform hover:scale-105"
                    >
                        Request a Personalized Demo
                    </button>
                </form>
            </div>
        </section>
    );
};

export default CTA;
