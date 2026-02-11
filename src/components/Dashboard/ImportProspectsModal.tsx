import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';

interface ImportProspectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: any;
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

// --- Helper Functions ---
const getValue = (row: any, ...aliases: string[]) => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
        // Exact match first (case-insensitive keys)
        const exactKey = keys.find(k => k.toLowerCase() === alias.toLowerCase());
        if (exactKey && (row[exactKey] !== undefined && row[exactKey] !== null && row[exactKey] !== '')) return row[exactKey];

        // Partial match
        const keyPartial = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()));
        if (keyPartial && (row[keyPartial] !== undefined && row[keyPartial] !== null && row[keyPartial] !== '')) return row[keyPartial];
    }
    return null;
};

const getColumnName = (row: any, ...aliases: string[]) => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
        const exactKey = keys.find(k => k.toLowerCase() === alias.toLowerCase());
        if (exactKey) return exactKey;
        const keyPartial = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()));
        if (keyPartial) return keyPartial;
    }
    return null;
};

const parseCurrency = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const strVal = String(value);
    const clean = strVal.replace(/[^0-9.]/g, '');
    if (!clean) return 0;
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
};


export const ImportProspectsModal: React.FC<ImportProspectsModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<{ success: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [failureReason, setFailureReason] = useState<string | null>(null);

    // Validation State
    const [validationReport, setValidationReport] = useState<{
        mapped: { label: string; status: 'ok' | 'missing'; value?: string; col?: string }[];
        warnings: string[];
        critical: string[];
    } | null>(null);

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
        setError(null);
        setUploadStats(null);
        setFailureReason(null);
        setValidationReport(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const sanitizedData = results.data.map((row: any) => {
                    const newRow: any = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().replace(/^\uFEFF/, '');
                        newRow[cleanKey] = row[key];
                    });
                    return newRow;
                });
                setParsedData(sanitizedData as ParsedRow[]);
                analyzeData(sanitizedData);
            },
            error: (err) => {
                setError(`Failed to parse CSV: ${err.message}`);
            }
        });
    };

    const analyzeData = (data: any[]) => {
        if (!data || data.length === 0) return;
        const firstRow = data[0]; // Check first row for mapping

        const report = {
            mapped: [] as any[],
            warnings: [] as string[],
            critical: [] as string[]
        };

        // Helper
        const checkField = (label: string, isRequired: boolean, ...aliases: string[]) => {
            const col = getColumnName(firstRow, ...aliases);
            const val = getValue(firstRow, ...aliases);
            let status = 'ok';

            if (!col || val === null || val === undefined) {
                status = 'missing';
                if (isRequired) report.critical.push(`Missing required column: ${label}`);
                else report.warnings.push(`Column missing: ${label} (Will use Defaults)`);
            }

            report.mapped.push({ label, status, value: String(val).substring(0, 20), col }); // Truncate value for display
            return val;
        };

        const phoneVal = checkField('Phone', true, 'Phone', 'Mobile', 'Cell', 'Telephone', 'Tel', 'Contact Number');
        checkField('Name', true, 'Customer Name', 'Name', 'Customer', 'Client', 'Contact', 'Bill To', 'Ship To');
        checkField('Product', true, 'Product Name', 'Product', 'Item', 'Description', 'Model', 'SKU');

        // Pricing Mappings
        const price2 = checkField('2yr Price', false, '2 Yrs. HELP Price', '2 Year HELP Price', '2 Year', '2yr Price', '2yr', 'Plan 2yr', 'Plan 2');
        const price3 = checkField('3yr Price', false, '3 Yrs. HELP Price', '3 Year HELP Price', '3 Year', '3yr Price', '3yr', 'Plan 3yr', 'Plan 3');

        // 2. Data Quality Checks
        if (phoneVal) {
            const phoneStr = String(phoneVal);
            if (phoneStr.toLowerCase().includes('e+')) {
                report.critical.push(`Scientific Notation detected in Phone (${phoneStr}). Excel Formatting is Corrupt! Please format as 'Text' in Excel and re-save.`);
            } else if (phoneStr.replace(/\D/g, '').length < 10) {
                report.warnings.push(`Phone number looks short (${phoneStr}). Check formatting.`);
            }
        }

        if (price2 && parseCurrency(price2) === 0) report.warnings.push(`2yr Price parsed as $0 (${price2}).`);
        if (price3 && parseCurrency(price3) === 0) report.warnings.push(`3yr Price parsed as $0 (${price3}).`);

        setValidationReport(report);
    };

    const processUpload = async () => {
        if (!parsedData.length || !user) return;

        if (validationReport?.critical.length) {
            const confirmed = window.confirm("Critical issues detected. Import may fail or produce bad data. Proceed anyway?");
            if (!confirmed) return;
        }

        setIsUploading(true);
        setFailureReason(null);
        let successCount = 0;
        let failedCount = 0;
        let capturedError = "";

        try {
            for (const row of parsedData) {
                try {
                    // Ignore completely empty rows
                    if (Object.values(row).every(x => x === null || x === '')) continue;

                    let name = getValue(row, 'Customer Name', 'Name', 'Customer', 'Client', 'Contact', 'Bill To', 'Ship To', 'Customer#', 'Owner');
                    const lastName = getValue(row, 'Last Name', 'Surname', 'Family Name');

                    if (name && lastName && !String(name).includes(' ')) {
                        name = `${name} ${lastName}`;
                    }
                    name = String(name || '').trim(); // Ensure string

                    const phone = getValue(row, 'Phone', 'Mobile', 'Cell', 'Telephone', 'Tel', 'Contact Number');
                    const product = String(getValue(row, 'Product Name', 'Product', 'Item', 'Description', 'Model', 'SKU', 'Material') || '').trim();
                    const email = String(getValue(row, 'Email', 'E-mail', 'Mail') || '').trim();

                    // Purchase Date Parsing
                    const dateStr = getValue(row, 'Purchase Date', 'Date', 'Order Date', 'Invoice Date');
                    let purchaseDate = new Date();
                    if (dateStr) {
                        const parsed = new Date(dateStr);
                        if (!isNaN(parsed.getTime())) purchaseDate = parsed;
                    }

                    // Validate Date
                    if (isNaN(purchaseDate.getTime())) {
                        purchaseDate = new Date();
                    }

                    const expiryDate = new Date(purchaseDate);
                    expiryDate.setDate(expiryDate.getDate() + 30);

                    if (!name || !phone || !product) {
                        failedCount++;
                        continue;
                    }

                    const cleanPhone = String(phone).replace(/[^\d+]/g, '');

                    const price2yrRaw = getValue(row, '2 Yrs. HELP Price', '2 Year HELP Price', '2 Year', '2yr Price', '2yr', 'Plan 2yr', 'Plan 2');
                    const price3yrRaw = getValue(row, '3 Yrs. HELP Price', '3 Year HELP Price', '3 Year', '3yr Price', '3yr', 'Plan 3yr', 'Plan 3');
                    const purchaseAmtRaw = getValue(row, 'Purchase Amount', 'Price', 'Value', 'Amount', 'Cost', 'Product Price', 'Item Value');

                    const price2yr = parseCurrency(price2yrRaw) ?? 19900;
                    const price3yr = parseCurrency(price3yrRaw) ?? 29900;
                    const purchaseAmount = parseCurrency(purchaseAmtRaw) ?? 0;

                    let insertPayload: any = {
                        seller_id: user.uid,
                        company_id: null,
                        customer_name: name,
                        phone: cleanPhone,
                        product_name: product,
                        email: email,
                        purchase_date: purchaseDate.toISOString(),
                        expiry_date: expiryDate.toISOString(),
                        status: 'new',
                        warranty_price_2yr: price2yr,
                        warranty_price_3yr: price3yr,
                        purchase_amount: purchaseAmount
                    };

                    // SECURITY FIX: Use RPC because Firebase Auth doesn't set auth.uid() in Postgres
                    // We pass the user.uid manually, and the RPC looks up the company.
                    let { error: insertError } = await supabase
                        .rpc('create_prospect', {
                            p_user_id: user.uid,
                            p_prospect: insertPayload
                        });

                    /* 
                       Note: RPC handles the insert. 
                       The 'retry logic' for generated columns is less relevant now as the RPC handles it,
                       but if we needed it, we'd adjust the RPC. 
                       For now, assuming RPC handles the ISO strings correctly.
                    */

                    if (insertError) {
                        console.error('Insert error details:', insertError);
                        if (!capturedError) capturedError = `DB Error: ${insertError.message}`;
                        failedCount++;
                    } else {
                        successCount++;
                    }
                } catch (rowError: any) {
                    console.error("Row processing crash:", rowError);
                    if (!capturedError) capturedError = `Row Crash: ${rowError.message}`;
                    failedCount++;
                }
            }

            setUploadStats({ success: successCount, failed: failedCount });
            if (capturedError) setFailureReason(capturedError);

            if (successCount > 0) {
                setTimeout(() => {
                    onSuccess();
                }, 3000); // Increased timeout to read success message
            }
        } catch (err: any) {
            console.error("Critical Upload Error:", err);
            setError(`Critical Error: ${err.message}`);
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

                            {/* Validation Report Card */}
                            {validationReport && (
                                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                                    <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">CSV Data Quality Check</h3>

                                    <div className="space-y-2 mb-4">
                                        {validationReport.mapped.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400">{m.label}:</span>
                                                <div className="text-right">
                                                    <span className={m.status === 'ok' ? 'text-green-400' : 'text-red-400'}>
                                                        {m.status === 'ok' ? `Found (${m.col})` : 'Missing'}
                                                    </span>
                                                    {m.value && <div className="text-[10px] text-slate-500">{m.value}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {validationReport.warnings.length > 0 && (
                                        <div className="mb-3 p-3 bg-yellow-500/10 rounded-lg text-xs text-yellow-300 space-y-1">
                                            {validationReport.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                                        </div>
                                    )}
                                    {validationReport.critical.length > 0 && (
                                        <div className="p-3 bg-red-500/10 rounded-lg text-xs text-red-300 space-y-1 font-bold">
                                            {validationReport.critical.map((c, i) => <div key={i}>❌ {c}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {uploadStats ? (
                                <div className="bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700">
                                    <div className="flex justify-center mb-4">
                                        <CheckCircle className="w-12 h-12 text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Import Complete!</h3>
                                    <p className="text-slate-400">
                                        <span className="text-green-400 font-bold">{uploadStats.success}</span> added,{' '}
                                        <span className="text-red-400 font-bold">{uploadStats.failed}</span> skipped.
                                    </p>
                                    {failureReason && (
                                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                                            <strong>Failure Reason:</strong> {failureReason}
                                        </div>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        onClick={processUpload}
                                        disabled={isUploading || !!(validationReport?.critical.length)}
                                        className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg 
                                            ${validationReport?.critical.length ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
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
