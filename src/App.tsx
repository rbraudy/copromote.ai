import { useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Hero from './components/Sections/Hero';
import Features from './components/Sections/Features';
import Distribution from './components/Sections/Distribution';
import CTA from './components/Sections/CTA';
import SignInModal from './components/Auth/SignInModal';
import SignUpModal from './components/Auth/SignUpModal';

function App() {
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col">
            <Header
                onSignInClick={() => setIsSignInOpen(true)}
                onSignUpClick={() => setIsSignUpOpen(true)}
            />
            <main className="flex-grow">
                <Hero />
                <Features />
                <Distribution />
                <CTA />
            </main>
            <Footer />
            <SignInModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
        </div>
    );
}

export default App;
