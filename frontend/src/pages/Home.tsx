import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowRight, HiLightningBolt, HiShieldCheck, HiGlobe, HiCube, HiSparkles, HiChartBar } from 'react-icons/hi';
import { mockGifts } from '../data/mockData';
import { useOnChainGifts } from '../hooks/useOnChainGifts';
import { useRecommendations, useTrackInteraction } from '../hooks/useRecommendations';
import GiftCard from '../components/GiftCard';
import { categoryEmoji, categoryLabel } from '../lib/utils';
import { useMemo } from 'react';

const categories = ['streaming', 'gaming', 'food', 'travel', 'shopping', 'music', 'education', 'fitness'];

const steps = [
    { icon: '🔗', title: 'Connect Wallet', desc: 'Link your MetaMask wallet in one click. No sign-ups, no emails — just your wallet.' },
    { icon: '🔍', title: 'Browse & Discover', desc: 'AI-curated recommendations powered by hybrid content + collaborative filtering.' },
    { icon: '🎉', title: 'Redeem Instantly', desc: 'Burn the NFT to decrypt and reveal your voucher code. Zero-trust security.' },
];

const features = [
    { icon: HiLightningBolt, title: 'AI-Powered Engine', desc: 'Hybrid recommendation: Content-Based + Collaborative Filtering with 14-dim feature vectors', color: 'from-violet-500 to-purple-600' },
    { icon: HiShieldCheck, title: 'Fraud Detection', desc: '5 real-time detectors: Wash Trading, Velocity, Price Anomaly, Rapid Flip, Sybil', color: 'from-emerald-500 to-teal-600' },
    { icon: HiGlobe, title: 'Decentralized', desc: 'ERC-1155 NFTs on Amoy. Immutable ownership with IPFS metadata storage', color: 'from-blue-500 to-indigo-600' },
    { icon: HiCube, title: 'On-Chain Verifiable', desc: 'Every mint, purchase, and redemption verifiable on Polygonscan in real-time', color: 'from-amber-500 to-orange-600' },
];

const stats = [
    { label: 'Gift Cards', value: '2,400+', icon: '🎁' },
    { label: 'Categories', value: '8', icon: '📂' },
    { label: 'On Amoy', value: 'Live', icon: '⛓️' },
    { label: 'Fraud Detectors', value: '5', icon: '🛡️' },
];

