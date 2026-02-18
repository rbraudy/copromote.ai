import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronDown, Check, Globe } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Company {
    id: string;
    name: string;
}

export const CompanySwitcher: React.FC = () => {
    const { companyId, setImpersonatedCompanyId, isSuperAdmin } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        if (isSuperAdmin) {
            fetchCompanies();
        }
    }, [isSuperAdmin]);

    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('id, name')
                .order('name');

            if (error) throw error;
            if (data) setCompanies(data);
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    const toggleOpen = () => {
        if (!isOpen) {
            updateCoords();
        }
        setIsOpen(!isOpen);
    };

    if (!isSuperAdmin) return null;

    const activeCompany = companies.find(c => c.id === companyId);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={toggleOpen}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-sm font-medium transition-all group min-w-[200px]"
            >
                <div className="p-1.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <Building2 size={14} className="text-blue-400" />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter leading-none mb-0.5">Viewing Context</span>
                    <span className="text-white font-bold truncate max-w-[150px]">{activeCompany?.name || 'All Data'}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-500 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="absolute mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2"
                        style={{
                            top: coords.top,
                            left: coords.left,
                            width: coords.width > 256 ? coords.width : 256
                        }}
                    >
                        <div className="px-4 py-2 border-b border-slate-800 mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Globe size={10} />
                                Select Company Context
                            </span>
                        </div>

                        <button
                            onClick={() => {
                                setImpersonatedCompanyId(null);
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors text-left"
                        >
                            <span className={`text-sm ${!companyId ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                                Reset to My Account
                            </span>
                            {!companyId && <Check size={14} className="text-blue-400" />}
                        </button>

                        <div className="max-h-64 overflow-y-auto">
                            {companies.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setImpersonatedCompanyId(c.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors text-left group"
                                >
                                    <span className={`text-sm truncate ${companyId === c.id ? 'text-blue-400 font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        {c.name}
                                    </span>
                                    {companyId === c.id && <Check size={14} className="text-blue-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
