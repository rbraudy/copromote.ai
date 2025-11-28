import React from 'react';

interface HeaderProps {
    onSignInClick: () => void;
    onSignUpClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignInClick, onSignUpClick }) => {
    return (
        <header className="p-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gradient">CoPromote.ai</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onSignInClick}
                        className="text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={onSignUpClick}
                        className="px-4 py-2 bg-accent-blue rounded-lg font-semibold hover:bg-accent-purple transition duration-300"
                    >
                        Sign Up
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
