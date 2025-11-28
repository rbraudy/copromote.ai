import React, { ReactNode } from 'react';

interface FeatureCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    iconColorClass?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, iconColorClass = "text-accent-blue" }) => {
    return (
        <div className="feature-card p-8 bg-secondary-dark rounded-xl border border-accent-purple/30">
            <div className={`text-5xl mb-4 ${iconColorClass}`}>
                {icon}
            </div>
            <h4 className="text-2xl font-bold mb-3">{title}</h4>
            <p className="text-slate-400">
                {description}
            </p>
        </div>
    );
};

export default FeatureCard;
