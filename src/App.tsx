import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Hero from './components/Sections/Hero';
import Features from './components/Sections/Features';
import Distribution from './components/Sections/Distribution';
import CTA from './components/Sections/CTA';
import SignInModal from './components/Auth/SignInModal';
import SignUpModal from './components/Auth/SignUpModal';
import ProductCatalog from './components/Dashboard/ProductCatalog';
import { Leads } from './components/Dashboard/Leads';
import { ProposalsList } from './components/Dashboard/ProposalsList';
import { PartnerPortal } from './components/External/PartnerPortal';

function DashboardLayout() {
    const [user, setUser] = useState<User | null>(null);
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'products' | 'partners' | 'proposals'>('products');

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
                        {/* Dashboard Tabs */}
                        <div className="flex gap-4 mb-6 border-b">
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`pb-2 px-4 ${activeTab === 'products' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'}`}
                            >
                                My Products
                            </button>
                            <button
                                onClick={() => setActiveTab('partners')}
                                className={`pb-2 px-4 ${activeTab === 'partners' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'}`}
                            >
                                Partners
                            </button>
                            <button
                                onClick={() => setActiveTab('proposals')}
                                className={`pb-2 px-4 ${activeTab === 'proposals' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'}`}
                            >
                                Promotions
                            </button>
                        </div>

                        {activeTab === 'products' ? (
                            <ProductCatalog user={user} />
                        ) : activeTab === 'partners' ? (
                            <Leads user={user} />
                        ) : (
                            <ProposalsList user={user} />
                        )}
                    </div>
                ) : (
                    <>
                        <Hero />
                        <Features />
                        <Distribution />
                        <CTA />
                    </>
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
            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/*" element={<DashboardLayout />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
