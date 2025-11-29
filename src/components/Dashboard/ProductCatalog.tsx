import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, Grid, List, Plus, Loader } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, limit, startAfter, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
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
    const [loading, setLoading] = useState(false); // Start false to show UI immediately
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [storeUrl, setStoreUrl] = useState('');
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    // Pagination state
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const PRODUCTS_PER_PAGE = 20;

    useEffect(() => {
        if (user) {
            fetchProducts();
        }
    }, [user]);

    const fetchProducts = async (isLoadMore = false) => {
        if (!user) return;

        try {
            setLoading(true);
            let q = query(
                collection(db, "products"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(PRODUCTS_PER_PAGE)
            );

            if (isLoadMore && lastVisible) {
                q = query(q, startAfter(lastVisible));
            }

            const snapshot = await getDocs(q);
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === PRODUCTS_PER_PAGE);

            if (isLoadMore) {
                setProducts(prev => [...prev, ...fetchedProducts]);
            } else {
                setProducts(fetchedProducts);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const performSync = async (url: string) => {
        try {
            setSyncing(true);
            setSyncStatus('Detecting platform...');
            setSyncProgress({ current: 0, total: 0 });

            const platform = await detectPlatform(url);
            let fetchedProducts: Product[] = [];

            const onBatch = async (batch: Product[], _page: number, totalSoFar: number) => {
                setSyncStatus(`Syncing... (${totalSoFar} products found)`);
                setSyncProgress(prev => ({ ...prev, current: totalSoFar }));

                const batchWrite = writeBatch(db);
                const newProducts: Product[] = [];

                batch.forEach(p => {
                    // Deterministic ID: uid_platform_externalId
                    let externalId = p.shopifyProductId;
                    if (!externalId && p.platform === 'woocommerce') {
                        externalId = p.id;
                    }

                    let docRef;
                    if (externalId && p.platform) {
                        const safeId = `${user.uid}_${p.platform}_${externalId}`;
                        docRef = doc(db, "products", safeId);
                    } else {
                        docRef = doc(collection(db, "products"));
                    }

                    const productData = {
                        ...p,
                        userId: user.uid,
                        updatedAt: new Date().toISOString(),
                        createdAt: p.createdAt || new Date().toISOString()
                    };
                    batchWrite.set(docRef, productData);
                    newProducts.push({ id: docRef.id, ...productData } as Product);
                });

                await batchWrite.commit();

                // Update local state
                setProducts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });
            };

            if (platform === 'shopify') {
                setSyncStatus('Shopify detected. Fetching products...');
                fetchedProducts = await fetchShopifyProducts(url, onBatch);
            } else if (platform === 'woocommerce') {
                setSyncStatus('WooCommerce detected. Fetching products...');
                fetchedProducts = await fetchWooCommerceProducts(url, onBatch);
            } else {
                setSyncStatus('Platform unknown. Trying generic fetch...');
                fetchedProducts = await fetchShopifyProducts(url, onBatch);
                if (fetchedProducts.length === 0) {
                    fetchedProducts = await fetchWooCommerceProducts(url, onBatch);
                }
            }

            if (fetchedProducts.length === 0) {
                throw new Error('No products found. Store might be private or not supported.');
            }

            setSyncStatus('Sync complete!');
            setTimeout(() => {
                setSyncing(false);
                setSyncStatus('');
                setSyncProgress({ current: 0, total: 0 });
                setIsSyncModalOpen(false);
            }, 2000);

        } catch (error: any) {
            console.error("Sync error:", error);
            setSyncStatus(`Error: ${error.message}`);
            setTimeout(() => {
                setSyncing(false);
                setSyncStatus('');
            }, 5000);
        }
    };

    const handleSyncStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeUrl) return;
        await performSync(storeUrl);
    };

    const handleClearCatalog = async () => {
        if (!user) return;
        if (!window.confirm("Are you sure you want to delete ALL products? This cannot be undone.")) return;

        setLoading(true);
        try {
            const q = query(collection(db, "products"), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            setProducts([]);
            setLastVisible(null);
            setHasMore(false);
            alert("Catalog cleared successfully.");
        } catch (error) {
            console.error("Error clearing catalog:", error);
            alert("Failed to clear catalog");
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto pt-24">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Product Catalog</h1>
                    <p className="text-slate-400">Manage and sync your inventory</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsSyncModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-violet-600 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw size={20} />
                        Sync Store
                    </button>
                    <button
                        onClick={handleClearCatalog}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
                        title="Clear Catalog"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-secondary-dark border border-slate-700 rounded-lg text-white focus:outline-none focus:border-accent-purple"
                    />
                </div>
                <div className="flex bg-secondary-dark rounded-lg p-1 border border-slate-700">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Grid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Sync Status */}
            {syncing && (
                <div className="mb-6 p-4 bg-accent-purple/10 border border-accent-purple/20 rounded-lg">
                    <div className="flex items-center gap-3 text-accent-purple mb-2">
                        <RefreshCw className="animate-spin" size={20} />
                        <span className="font-medium">{syncStatus}</span>
                    </div>
                    {syncProgress.total > 0 && (
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-accent-purple h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Product Grid/Table */}
            {filteredProducts.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-secondary-dark border border-slate-700 rounded-xl overflow-hidden hover:border-accent-purple/50 transition-colors group">
                                <div className="aspect-square relative overflow-hidden bg-slate-800">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white uppercase">
                                        {product.platform}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-white mb-1 truncate" title={product.name}>{product.name}</h3>
                                    <p className="text-accent-purple font-bold">${product.price.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-secondary-dark border border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800 text-slate-400">
                                <tr>
                                    <th className="p-4">Product</th>
                                    <th className="p-4">Platform</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Date Added</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-slate-800 overflow-hidden flex-shrink-0">
                                                    {product.imageUrl && (
                                                        <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <span className="text-white font-medium">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs uppercase border border-slate-600">
                                                {product.platform}
                                            </span>
                                        </td>
                                        <td className="p-4 text-white">${product.price.toFixed(2)}</td>
                                        <td className="p-4 text-slate-400">
                                            {new Date(product.createdAt || '').toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="text-center py-20 bg-secondary-dark/50 rounded-2xl border border-slate-700 border-dashed">
                    <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
                    <p className="text-slate-400 mb-6">Sync your store to get started</p>
                    <button
                        onClick={() => setIsSyncModalOpen(true)}
                        className="px-6 py-3 bg-accent-purple hover:bg-violet-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Sync Products
                    </button>
                </div>
            )}

            {/* Load More */}
            {hasMore && products.length > 0 && !loading && (
                <div className="mt-8 text-center">
                    <button
                        onClick={() => fetchProducts(true)}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Load More
                    </button>
                </div>
            )}

            {/* Sync Modal */}
            <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sync Store">
                <form onSubmit={handleSyncStore} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Store URL</label>
                        <input
                            type="text"
                            value={storeUrl}
                            onChange={(e) => setStoreUrl(e.target.value)}
                            placeholder="e.g., mystore.com"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent-purple"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsSyncModalOpen(false)}
                            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={syncing || !storeUrl}
                            className="px-6 py-2 bg-accent-purple hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                            {syncing ? 'Syncing...' : 'Start Sync'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProductCatalog;
