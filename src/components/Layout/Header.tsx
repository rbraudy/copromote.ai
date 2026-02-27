import React from 'react';
import { User, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

interface HeaderProps {
    onSignInClick: () => void;
    onSignUpClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignInClick, onSignUpClick }) => {
    const { theme, toggleTheme } = useTheme();
    const { user, role, signOut } = useAuth();
    const { tenant } = useTenant();

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <header className="fixed w-full top-0 z-50 bg-white/80 dark:bg-primary-dark/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <a href="/" className="flex items-center gap-2">
                    {tenant.logo_url ? (
                        <img src={tenant.logo_url} alt={tenant.brand_name} className="h-8 w-auto rounded-lg" />
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">{tenant.brand_name.charAt(0)}</span>
                        </div>
                    )}
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                        {tenant.brand_name}
                    </span>
                </a>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-slate-600 dark:text-slate-300 hover:text-accent-blue transition-colors">Features</a>
                    <a href="/henrys" className="text-slate-600 dark:text-slate-300 hover:text-accent-blue transition-colors">Warranty</a>
                    <a href="#how-it-works" className="text-slate-600 dark:text-slate-300 hover:text-accent-blue transition-colors">How it Works</a>
                    <a href="#pricing" className="text-slate-600 dark:text-slate-300 hover:text-accent-blue transition-colors">Pricing</a>

                    {user ? (
                        <div className="flex items-center gap-6">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                <User size={16} />
                                {user?.email}
                            </span>
                            {(role === 'admin' || role === 'superadmin') && (
                                <a href="/settings" className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    Settings
                                </a>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                            >
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                            </button>
                            <button
                                onClick={onSignInClick}
                                className="text-slate-600 dark:text-slate-300 hover:text-blue-500 font-medium transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={onSignUpClick}
                                style={{ backgroundColor: tenant.primary_color }}
                                className="px-8 py-3 text-white rounded-full font-bold transition-all shadow-lg hover:opacity-90"
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
