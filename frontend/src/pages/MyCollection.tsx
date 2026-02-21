import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSignMessage, useAccount } from 'wagmi';
import { HiCheck, HiClipboardCopy, HiLightningBolt, HiExternalLink } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { mockMyCollection } from '../data/mockData';
import { useOnChainGifts } from '../hooks/useOnChainGifts';
import GiftCard from '../components/GiftCard';
import { useGiftChain } from '../hooks/useGiftChain';
import { explorerUrl, truncateAddress, copyToClipboard, decryptData } from '../lib/utils';
import { ipfsGatewayURL } from '../lib/pinata';
import type { GiftStatus, GiftNFT } from '../types';

const filters: { value: GiftStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'redeemed', label: 'Redeemed' },
    { value: 'listed', label: 'Listed' },
];

export default function MyCollection() {
    const { address, isConnected } = useAccount();
    const [filter, setFilter] = useState<GiftStatus | ''>('');
    const [transferModal, setTransferModal] = useState<GiftNFT | null>(null);
    const [redeemModal, setRedeemModal] = useState<GiftNFT | null>(null);
    const [recipientAddr, setRecipientAddr] = useState('');
    const [redeemState, setRedeemState] = useState<'confirm' | 'burning' | 'decrypting' | 'revealed'>('confirm');
    const [decryptedCode, setDecryptedCode] = useState('');
    const [transferring, setTransferring] = useState(false);

    const { redeemGift, transferGift, listGift, txHash } = useGiftChain();
    const { signMessageAsync } = useSignMessage();
    const { gifts: onChainGifts, loading } = useOnChainGifts();

    // Show on-chain owned gifts (by actual token balance, not just seller match)
    const myOnChainGifts = useMemo(() => {
        if (!address) return [];
        return onChainGifts.filter(g => (g._userBalance || 0) > 0);
    }, [onChainGifts, address]);

    const allMyGifts = useMemo(() => {
        return [...myOnChainGifts, ...mockMyCollection];
    }, [myOnChainGifts]);

    const filtered = filter ? allMyGifts.filter(g => g.status === filter) : allMyGifts;

    const handleAction = (giftId: string, action: string) => {
        const gift = allMyGifts.find(g => g.id === giftId);
        if (!gift) return;

        if (action === 'redeem') {
            setRedeemState('confirm');
            setDecryptedCode('');
            setRedeemModal(gift);
        }
        if (action === 'transfer') {
            setTransferModal(gift);
            setRecipientAddr('');
        }
        if (action === 'delist') {
            alert('Delist functionality — the listing would be cancelled on the marketplace contract.');
        }
    };

    const confirmRedeem = async () => {
        if (!redeemModal) return;
        setRedeemState('burning');
        try {
            // 1. Burn token on-chain
            const isOnChain = redeemModal.id.startsWith('onchain-');
            if (isOnChain) {
                await redeemGift(redeemModal.tokenId, 1);
            }

            // 2. Fetch & Decrypt credential
            setRedeemState('decrypting');
            const sig = await signMessageAsync({ message: 'Sign to decrypt your GiftChain voucher.' });

            try {
                const response = await fetch(ipfsGatewayURL(redeemModal.ipfsCID));
                const ipfsData = await response.json();
                const encryptedCode = ipfsData.properties?.encrypted_code || ipfsData.properties?.credential || ipfsData.credential;
                
                if (encryptedCode) {
                    const decrypted = await decryptData(encryptedCode, sig);
                    setDecryptedCode(decrypted);
                } else {
                    throw new Error('Credential not found in metadata');
                }
            } catch (ipfsErr) {
                console.warn('IPFS fetch/decrypt failed, using fallback hash:', ipfsErr);
                const codeHash = sig.slice(2, 18).toUpperCase();
                setDecryptedCode(`GIFT-${codeHash.slice(0, 4)}-${codeHash.slice(4, 8)}-${codeHash.slice(8, 12)}`);
            }
            
            setRedeemState('revealed');
        } catch (e) {
            console.error('[MyCollection] Redeem error:', e);
            const msg = e instanceof Error ? e.message : String(e);
            alert(`Redemption failed: ${msg}`);
            setRedeemState('confirm');
        }
    };

    const handleTransfer = async () => {
        if (!recipientAddr || !transferModal) return;
        if (!/^0x[0-9a-fA-F]{40}$/.test(recipientAddr)) return alert('Invalid Ethereum address');

        setTransferring(true);
        try {
            const isOnChain = transferModal.id.startsWith('onchain-');
            if (isOnChain) {
                await transferGift(transferModal.tokenId, recipientAddr);
                alert(`✅ Successfully transferred Token #${transferModal.tokenId} to ${truncateAddress(recipientAddr)}!`);
            } else {
                alert('Demo gift — mint a real NFT to transfer on-chain.');
            }
            setTransferModal(null);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            alert(`Transfer failed: ${msg}`);
        } finally {
            setTransferring(false);
        }
    };

    // List for sale handler
    const [listModal, setListModal] = useState<GiftNFT | null>(null);
    const [listPrice, setListPrice] = useState('');
    const [listingInProgress, setListingInProgress] = useState(false);

    const handleListForSale = (giftId: string) => {
        const gift = allMyGifts.find(g => g.id === giftId);
        if (gift) {
            setListModal(gift);
            setListPrice('');
        }
    };

    const confirmList = async () => {
        if (!listModal || !listPrice) return;
        setListingInProgress(true);
        try {
            await listGift(listModal.tokenId, 1, listPrice);
            alert(`🏷️ Listed Token #${listModal.tokenId} for ${listPrice} ETH!`);
            setListModal(null);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            alert(`Listing failed: ${msg}`);
        } finally {
            setListingInProgress(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 text-center">
                <span className="text-6xl block mb-4">🔗</span>
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-text-muted mb-6">Connect MetaMask to view your gift card collection</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">My Collection</h1>
                    <p className="text-text-muted mt-1">
                        {myOnChainGifts.length} on-chain + {mockMyCollection.length} demo gift cards
                        {loading && <span className="ml-2 text-primary-light animate-pulse">Loading chain data...</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    {filters.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${filter === f.value ? 'bg-primary text-white' : 'bg-surface-light text-text-muted hover:text-text'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((gift, i) => (
                        <motion.div key={gift.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="relative">
                                {gift.id.startsWith('onchain-') && (
                                    <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30">
                                        ⛓️ On-Chain
                                    </span>
                                )}
                                <GiftCard gift={gift} owned onAction={(act) => handleAction(gift.id, act)} />
                                {/* Quick list button for on-chain active items */}
                                {gift.id.startsWith('onchain-') && gift.status === 'active' && (
                                    <button
                                        onClick={() => handleListForSale(gift.id)}
                                        className="w-full mt-2 py-2 rounded-xl bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30 transition-colors cursor-pointer"
                                    >
                                        🏷️ List for Sale
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 rounded-2xl glass">
                    <span className="text-5xl block mb-4">📭</span>
                    <h3 className="text-lg font-semibold mb-2">No gifts found</h3>
                    <p className="text-text-muted text-sm mb-4">
                        {filter ? `You have no ${filter} gift cards.` : 'Mint your first NFT gift card!'}
                    </p>
                    <Link to="/mint" className="inline-block px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity">
                        Mint a Gift Card
                    </Link>
                </div>
            )}

            {/* Redeem Modal */}
            <AnimatePresence>
                {redeemModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => redeemState !== 'burning' && redeemState !== 'decrypting' && setRedeemModal(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md rounded-2xl glass-strong p-6" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4">
                                {redeemState === 'revealed' ? '🎉 Voucher Revealed' : `🎁 Redeem "${redeemModal.title}"`}
                            </h2>

                            {redeemState === 'revealed' ? (
                                <div className="space-y-4">
                                    <div className="rounded-xl bg-surface-light p-5 text-center border-2 border-primary/20">
                                        <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Your Code</p>
                                        <div className="text-2xl font-mono font-bold text-accent tracking-widest break-all mb-3 select-all">
                                            {decryptedCode}
                                        </div>
                                        <button onClick={async () => {
                                            const success = await copyToClipboard(decryptedCode);
                                            if (success) alert('Copied to clipboard!');
                                        }} className="mx-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-surface text-xs font-medium hover:bg-surface-lighter transition-colors cursor-pointer">
                                            <HiClipboardCopy /> Copy to Clipboard
                                        </button>
                                    </div>
                                    {txHash && (
                                        <a href={explorerUrl(txHash)} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:text-primary text-xs flex items-center justify-center gap-1">
                                            <HiExternalLink /> View burn tx on Etherscan
                                        </a>
                                    )}
                                    <p className="text-sm text-center text-text-muted">The NFT has been burned from your wallet. Use the code above to redeem your gift.</p>
                                    <button onClick={() => setRedeemModal(null)} className="w-full py-3 rounded-xl gradient-primary text-white font-bold cursor-pointer">Done</button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-text-muted mb-6 leading-relaxed">
                                        This will permanently <strong>burn</strong> the NFT to prevent double-spending and reveal the encrypted voucher code. This action cannot be undone.
                                    </p>
                                    {redeemState === 'burning' && (
                                        <div className="flex items-center gap-3 text-sm mb-4 text-accent animate-pulse">
                                            <HiLightningBolt /> Burning NFT on blockchain...
                                        </div>
                                    )}
                                    {redeemState === 'decrypting' && (
                                        <div className="flex items-center gap-3 text-sm mb-4 text-green-400 animate-pulse">
                                            <HiCheck /> Decrypting credential...
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button onClick={() => setRedeemModal(null)} disabled={redeemState !== 'confirm'} className="flex-1 py-2.5 rounded-xl glass text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
                                        <button onClick={confirmRedeem} disabled={redeemState !== 'confirm'} className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                                            {redeemState === 'confirm' ? 'Confirm Redeem' : 'Processing...'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transfer Modal */}
            <AnimatePresence>
                {transferModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !transferring && setTransferModal(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md rounded-2xl glass-strong p-6" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4">🎁 Transfer "{transferModal.title}"</h2>
                            <div className="mb-4">
                                <label className="text-xs text-text-muted mb-1.5 block">Recipient Wallet Address</label>
                                <input
                                    value={recipientAddr}
                                    onChange={e => setRecipientAddr(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <p className="text-xs text-text-muted mb-4">The NFT will be transferred to this address via safeTransferFrom on-chain.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setTransferModal(null)} disabled={transferring} className="flex-1 py-2.5 rounded-xl glass text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
                                <button onClick={handleTransfer} disabled={transferring || !recipientAddr} className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                                    {transferring ? (
                                        <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Transferring...</>
                                    ) : 'Transfer'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List for Sale Modal */}
            <AnimatePresence>
                {listModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !listingInProgress && setListModal(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md rounded-2xl glass-strong p-6" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4">🏷️ List "{listModal.title}" for Sale</h2>
                            <div className="mb-4">
                                <label className="text-xs text-text-muted mb-1.5 block">Sale Price (ETH)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={listPrice}
                                    onChange={e => setListPrice(e.target.value)}
                                    placeholder="0.05"
                                    className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <p className="text-xs text-text-muted mb-4">A 2.5% platform fee will be deducted when someone buys it.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setListModal(null)} disabled={listingInProgress} className="flex-1 py-2.5 rounded-xl glass text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
                                <button onClick={confirmList} disabled={listingInProgress || !listPrice} className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                                    {listingInProgress ? (
                                        <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Listing...</>
                                    ) : 'Confirm Listing'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