export default function Home() {
    const { gifts: onChainGifts } = useOnChainGifts();
    const allGifts = useMemo(() => [...onChainGifts, ...mockGifts], [onChainGifts]);
    const featured = onChainGifts.length > 0 ? [...onChainGifts.slice(0, 4), ...mockGifts.slice(0, Math.max(0, 4 - onChainGifts.length))] : mockGifts.slice(0, 4);

    // Real AI recommendations
    const { recommendations } = useRecommendations(allGifts, 4);
    const { trackClick } = useTrackInteraction();

    return (
        <div>
            {/* Hero Section */}
            <section className="gradient-hero relative overflow-hidden min-h-[85vh] flex items-center">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-[10%] w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-20 right-[15%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px]" style={{ animationDelay: '2s' }} />
                    <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px]" style={{ animationDelay: '4s' }} />
                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: 'linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }} />
                    {/* Floating particles */}
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-primary-light/40 rounded-full"
                            style={{
                                left: `${10 + (i * 12)}%`,
                                top: `${20 + (i * 8) % 60}%`,
                            }}
                            animate={{
                                y: [-20, 20, -20],
                                opacity: [0.2, 0.6, 0.2],
                            }}
                            transition={{
                                duration: 4 + i,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </div>

                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 lg:py-28 relative w-full">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <motion.span 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary-light border border-primary/25 mb-6"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-light" />
                                </span>
                                Live on Polygon Amoy
                            </motion.span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                                Gift Cards,{' '}
                                <span className="gradient-text">Reimagined</span>{' '}
                                <br />as NFTs
                            </h1>
                            <p className="text-lg text-text-muted mb-10 max-w-xl leading-relaxed">
                                Mint, trade, and redeem digital gift cards on Ethereum. 
                                AI-powered recommendations, real-time fraud detection, 
                                and wallet-encrypted credentials — all decentralized.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link
                                    to="/marketplace"
                                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl gradient-primary text-white font-semibold text-lg hover:opacity-90 transition-all shadow-xl glow animated-border"
                                >
                                    Explore Marketplace
                                    <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    to="/mint"
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl glass text-text font-semibold text-lg hover:bg-white/10 transition-all border-glow"
                                >
                                    <HiSparkles className="text-accent" />
                                    Mint a Gift
                                </Link>
                            </div>
                        </motion.div>

                        {/* Right side — Animated stats */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="hidden lg:block"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                {stats.map((stat, i) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + i * 0.1 }}
                                        className="glass-card rounded-2xl p-6 card-lift shimmer"
                                    >
                                        <span className="text-3xl mb-3 block">{stat.icon}</span>
                                        <p className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
                                        <p className="text-sm text-text-muted">{stat.label}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Bar */}
            <section className="relative border-y border-border/50">
                <div className="absolute inset-0 gradient-mesh opacity-50" />
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * i }}
                                className="glass-card rounded-2xl p-5 group card-lift border-glow"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                                    <f.icon className="text-xl text-white" />
                                </div>
                                <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
                                <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Gifts */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                            🔥 Featured Gifts
                        </motion.h2>
                        <p className="text-text-muted mt-2">Top picks from our marketplace</p>
                    </div>
                    <Link to="/marketplace" className="text-primary-light hover:text-primary transition-colors text-sm font-medium flex items-center gap-1 group">
                        View All <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featured.map((gift, i) => (
                        <motion.div key={gift.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}>
                            <GiftCard gift={gift} />
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Categories */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
                <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    className="text-3xl font-bold mb-10" style={{ fontFamily: 'var(--font-display)' }}>
                    🏷️ Browse by Category
                </motion.h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                    {categories.map((cat, i) => (
                        <motion.div
                            key={cat}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.05 * i }}
                        >
                            <Link
                                to={`/marketplace?category=${cat}`}
                                className="flex flex-col items-center gap-3 p-5 rounded-2xl glass-card card-lift text-center group border-glow"
                            >
                                <span className="text-4xl group-hover:scale-125 transition-transform duration-300">{categoryEmoji(cat)}</span>
                                <span className="text-xs font-medium text-text-muted group-hover:text-text transition-colors">{categoryLabel(cat)}</span>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* AI Recommendations */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
                <div className="rounded-3xl glass-card p-10 relative overflow-hidden border border-accent/10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/8 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center shadow-lg">
                                <HiLightningBolt className="text-xl text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>✨ Recommended For You</h2>
                                <p className="text-sm text-text-muted">Hybrid AI engine — Content-Based + Collaborative Filtering</p>
                            </div>
                            <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-accent/15 text-accent border border-accent/20">
                                AI Engine v2
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {(recommendations.length > 0 ? recommendations.map(r => r.gift) : mockGifts.slice(4, 8)).map((gift, i) => (
                                <motion.div key={gift.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * i }}>
                                    <div onClick={() => trackClick(gift.id, gift.category)}>
                                        <GiftCard gift={gift} compact />
                                    </div>
                                    {recommendations[i] && (
                                        <div className="mt-2 px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                                                    <motion.div 
                                                        className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${Math.min(100, recommendations[i].score * 100)}%` }}
                                                        viewport={{ once: true }}
                                                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                                                    />
                                                </div>
                                                <span className="text-xs text-accent font-bold">{(recommendations[i].score * 100).toFixed(0)}%</span>
                                            </div>
                                            <p className="text-[10px] text-text-muted mt-1 truncate">{recommendations[i].reason}</p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <div className="text-center mb-14">
                    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                        How It Works
                    </motion.h2>
                    <p className="text-text-muted max-w-lg mx-auto">Three steps to the future of digital gifting</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.15 * i }}
                            className="text-center p-10 rounded-3xl glass-card card-lift relative overflow-hidden border-glow"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/10 rounded-full blur-[60px] -translate-y-1/2 pointer-events-none" />
                            <div className="relative">
                                <div className="text-5xl mb-5 floating" style={{ animationDelay: `${i * 0.5}s` }}>{step.icon}</div>
                                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary-light mb-4">
                                    Step {i + 1}
                                </div>
                                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>{step.title}</h3>
                                <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Tech Stack */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
                <div className="glass-card rounded-2xl p-8 border border-border/50">
                    <h3 className="text-sm font-bold text-text-muted mb-6 text-center uppercase tracking-widest">Built With</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                        {[
                            { name: 'Solidity', icon: '⟠' },
                            { name: 'ERC-1155', icon: '🪙' },
                            { name: 'React', icon: '⚛️' },
                            { name: 'IPFS', icon: '📡' },
                            { name: 'Wagmi v3', icon: '🔌' },
                            { name: 'Viem', icon: '⚡' },
                            { name: 'Pinata', icon: '📌' },
                            { name: 'TypeScript', icon: '📘' },
                        ].map((tech, i) => (
                            <motion.div 
                                key={tech.name}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.05 * i }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-light/80 text-sm text-text-muted hover:text-text hover:bg-surface-lighter transition-all"
                            >
                                <span>{tech.icon}</span>
                                {tech.name}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="rounded-3xl relative overflow-hidden"
                >
                    <div className="absolute inset-0 gradient-primary" />
                    <div className="absolute inset-0 gradient-mesh opacity-40" />
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />
                    <div className="relative p-14 text-center">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                            Ready to Start Gifting?
                        </h2>
                        <p className="text-white/75 text-lg mb-10 max-w-lg mx-auto">
                            Connect your wallet and explore digital gift cards secured by blockchain technology.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                to="/marketplace"
                                className="group inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-primary-dark font-bold text-lg hover:bg-gray-100 transition-all shadow-2xl"
                            >
                                Get Started <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/admin"
                                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl border-2 border-white/30 text-white font-bold text-lg hover:bg-white/10 transition-all"
                            >
                                <HiChartBar /> Admin Dashboard
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
