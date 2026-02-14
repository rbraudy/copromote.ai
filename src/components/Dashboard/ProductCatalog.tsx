// ProductCatalog component migrated to Supabase
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, Grid, List, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product, User } from '../../types';
import { fetchShopifyProducts } from '../../utils/shopify';
import { fetchWooCommerceProducts } from '../../utils/woocommerce';
import { detectPlatform } from '../../utils/platform';
import Modal from '../UI/Modal';

interface ProductCatalogProps {
    user: User;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ user }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [storeUrl, setStoreUrl] = useState('');
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [debugLog, setDebugLog] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const isSyncingRef = React.useRef(false);
    const observerTarget = React.useRef(null);

    // ---------------------------------------------------------------
    // 1️⃣ Helper: invoke the Supabase Edge Function to upsert products
    // ---------------------------------------------------------------
    const syncViaEdge = async (products: Product[]) => {
        // UPDATED: Use 'SyncProducts' (PascalCase) to match the dashboard name
        const { data, error } = await supabase.functions.invoke('SyncProducts', {
            method: 'POST',
            body: JSON.stringify({ products, user_id: user.id }), // Pass user_id explicitly since we use Firebase Auth
        });
        if (error) {
            throw error;
        }
        return data; // { message, inserted, updated, total }
    };

    // ---------------------------------------------------------------
    // 2️⃣ Fetch products from Supabase
    // ---------------------------------------------------------------
    const fetchProducts = async () => {
        if (!user || isSyncingRef.current) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id)
                .order('createdAt', { ascending: false });

            if (error) {
                // Check for specific migration errors
                if (error.code === '42703' || error.code === '22P02' || error.message.includes('does not exist')) {
                    alert('Database Error: Schema mismatch detected.\n\nPlease run the migration script "20251202_fix_userid_policy.sql" in your Supabase SQL Editor to fix this.');
                }
                throw error;
            }
            setProducts(data as Product[]);
        } catch (e) {
            console.error('Error fetching products:', e);
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------------------------------------------
    // 3️⃣ Main sync routine – now uses the edge function
    // ---------------------------------------------------------------
    const performSync = async (url: string) => {
        try {
            setSyncing(true);
            isSyncingRef.current = true;
            setSyncStatus('Detecting platform...');
            setSyncProgress({ current: 0, total: 0 });
            setDebugLog('Starting sync...');

            const log = (msg: string) => {
                console.log(msg);
                setDebugLog(prev => prev + '\n' + msg);
            };

            const platform = await detectPlatform(url);
            let fetchedProducts: Product[] = [];

            const onBatch = (
                batch: Product[],
                _page: number,
                totalSoFar: number,
                totalCount?: number
            ) => {
                if (totalSoFar > 0) setIsSyncModalOpen(false);
                setSyncStatus(`Fetching... (${totalSoFar} products found)`);
                setSyncProgress(prev => ({
                    current: totalSoFar,
                    total: totalCount || prev.total || 0,
                }));
            };

            if (platform === 'shopify') {
                fetchedProducts = await fetchShopifyProducts(url, onBatch, setSyncStatus);
            } else if (platform === 'woocommerce') {
                fetchedProducts = await fetchWooCommerceProducts(url, onBatch);
            } else {
                fetchedProducts = await fetchShopifyProducts(url, onBatch, setSyncStatus);
                if (fetchedProducts.length === 0) {
                    fetchedProducts = await fetchWooCommerceProducts(url, onBatch);
                }
            }

            if (fetchedProducts.length === 0) throw new Error('No products found.');
            log(`Fetched ${fetchedProducts.length} products. Starting save...`);
            setSyncStatus(`Saving ${fetchedProducts.length} products via Edge Function...`);

            const result = await syncViaEdge(fetchedProducts);
            log(`[Sync] ${result.message}: ${result.inserted} inserted, ${result.updated} updated`);
            setSyncStatus('Sync complete!');

            await fetchProducts();

            setTimeout(() => {
                setSyncing(false);
                setSyncStatus('');
                setSyncProgress({ current: 0, total: 0 });
                setIsSyncModalOpen(false);
                isSyncingRef.current = false;
            }, 2000);
        } catch (error: any) {
            console.error('Sync error:', error);
            setSyncStatus(`Error: ${error.message}`);
            setTimeout(() => {
                setSyncing(false);
                setSyncStatus('');
            }, 5000);
        } finally {
            isSyncingRef.current = false;
        }
    };

    // ---------------------------------------------------------------
    // 4️⃣ UI handlers
    // ---------------------------------------------------------------
    const handleSyncStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeUrl) return;
        await performSync(storeUrl);
    };

    const handleClearCatalog = async () => {
        if (!user) return;
        if (!window.confirm('Are you sure you want to delete ALL products? This cannot be undone.')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('products').delete().eq('user_id', user.id);
            if (error) throw error;
            setProducts([]);
            alert('Catalog cleared successfully.');
        } catch (e) {
            console.error('Error clearing catalog:', e);
            alert('Failed to clear catalog');
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------------------------------------------
    // 5️⃣ Effects & infinite scroll
    // ---------------------------------------------------------------
    useEffect(() => {
        if (user) fetchProducts();
    }, [user]);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (
                entries[0].isIntersecting &&
                !loading &&
                visibleCount < filteredProducts.length
            ) {
                setVisibleCount(prev => Math.min(prev + 20, filteredProducts.length));
            }
        }, { threshold: 0.1 });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [loading, visibleCount, filteredProducts.length]);

    // ---------------------------------------------------------------
    // 6️⃣ Render
    // ---------------------------------------------------------------
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {debugLog && (
                <pre className="fixed top-20 left-4 z-50 bg-black/80 text-green-400 p-4 rounded max-w-md max-h-96 overflow-auto text-xs font-mono border border-green-500/30 pointer-events-none">
                    {debugLog}
                </pre>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Product Catalog</h1>
                    <p className="text-slate-400">Manage and sync your inventory</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsSyncModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-violet-600 text-white rounded-lg transition-colors">
                        <RefreshCw size={20} /> Sync Store
                    </button>
                    <button onClick={handleClearCatalog} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors" title="Clear Catalog">
                        <Trash2 size={20} />
                    </button>
                    <button onClick={async () => {
                        try {
                            const { data, error } = await supabase.functions.invoke('enrichProducts', { method: 'POST' });
                            if (error) throw error;
                            alert(`Enrichment Started! ${data.message}`);
                            fetchProducts(); // Refresh to see changes (eventually)
                        } catch (e: any) {
                            alert(`Enrichment Failed: ${e.message}`);
                        }
                    }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                        Enrich Catalog
                    </button>
                    <button onClick={async () => {
                        try {
                            const { error } = await supabase.from('products').insert({
                                name: 'Test Product',
                                createdAt: new Date().toISOString(),
                                user_id: user.id,
                            });
                            if (error) throw error;
                            alert('Connection Successful! Write verified.');
                        } catch (e: any) {
                            alert(`Connection Failed: ${e.message}`);
                            console.error(e);
                        }
                    }} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
                        Test Conn
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        name="search"
                        id="search"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-secondary-dark border border-slate-700 rounded-lg text-white focus:outline-none focus:border-accent-purple"
                    />
                </div>
                <div className="flex bg-secondary-dark rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Grid size={20} />
                    </button>
                    <button onClick={() => setViewMode('table')} className={`p-2 rounded ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Background Sync Indicator */}
            {syncing && !isSyncModalOpen && (
                <div className="fixed bottom-6 right-6 bg-secondary-dark border border-accent-purple/30 p-4 rounded-lg shadow-lg z-50 w-80 animate-slide-in">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-white font-medium">
                            <RefreshCw className="animate-spin text-accent-purple" size={16} />
                            <span>Syncing...</span>
                        </div>
                        <span className="text-xs text-slate-400">
                            {syncProgress.total > 0
                                ? `${syncProgress.current} / ${syncProgress.total}`
                                : `${syncProgress.current} scanned`} products
                        </span>
                    </div>
                    {syncProgress.total > 0 && (
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                            <div
                                className="bg-accent-purple h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Product Grid / Table */}
            {filteredProducts.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredProducts.slice(0, visibleCount).map(product => (
                            <div
                                key={product.id}
                                className="bg-secondary-dark border border-slate-700 rounded-xl overflow-hidden hover:border-accent-purple/50 transition-colors group"
                            >
                                <div className="aspect-square relative overflow-hidden bg-slate-800">
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={e => {
                                            (e.target as HTMLImageElement).src =
                                                'https://placehold.co/300x300?text=No+Image';
                                        }}
                                    />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 bg-secondary-dark/90 text-white rounded-lg hover:bg-accent-purple transition-colors">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-medium text-white mb-1 truncate">{product.name}</h3>
                                    <p className="text-accent-purple font-bold">
                                        ${product.price.toFixed(2)}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                                        <span className="capitalize">{product.platform}</span>
                                        <span>{new Date(product.createdAt || '').toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {visibleCount < filteredProducts.length && (
                            <div ref={observerTarget as any} className="col-span-full mt-8 text-center py-4">
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2 text-slate-400">
                                        <RefreshCw className="animate-spin" size={20} />
                                        <span>Loading more products...</span>
                                    </div>
                                ) : (
                                    <div className="h-4" />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-secondary-dark border border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/50 text-slate-400">
                                <tr>
                                    <th className="p-4">Product</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Platform</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredProducts.slice(0, visibleCount).map(product => (
                                    <tr key={product.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                                                    onError={e => {
                                                        (e.target as HTMLImageElement).src =
                                                            'https://placehold.co/300x300?text=No+Image';
                                                    }}
                                                />
                                                <span className="font-medium text-white">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-white">${product.price.toFixed(2)}</td>
                                        <td className="p-4 text-slate-400 capitalize">{product.platform}</td>
                                        <td className="p-4 text-slate-400">{new Date(product.createdAt || '').toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <button className="p-2 text-slate-400 hover:text-accent-purple transition-colors">
                                                <Plus size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {visibleCount < filteredProducts.length && (
                                    <tr ref={observerTarget as any}>
                                        <td colSpan={5} className="p-4 text-center">
                                            {loading ? (
                                                <div className="flex items-center justify-center gap-2 text-slate-400">
                                                    <RefreshCw className="animate-spin" size={20} />
                                                    <span>Loading more products...</span>
                                                </div>
                                            ) : (
                                                <div className="h-4" />
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="text-center py-20 bg-secondary-dark border border-slate-700 rounded-xl">
                    <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
                    <p className="text-slate-400 max-w-md mx-auto mb-6">
                        {searchTerm ? 'Try adjusting your search terms' : 'Sync a store to get started'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => setIsSyncModalOpen(true)}
                            className="px-6 py-3 bg-accent-purple hover:bg-violet-600 text-white rounded-lg transition-colors font-medium"
                        >
                            Sync Store
                        </button>
                    )}
                </div>
            )}

            {/* Sync Modal */}
            <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sync Store">
                <form onSubmit={handleSyncStore} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Store URL</label>
                        <input
                            type="text"
                            name="storeUrl"
                            id="storeUrl"
                            value={storeUrl}
                            onChange={e => setStoreUrl(e.target.value)}
                            placeholder="e.g., mystore.com"
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-accent-purple"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsSyncModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={syncing || !storeUrl} className="flex items-center gap-2 px-6 py-2 bg-accent-purple hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                            {syncing ? (<><RefreshCw className="animate-spin" size={18} /> Syncing...</>) : 'Start Sync'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProductCatalog;