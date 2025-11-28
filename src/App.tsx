import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Hero from './components/Sections/Hero';
import Features from './components/Sections/Features';
import Distribution from './components/Sections/Distribution';
import CTA from './components/Sections/CTA';

function App() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
                <Hero />
                <Features />
                <Distribution />
                <CTA />
            </main>
            <Footer />
        </div>
    );
}

export default App;
