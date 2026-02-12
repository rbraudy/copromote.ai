import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SignInModal from './components/Auth/SignInModal';
// import SignUpModal from './components/Auth/SignUpModal'; // Keeping for reference/future use
import WarrantySignUpModal from './components/Auth/WarrantySignUpModal';
import { WarrantyDashboard } from './components/Dashboard/WarrantyDashboard';
import NewDesign from './pages/NewDesign';
import HelpFeatures from './pages/HelpFeatures';
import HelpPricing from './pages/HelpPricing';
import HelpCheckout from './pages/HelpCheckout';
import Settings from './pages/Settings';

function DashboardLayout() {
    const { user, loading } = useAuth(); // Use Supabase Auth Hook
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col">
            <Header
                onSignInClick={() => setIsSignInOpen(true)}
                onSignUpClick={() => setIsSignUpOpen(true)}
            />
            <main className="flex-grow">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : user ? (
                    <div className="container mx-auto px-4 pt-24 pb-8">
                        {/* We cast to any because WarrantyDashboard expects a Firebase User (for now) */}
                        {/* But Supabase User is compatible enough for now, we'll fix WarrantyDashboard next */}
                        <WarrantyDashboard user={user as any} />
                    </div>
                ) : (
                    <NewDesign />
                )}
            </main>
            <Footer />
            <SignInModal
                isOpen={isSignInOpen}
                onClose={() => setIsSignInOpen(false)}
                onSignInSuccess={() => {
                    // Auth state matches automatically via context
                    setIsSignInOpen(false);
                }}
            />
            <WarrantySignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
        </div>
    );
}

// Imports moved to top

function App() {
    return (
        <TenantProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/design-v2" element={<NewDesign />} />
                        <Route path="/henrys" element={<HelpFeatures />} />
                        <Route path="/henrys/pricing" element={<HelpPricing />} />
                        <Route path="/henrys/checkout" element={<HelpCheckout />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/*" element={<DashboardLayout />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </TenantProvider>
    );
}

export default App;
