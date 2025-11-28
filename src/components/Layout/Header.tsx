import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="p-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gradient">CoPromote.ai</h1>
                <a
                    href="#demo"
                    className="px-4 py-2 bg-accent-blue rounded-lg font-semibold hover:bg-accent-purple transition duration-300"
                >
                    Request Demo
                </a>
            </div>
        </header>
    );
};

export default Header;
