import React from 'react';
import { Menu, X, LogIn, User, LogOut, Sun, Moon } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
    onSignInClick: () => void;
    onSignUpClick: () => void;
    onSignOutClick: () => void;
    userEmail: string | null;
}

const Header: React.FC<HeaderProps> = ({ onSignInClick, onSignUpClick, onSignOutClick, userEmail }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleSignOut = () => {
        auth.signOut();
    };

    return (
        <header className="fixed w-full top-0 z-50 bg-white/80 dark:bg-primary-dark/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">C</span>
                    </div>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">CoPromote</span>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-slate-600 dark:text-slate-300 hover:text-accent-blue transition-colors">Features</a>
                    <a href="#how-it-works" className="text-slate-600 dark:text-slate-300 hover:text-accent-blue transition-colors">How it Works</a>
                    <a href="#pricing" className="text-slate-600 dark:text-slate-300 hover:text-accent-blue transition-colors">Pricing</a>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {userEmail ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                <User size={16} />
                                {userEmail}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="text-sm text-slate-500 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onSignInClick}
                                className="text-slate-600 dark:text-white hover:text-accent-blue font-medium transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={onSignUpClick}
                                className="px-5 py-2.5 bg-accent-blue hover:bg-accent-purple text-white rounded-full font-medium transition-all shadow-lg shadow-accent-blue/25"
                            >
                                Get Started
                            </button>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;
