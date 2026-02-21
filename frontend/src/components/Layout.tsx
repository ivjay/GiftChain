import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiHome, HiShoppingBag, HiSparkles, HiCollection, HiClock, HiCog, HiChartBar, HiMenu, HiX } from 'react-icons/hi';
import ConnectWallet from './ConnectWallet';
import Logo from './Logo';

const navLinks = [
    { to: '/', label: 'Home', icon: HiHome },
    { to: '/marketplace', label: 'Marketplace', icon: HiShoppingBag },
    { to: '/mint', label: 'Mint', icon: HiSparkles },
    { to: '/collection', label: 'Collection', icon: HiCollection },
    { to: '/transactions', label: 'Receipts', icon: HiClock },
    { to: '/profile', label: 'Profile', icon: HiCog },
    { to: '/admin', label: 'Admin', icon: HiChartBar },
];

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col">
            {/* Navbar */}
            <nav className="glass-strong sticky top-0 z-50 border-b border-border/30">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/">
                        <Logo />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-0.5 bg-surface-light/50 rounded-2xl p-1">
                        {navLinks.map(link => {
                            const Icon = link.icon;
                            const active = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${active ? 'text-white' : 'text-text-muted hover:text-text'}`}
                                >
                                    {active && (
                                        <motion.div
                                            layoutId="nav-active"
                                            className="absolute inset-0 gradient-primary rounded-xl shadow-lg glow"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                        />
                                    )}
                                    <span className="relative flex items-center gap-2">
                                        <Icon className="text-base" />
                                        {link.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Wallet + Mobile Toggle */}
                    <div className="flex items-center gap-3">
                        <ConnectWallet />
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 transition-colors text-text-muted cursor-pointer"
                        >
                            {mobileOpen ? <HiX className="text-xl" /> : <HiMenu className="text-xl" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="lg:hidden overflow-hidden border-t border-border/30"
                        >
                            <div className="flex flex-col gap-1 p-3">
                                {navLinks.map(link => {
                                    const Icon = link.icon;
                                    const active = location.pathname === link.to;
                                    return (
                                        <Link
                                            key={link.to}
                                            to={link.to}
                                            onClick={() => setMobileOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${active ? 'gradient-primary text-white shadow-lg' : 'text-text-muted hover:text-text hover:bg-white/5'}`}
                                        >
                                            <Icon className="text-lg" />
                                            {link.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Main Content */}
            <main className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/30 mt-20">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
                        <div className="md:col-span-2">
                            <Link to="/" className="mb-3 block">
                                <Logo size="md" />
                            </Link>
                            <p className="text-sm text-text-muted max-w-sm leading-relaxed">
                                The decentralized marketplace for digital gift cards. Powered by AI recommendations, 
                                secured by Ethereum, and built with zero-trust encryption.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-4 text-text-muted uppercase tracking-wider">Platform</h4>
                            <div className="flex flex-col gap-2">
                                <Link to="/marketplace" className="text-sm text-text-muted hover:text-primary-light transition-colors">Marketplace</Link>
                                <Link to="/mint" className="text-sm text-text-muted hover:text-primary-light transition-colors">Mint Gift</Link>
                                <Link to="/collection" className="text-sm text-text-muted hover:text-primary-light transition-colors">My Collection</Link>
                                <Link to="/admin" className="text-sm text-text-muted hover:text-primary-light transition-colors">Admin</Link>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-4 text-text-muted uppercase tracking-wider">Resources</h4>
                            <div className="flex flex-col gap-2">
                                <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="text-sm text-text-muted hover:text-primary-light transition-colors">Etherscan ↗</a>
                                <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noopener noreferrer" className="text-sm text-text-muted hover:text-primary-light transition-colors">Sepolia Faucet ↗</a>
                                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-sm text-text-muted hover:text-primary-light transition-colors">MetaMask ↗</a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-xs text-text-muted">© 2026 GiftChain. Built on Polygon Amoy.</span>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                            </span>
                            <span className="text-xs text-green-400 font-medium">All Systems Operational</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
