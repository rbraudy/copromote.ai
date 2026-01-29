import React, { useState, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { User } from 'firebase/auth';

interface ImportProspectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

interface ParsedRow {
    CustomerName?: string;
    Name?: string;
    Phone?: string;
    Product?: string;
    Item?: string;
    PurchaseDate?: string;
    Email?: string;
    [key: string]: any;
}

export const ImportProspectsModal: React.FC<ImportProspectsModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'text/csv') {
            handleFile(droppedFile);
        } else {
            setError('Please upload a valid CSV file.');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFile(selectedFile);
        }
    };

    const handleFile = (file: File) => {
        setFile(file);
        setIsParsing(true);
        setError(null);
        setUploadStats(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setParsedData(results.data as ParsedRow[]);
                setIsParsing(false);
            },
            error: (err) => {
                setError(`Failed to parse CSV: ${err.message}`);
                setIsParsing(false);
            }
        });
    };

    const ensureCompanyProfile = async (): Promise<string | null> => {
        if (!user) return null;

        // 1. Check if profile exists
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('user_id', user.uid)
            .single();

        if (profile?.company_id) return profile.company_id;

        // 2. If not, create default Company and Profile (Lazy Init for MVP)
        const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({ name: `${user.email?.split('@')[0]}'s Company` })
            .select()
            .single();

        if (companyError || !newCompany) {
            console.error("Failed to create company", companyError);
            return null;
        }

        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                user_id: user.uid,
                company_id: newCompany.id,
                role: 'admin'
            });

        if (profileError) console.error("Failed to create profile", profileError);

        return newCompany.id;
    };

    const processUpload = async () => {
        if (!parsedData.length || !user) return;
        setIsUploading(true);
        let successCount = 0;
        let failedCount = 0;

        try {
            const companyId = await ensureCompanyProfile();
            if (!companyId) throw new Error("Could not verify Company Profile. Please contact support.");

            for (const row of parsedData) {
                // Normalize keys (handle "Name" vs "Customer Name", etc.)
                const name = row.CustomerName || row.Name;
                const phone = row.Phone;
                const product = row.Product || row.Item;
                const email = row.Email || null;
                // Default to today if missing, or handle undefined
                const purchaseDate = row.PurchaseDate ? new Date(row.PurchaseDate) : new Date();

                if (!name || !phone || !product) {
                    failedCount++;
                    continue;
                }

                const { error: insertError } = await supabase
                    .from('warranty_prospects')
                    .insert({
                        seller_id: user.uid,
                        company_id: companyId, // Tagging with Company ID
                        customer_name: name,
                        phone: phone, // TODO: Normalize here if needed, or rely on function
                        product_name: product,
                        email: email,
                        purchase_date: purchaseDate.toISOString(),
                        status: 'new'
                    });

                if (insertError) {
                    console.error('Insert error:', insertError);
                    failedCount++;
                } else {
                    successCount++;
                }
            }
            setUploadStats({ success: successCount, failed: failedCount });
            if (successCount > 0) {
                setTimeout(() => {
                    onSuccess();
                    // Optional: keep open to show stats or close automatically
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-2xl">
                            <Upload className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Import Prospects</h2>
                            <p className="text-slate-400">Upload a CSV to bulk add customers.</p>
                        </div>
                    </div>

                    {!file ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50'
                                }`}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="csv-upload"
                            />
                            <label htmlFor="csv-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                <FileText className="w-12 h-12 text-slate-500 mb-4" />
                                <p className="text-lg font-medium text-slate-300 mb-2">Drop CSV here or click to browse</p>
                                <p className="text-xs text-slate-500 text-center max-w-sm">
                                    Required Columns: Name, Phone, Product<br />
                                    Optional: Email, Purchase Date
                                </p>
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <FileText className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white text-sm">{file.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {parsedData.length} records found
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 hover:bg-red-500/10 rounded"
                                >
                                    Change
                                </button>
                            </div>

                            {uploadStats ? (
                                <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700">
                                    <div className="flex justify-center mb-4">
                                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Import Complete!</h3>
                                    <p className="text-slate-400">
                                        <span className="text-green-400 font-bold">{uploadStats.success}</span> added,{' '}
                                        <span className="text-red-400 font-bold">{uploadStats.failed}</span> skipped.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-slate-800/30 rounded-xl p-4 max-h-40 overflow-y-auto text-xs text-slate-400 font-mono border border-slate-800">
                                        <p className="mb-2 text-slate-500 font-bold uppercase tracking-wider">Preview (First 3 Rows):</p>
                                        {parsedData.slice(0, 3).map((row, i) => (
                                            <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">
                                                {JSON.stringify(row)}
                                            </div>
                                        ))}
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        onClick={processUpload}
                                        disabled={isUploading}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5" />
                                                Import {parsedData.length} Prospects
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
