import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
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

function DashboardLayout() {
    const [user, setUser] = useState<User | null>(null);
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header
                userEmail={user?.email || null}
                onSignInClick={() => setIsSignInOpen(true)}
                onSignUpClick={() => setIsSignUpOpen(true)}
                onSignOutClick={handleSignOut}
            />
            <main className="flex-grow">
                {user ? (
                    <div className="container mx-auto px-4 pt-24 pb-8">
                        <WarrantyDashboard user={user} />
                    </div>
                ) : (
                    <NewDesign />
                )}
            </main>
            <Footer />
            <SignInModal
                isOpen={isSignInOpen}
                onClose={() => setIsSignInOpen(false)}
                onSignInSuccess={(user) => {
                    setUser(user);
                    setIsSignInOpen(false);
                }}
            />
            <WarrantySignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            {/* <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} /> */}
        </div>
    );
}

// Imports moved to top

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/design-v2" element={<NewDesign />} />
                <Route path="/henrys" element={<HelpFeatures />} />
                <Route path="/henrys/pricing" element={<HelpPricing />} />
                <Route path="/henrys/checkout" element={<HelpCheckout />} />
                <Route path="/*" element={<DashboardLayout />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
