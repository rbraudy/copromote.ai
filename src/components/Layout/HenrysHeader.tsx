
import { Search, ShoppingCart, User, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const HenrysHeader = () => {
    return (
        <div className="font-henrys w-full relative z-50">
            {/* Top Utility Bar */}
            <div className="bg-[#F8F8F8] text-[11px] text-[#333333] py-2 px-4 border-b border-[#E5E5E5] hidden md:block">
                <div className="max-w-[1440px] mx-auto flex justify-between items-center">
                    <div className="flex gap-6">
                        <span className="hover:text-[#F08323] cursor-pointer">Henrys.com</span>
                        <span className="hover:text-[#F08323] cursor-pointer">Photo Centre</span>
                        <span className="hover:text-[#F08323] cursor-pointer">Blog</span>
                        <span className="hover:text-[#F08323] cursor-pointer">Flyer</span>
                    </div>
                    <div className="flex gap-6">
                        <span className="flex items-center gap-1 hover:text-[#F08323] cursor-pointer">
                            <MapPin size={12} /> Stores
                        </span>
                        <span className="hover:text-[#F08323] cursor-pointer">Contact Us</span>
                        <span className="hover:text-[#F08323] cursor-pointer">Français</span>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className="bg-white py-4 px-6 shadow-sm">
                <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
                    {/* Logo */}
                    <Link to="/help" className="shrink-0">
                        <img
                            src="https://images-us-prod.cms.commerce.dynamics.com/cms/api/hbzzfqllpg/imageFileData/MA4Se6?ver=1639&w=0&h=0&q=70&m=6&f=jpg"
                            alt="Henry's"
                            className="h-8 md:h-12 w-auto"
                        />
                    </Link>

                    {/* Search Bar - Hidden on mobile */}
                    <div className="hidden md:flex flex-1 max-w-2xl relative">
                        <input
                            type="text"
                            placeholder="What are you looking for today?"
                            className="w-full bg-[#F5F5F5] border-none rounded-sm py-2.5 px-4 pr-12 text-sm focus:ring-1 focus:ring-[#F08323] outline-none"
                        />
                        <button className="absolute right-2 top-1.5 p-1 text-[#F08323] hover:text-black transition-colors">
                            <Search size={20} />
                        </button>
                    </div>

                    {/* Icons */}
                    <div className="flex items-center gap-6 text-black">
                        <div className="flex flex-col items-center cursor-pointer hover:text-[#F08323] transition-colors group">
                            <User size={24} className="stroke-[1.5]" />
                            <span className="text-[10px] uppercase font-bold mt-1 group-hover:text-[#F08323]">Sign In</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer hover:text-[#F08323] transition-colors group relative">
                            <ShoppingCart size={24} className="stroke-[1.5]" />
                            <span className="absolute -top-1 -right-1 bg-[#F08323] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">0</span>
                            <span className="text-[10px] uppercase font-bold mt-1 group-hover:text-[#F08323]">Cart</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Promo Banner */}
            <div className="bg-[#D21C2F] text-white text-center py-2 text-sm font-bold uppercase tracking-wide">
                <span className="cursor-pointer hover:underline">Free Shipping on Orders Over $99*</span>
            </div>

            {/* Mobile Search - Visible only on mobile */}
            <div className="md:hidden bg-white p-4 border-t border-gray-100">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-[#F5F5F5] border-none rounded-sm py-2 px-4 pr-10 text-sm focus:ring-1 focus:ring-[#F08323] outline-none"
                    />
                    <Search className="absolute right-3 top-2 text-gray-500" size={18} />
                </div>
            </div>
        </div>
    );
};

export default HenrysHeader;
