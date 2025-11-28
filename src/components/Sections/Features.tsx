import React from 'react';
import { Brain, Handshake, Timer } from 'lucide-react';
import FeatureCard from '../UI/FeatureCard';

const Features: React.FC = () => {
    return (
        <section className="py-24 bg-secondary-dark border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-6">
                <h3 className="text-4xl font-bold text-center mb-16">The Power to Bundle and Scale</h3>

                <div className="grid md:grid-cols-3 gap-10">

                    {/* Feature Card 1: AI-Powered Creation */}
                    <FeatureCard
                        icon={<Brain size={48} />}
                        title="AI-Optimized Content & Images"
                        description="Stop writing copy. Our proprietary AI automatically generates compelling, sales-driven promotional text and produces high-quality, professional images for any product combination, optimized for conversion."
                        iconColorClass="text-accent-blue"
                    />

                    {/* Feature Card 2: Cross-Catalog Bundling */}
                    <FeatureCard
                        icon={<Handshake size={48} />}
                        title="Seamless Cross-Catalog Bundles"
                        description="Create highly personalized promotions by intelligently combining products from *both* the distributor's inventory and the retailer's catalog. Maximizes relevance and order value."
                        iconColorClass="text-accent-purple"
                    />

                    {/* Feature Card 3: Speed & Efficiency */}
                    <FeatureCard
                        icon={<Timer size={48} />}
                        title="From Idea to Customer in Seconds"
                        description="Select your products, hit generate, and the promotion is ready. Cut the days-long design and approval process down to mere moments."
                        iconColorClass="text-accent-purple"
                    />

                </div>
            </div>
        </section>
    );
};

export default Features;
