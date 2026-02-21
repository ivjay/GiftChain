import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSearch, HiFilter, HiLightningBolt, HiChartBar, HiInformationCircle, HiSparkles, HiViewGrid } from 'react-icons/hi';
import { mockGifts } from '../data/mockData';
import { useOnChainGifts } from '../hooks/useOnChainGifts';
import { useRecommendations, useTrackInteraction } from '../hooks/useRecommendations';
import GiftCard from '../components/GiftCard';
import { categoryEmoji, categoryLabel } from '../lib/utils';
import type { GiftCategory } from '../types';

const categories: GiftCategory[] = ['streaming', 'gaming', 'food', 'travel', 'shopping', 'music', 'education', 'fitness'];
const sortOptions = ['Newest', 'Popular', 'Price: Low', 'Price: High'];

export default function Marketplace() {
    const [search, setSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState<GiftCategory | ''>('');
    const [sortBy, setSortBy] = useState('Newest');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10]);
    const [showAlgoDetails, setShowAlgoDetails] = useState(false);

    // Fetch real on-chain minted gifts
    const { gifts: onChainGifts, loading: onChainLoading } = useOnChainGifts();

    // Combine on-chain gifts (first, highlighted) with mock gifts
    const allGifts = useMemo(() => {
        return [...onChainGifts, ...mockGifts];
    }, [onChainGifts]);

    // AI Recommendations — real hybrid engine
    const { recommendations, hasPersonalization } = useRecommendations(allGifts, 8);
    const { trackClick } = useTrackInteraction();

    const filtered = useMemo(() => {
        let result = [...allGifts];
        if (search) result = result.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || g.brand.toLowerCase().includes(search.toLowerCase()));
        if (selectedCat) result = result.filter(g => g.category === selectedCat);
        result = result.filter(g => parseFloat(g.price) >= priceRange[0] && parseFloat(g.price) <= priceRange[1]);
        switch (sortBy) {
            case 'Popular': result.sort((a, b) => b.sellerRating - a.sellerRating); break;
            case 'Price: Low': result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); break;
            case 'Price: High': result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price)); break;
            default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return result;
    }, [search, selectedCat, sortBy, priceRange, allGifts]);

    return (
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
            {/* Header */}
            <div className="mb-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                        <HiViewGrid className="text-white text-lg" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Marketplace</h1>
                        <p className="text-sm text-text-muted">Discover gift cards secured by Ethereum</p>
                    </div>
                    {onChainGifts.length > 0 && (
                        <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                            {onChainGifts.length} on-chain
                        </span>
                    )}
                </motion.div>
            </div>

            {/* On-chain loading indicator */}
            {onChainLoading && (
                <div className="rounded-2xl glass-card p-4 mb-6 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-sm text-text-muted">Syncing on-chain gift cards...</span>
                </div>
            )}

            {/* On-chain minted gifts highlight */}
            {onChainGifts.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass-card p-6 mb-8 border border-green-500/15">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                        </span>
                        <h2 className="text-sm font-bold">On-Chain Gift Cards</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">{onChainGifts.length} minted</span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {onChainGifts.map((gift, i) => (
                            <motion.div key={gift.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <GiftCard gift={gift} compact />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* AI Recommendations — Real Engine */}
            {recommendations.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl glass-card p-6 mb-8 border border-accent/15 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center shadow-lg">
                                    <HiLightningBolt className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold flex items-center gap-1.5">
                                        <HiSparkles className="text-accent" /> Recommended For You
                                    </h2>
                                    <p className="text-[10px] text-text-muted mt-0.5">
                                        {hasPersonalization ? 'Personalized for you' : 'Trending across marketplace'}
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hasPersonalization ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                    {hasPersonalization ? '🟢 Personalized' : '🔵 Trending'}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowAlgoDetails(!showAlgoDetails)}
                                className="text-xs text-text-muted hover:text-primary-light transition-colors flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/5"
                            >
                                <HiInformationCircle /> How it works
                            </button>
                        </div>

                        {/* Algorithm Explanation Panel */}
                        <AnimatePresence>
                            {showAlgoDetails && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mb-5 overflow-hidden"
                                >
                                    <div className="rounded-xl bg-surface-light/80 p-5 border border-border text-xs">
                                        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                            <HiChartBar className="text-primary-light" /> Hybrid Recommendation Engine v2
                                        </h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                            {[
                                                { pct: '40%', label: 'Content-Based', desc: 'Cosine similarity on 14-dim feature vectors', color: 'from-violet-500 to-purple-600' },
                                                { pct: '30%', label: 'Collaborative', desc: 'Item-item Jaccard similarity matrix', color: 'from-blue-500 to-indigo-600' },
                                                { pct: '15%', label: 'Popularity', desc: 'Weighted engagement score', color: 'from-emerald-500 to-green-600' },
                                                { pct: '15%', label: 'Recency', desc: 'Exponential time decay (τ=20d)', color: 'from-amber-500 to-orange-600' },
                                            ].map(item => (
                                                <div key={item.label} className="rounded-lg bg-card p-3">
                                                    <div className={`text-lg font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.pct}</div>
                                                    <p className="text-text font-medium text-xs mt-1">{item.label}</p>
                                                    <p className="text-[10px] text-text-muted mt-0.5">{item.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-text-muted">
                                            {hasPersonalization
                                                ? '🟢 Personalized mode — using your browsing history, purchases, and category preferences from your profile.'
                                                : '🔵 Cold-start mode — using popularity + recency + category diversity heuristics. Interact more for personalized results!'}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {recommendations.slice(0, 4).map((rec, i) => (
                                <motion.div key={rec.giftId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                    <div onClick={() => trackClick(rec.giftId, rec.gift.category)}>
                                        <GiftCard gift={rec.gift} compact />
                                    </div>
                                    <div className="mt-2 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                                                <motion.div 
                                                    className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, rec.score * 100)}%` }}
                                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-accent font-bold">{(rec.score * 100).toFixed(0)}%</span>
                                        </div>
                                        <p className="text-[10px] text-text-muted mt-0.5 truncate">{rec.reason}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative group">
                    <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-light transition-colors" />
                    <input
                        type="text"
                        placeholder="Search gift cards, brands, categories..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-card border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                    />
                </div>
                <div className="flex gap-3 flex-wrap">
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="px-4 py-3.5 rounded-xl glass-card border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                        {sortOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl glass-card border border-border">
                        <HiFilter className="text-text-muted text-sm" />
                        <input
                            type="range"
                            min="0" max="10" step="0.01"
                            value={priceRange[1]}
                            onChange={e => setPriceRange([0, parseFloat(e.target.value)])}
                            className="w-24 accent-primary"
                        />
                        <span className="text-xs text-text-muted whitespace-nowrap font-medium">≤ {priceRange[1].toFixed(1)} ETH</span>
                    </div>
                </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setSelectedCat('')}
                    className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${!selectedCat ? 'gradient-primary text-white shadow-lg glow' : 'glass-card text-text-muted hover:text-text'}`}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCat(selectedCat === cat ? '' : cat)}
                        className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${selectedCat === cat ? 'gradient-primary text-white shadow-lg glow' : 'glass-card text-text-muted hover:text-text'}`}
                    >
                        <span>{categoryEmoji(cat)}</span>
                        {categoryLabel(cat)}
                    </button>
                ))}
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-text-muted">{filtered.length} gift cards found</span>
                {search && (
                    <button onClick={() => setSearch('')} className="text-xs text-primary-light hover:text-primary transition-colors cursor-pointer">
                        Clear search
                    </button>
                )}
            </div>

            {/* Grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((gift, i) => (
                        <motion.div key={gift.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.02 }}>
                            <div onClick={() => trackClick(gift.id, gift.category)}>
                                <GiftCard gift={gift} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 rounded-2xl glass-card">
                    <span className="text-6xl mb-4 block">🔍</span>
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>No gifts found</h3>
                    <p className="text-text-muted text-sm mb-6">Try adjusting your filters or search terms</p>
                    <button onClick={() => { setSearch(''); setSelectedCat(''); setPriceRange([0, 10]); }} className="px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                        Reset Filters
                    </button>
                </div>
            )}
        </div>
    );
}
