import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { truncateAddress, categoryEmoji, categoryLabel, explorerUrl } from '../lib/utils';
import type { GiftCategory } from '../types';

const allCats: GiftCategory[] = ['streaming', 'gaming', 'food', 'travel', 'shopping', 'music', 'education', 'fitness'];

export default function Profile() {
    const { address, isConnected, chain } = useAccount();
    const { data: balance } = useBalance({ address });

    const [displayName, setDisplayName] = useState('');
    const [avatar, setAvatar] = useState('🎁');
    const [preferences, setPreferences] = useState<GiftCategory[]>(['gaming', 'streaming', 'music']);
    const [saved, setSaved] = useState(false);

    // Load from localStorage
    useEffect(() => {
        if (!address) return;
        const stored = localStorage.getItem(`giftchain_profile_${address}`);
        if (stored) {
            const data = JSON.parse(stored);
            setDisplayName(data.displayName || '');
            setAvatar(data.avatar || '🎁');
            setPreferences(data.preferences || ['gaming', 'streaming', 'music']);
        }
    }, [address]);

    const togglePref = (cat: GiftCategory) => {
        setPreferences(prev =>
            prev.includes(cat)
                ? prev.filter(c => c !== cat)
                : [...prev, cat]
        );
    };

    const handleSave = () => {
        if (!address) return;
        localStorage.setItem(`giftchain_profile_${address}`, JSON.stringify({
            displayName,
            avatar,
            preferences,
        }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!isConnected || !address) {
        return (
            <div className="max-w-3xl mx-auto px-4 lg:px-8 py-20 text-center">
                <span className="text-6xl block mb-4">🔗</span>
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-text-muted">Connect MetaMask to manage your profile</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
            <h1 className="text-3xl font-bold mb-8">Profile & Settings</h1>
            <div className="space-y-6">
                {/* Wallet Info */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-6">
                    <h2 className="font-bold mb-4">Connected Wallet</h2>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-light">
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-2xl">{avatar}</div>
                        <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm truncate">{address}</p>
                            <p className="text-xs text-text-muted mt-1">
                                {chain?.name || 'Polygon Amoy'} • Balance: {balance ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                            </p>
                        </div>
                        <button
                            onClick={() => navigator.clipboard.writeText(address)}
                            className="px-3 py-1.5 rounded-lg bg-surface text-xs font-medium hover:bg-surface-lighter transition-colors cursor-pointer"
                        >
                            Copy
                        </button>
                    </div>
                </motion.div>

                {/* Display Info */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl glass p-6">
                    <h2 className="font-bold mb-4">Display Info</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-text-muted mb-1.5 block">Display Name</label>
                            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={truncateAddress(address)} className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </div>
                        <div>
                            <label className="text-xs text-text-muted mb-1.5 block">Avatar Emoji</label>
                            <div className="flex gap-2 flex-wrap">
                                {['🎁', '🎮', '🎬', '🎵', '🚀', '💎', '🌟', '🦊'].map(e => (
                                    <button key={e} onClick={() => setAvatar(e)} className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl cursor-pointer transition-all ${avatar === e ? 'bg-primary/20 border-2 border-primary' : 'bg-surface-light hover:bg-surface-lighter'}`}>{e}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Preferences */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl glass p-6">
                    <h2 className="font-bold mb-2">Gift Preferences</h2>
                    <p className="text-xs text-text-muted mb-4">Select categories you're interested in to improve AI recommendations</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {allCats.map(cat => (
                            <button key={cat} onClick={() => togglePref(cat)} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${preferences.includes(cat) ? 'bg-primary/20 border border-primary/40 text-primary-light' : 'bg-surface-light text-text-muted hover:text-text border border-transparent'}`}>
                                <span>{categoryEmoji(cat)}</span>
                                {categoryLabel(cat)}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Network Info */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl glass p-6">
                    <h2 className="font-bold mb-4">Network & Contracts</h2>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between p-3 rounded-lg bg-surface-light">
                            <span className="text-text-muted">Network</span>
                            <span className="font-medium">{chain?.name || 'Polygon Amoy'}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-surface-light">
                            <span className="text-text-muted">GiftNFT Contract</span>
                            <a href={explorerUrl(import.meta.env.VITE_GIFT_NFT_ADDRESS || '', 'address')} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline font-mono">
                                {truncateAddress(import.meta.env.VITE_GIFT_NFT_ADDRESS || '')}
                            </a>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-surface-light">
                            <span className="text-text-muted">Marketplace Contract</span>
                            <a href={explorerUrl(import.meta.env.VITE_MARKETPLACE_ADDRESS || '', 'address')} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline font-mono">
                                {truncateAddress(import.meta.env.VITE_MARKETPLACE_ADDRESS || '')}
                            </a>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-surface-light">
                            <span className="text-text-muted">Redemption Tracker</span>
                            <a href={explorerUrl(import.meta.env.VITE_REDEMPTION_TRACKER_ADDRESS || '', 'address')} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline font-mono">
                                {truncateAddress(import.meta.env.VITE_REDEMPTION_TRACKER_ADDRESS || '')}
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* Save */}
                <button onClick={handleSave} className="w-full py-3.5 rounded-2xl gradient-primary text-white font-bold hover:opacity-90 transition-opacity cursor-pointer">
                    {saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
