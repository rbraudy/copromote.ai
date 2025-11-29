import { useState, useEffect } from 'react';
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

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            // alert("Signed out successfully."); // Optional: remove alert for smoother experience
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    // Removed blocking loader to show app shell immediately
    // if (loading) { ... }

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
                    <ProductCatalog user={user} />
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
                    setLoading(false);
                    setIsSignInOpen(false);
                }}
            />
            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
        </div>
    );
}

export default App;
