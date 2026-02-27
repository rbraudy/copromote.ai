// Deployment Sync: Trigger Build
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SignInModal from './components/Auth/SignInModal';
// import SignUpModal from './components/Auth/SignUpModal'; // Keeping for reference/future use
import WarrantySignUpModal from './components/Auth/WarrantySignUpModal';
import ProductCatalog from './components/Dashboard/ProductCatalog';
import { Leads } from './components/Dashboard/Leads';
import { ProposalsList } from './components/Dashboard/ProposalsList';
import { PartnerPortal } from './components/External/PartnerPortal';
import NewDesign from './pages/NewDesign';
import HelpFeatures from './pages/HelpFeatures';
import HelpPricing from './pages/HelpPricing';
import HelpCheckout from './pages/HelpCheckout';
import Settings from './pages/Settings';

function DashboardLayout() {
    const { user, loading } = useAuth(); // Use Supabase Auth Hook
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'products' | 'partners' | 'proposals'>('products');

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
                                Proposals
                            </button>
                        </div>

                        {activeTab === 'products' ? (
                            <ProductCatalog user={user as any} />
                        ) : activeTab === 'partners' ? (
                            <Leads user={user as any} />
                        ) : (
                            <ProposalsList user={user as any} />
                        )}
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
                        <Route path="/partner/:leadId" element={<PartnerPortal />} />
                        <Route path="/*" element={<DashboardLayout />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </TenantProvider>
    );
}

export default App;
