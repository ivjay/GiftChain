import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiArrowLeft, HiExternalLink, HiHeart, HiShare, HiShieldCheck, HiClipboardCopy } from 'react-icons/hi';
import { mockGifts } from '../data/mockData';
import { useOnChainGifts } from '../hooks/useOnChainGifts';
import GiftCard from '../components/GiftCard';
import { truncateAddress, formatDate, explorerUrl, categoryLabel, statusBadgeColor, copyToClipboard, isImageUrl, formatImageUrl } from '../lib/utils';
import { useGiftChain } from '../hooks/useGiftChain';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import confetti from 'canvas-confetti';

const NFT_ADDRESS = (import.meta.env.VITE_GIFT_NFT_ADDRESS || '0x') as `0x${string}`;

export default function GiftDetail() {
    const { id } = useParams<{ id: string }>();
    const { address } = useAccount();
    const { gifts: onChainGifts, loading: giftsLoading } = useOnChainGifts();
    const { buyGift, listGift, txHash } = useGiftChain();

    const [buying, setBuying] = useState(false);
    const [listing, setListing] = useState(false);
    const [listPrice, setListPrice] = useState('');
    const [showListModal, setShowListModal] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);
    const [copied, setCopied] = useState(false);

    const gift = useMemo(() => {
        // 1. Try on-chain first
        const oc = onChainGifts.find(g => g.id === id);
        if (oc) return oc;

        // 2. Try mock data
        const mk = mockGifts.find(g => g.id === id);
        if (mk) return mk;

        // 3. Fallback (only if not on-chain id)
        if (id?.startsWith('onchain-')) return null;
        return mockGifts[0];
    }, [onChainGifts, id]);

    const isOnChain = id?.startsWith('onchain-');
    
    // Determine active listing from pre-fetched data
    const activeListing = useMemo(() => {
        if (!gift || !gift.listingId || !gift._rawPricePerUnit) return null;
        return {
            listingId: gift.listingId,
            pricePerUnit: gift._rawPricePerUnit,
            seller: gift.seller
        };
    }, [gift]);

    const isOwner = useMemo(() => {
        if (!gift || !isOnChain) return false;
        return gift._userBalance ? gift._userBalance > 0 : false;
    }, [gift, isOnChain]);

    const related = useMemo(() => {
        if (!gift) return [];
        return mockGifts.filter(g => g.category === gift.category && g.id !== gift.id).slice(0, 4);
    }, [gift]);
    
    // Show loading if we know it's on-chain but haven't found it yet
    const isLoading = giftsLoading && isOnChain && !gift;

    // Handle buy
    const handleBuy = async () => {
        if (!activeListing) return;
        setBuying(true);
        try {
            const priceETH = formatEther(activeListing.pricePerUnit);
            await buyGift(Number(activeListing.listingId), 1, priceETH);
            setPurchaseSuccess(true);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6C5CE7', '#F6B93B', '#a29bfe'] });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[GiftDetail] Buy error:', message);
            alert(`Purchase failed: ${message}`);
        } finally {
            setBuying(false);
        }
    };

    // Handle list for sale
    const handleList = async () => {
        if (!listPrice || !isOnChain || !gift) return;
        setListing(true);
        try {
            await listGift(gift.tokenId, 1, listPrice);
            setShowListModal(false);
            setListPrice('');
            alert('🎉 Listed on the marketplace! Others can now buy your gift card.');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[GiftDetail] List error:', message);
            alert(`Listing failed: ${message}`);
        } finally {
            setListing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 text-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary animate-spin rounded-full mx-auto mb-4" />
                <p className="text-text-muted">Loading gift details from blockchain...</p>
            </div>
        );
    }

    if (!gift) {
        return (
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Gift Not Found</h1>
                <Link to="/marketplace" className="text-primary-light hover:underline">Back to Marketplace</Link>
            </div>
        );
    }

    // Purchase success view
    if (purchaseSuccess) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
                    <span className="text-7xl block mb-6">🎊</span>
                    <h1 className="text-3xl font-bold mb-3">Purchase Complete!</h1>
                    <p className="text-text-muted mb-4">You now own "{gift.title}". The NFT has been transferred to your wallet.</p>
                    {txHash && (
                        <a href={explorerUrl(txHash)} target="_blank" rel="noopener noreferrer"
                            className="text-primary-light hover:text-primary text-sm flex items-center justify-center gap-1 mb-8">
                            <HiExternalLink /> View on Etherscan
                        </a>
                    )}
                    <div className="flex gap-4 justify-center">
                        <Link to="/collection" className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity">
                            My Collection
                        </Link>
                        <Link to="/marketplace" className="px-6 py-3 rounded-xl glass font-semibold hover:bg-white/10 transition-colors">
                            Back to Marketplace
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    const canBuy = !!activeListing && !buying && !!address;
    const listingPrice = activeListing ? formatEther(activeListing.pricePerUnit) : gift.price;

    return (
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
            <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary-light transition-colors mb-6">
                <HiArrowLeft /> Back to Marketplace
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left: Image + Info */}
                <motion.div className="lg:col-span-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    {/* Gift Image Card */}
                    <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-card to-primary-dark/20 border border-border p-12 flex items-center justify-center mb-6 relative overflow-hidden h-[400px]">
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/30 rounded-full blur-3xl" />
                        </div>
                        {isImageUrl(gift.image) ? (
                            <img src={formatImageUrl(gift.image)} alt={gift.title} className="w-full h-full object-cover absolute inset-0" />
                        ) : (
                            <span className="text-[120px] relative">{gift.image}</span>
                        )}
                        <span className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-sm text-xs font-medium capitalize text-white/90">
                            {gift.category}
                        </span>
                        {isOnChain && (
                            <span className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-green-500/20 backdrop-blur-sm text-xs font-bold text-green-400 border border-green-500/30">
                                ⛓️ On-Chain
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="rounded-2xl glass p-6 mb-6">
                        <h2 className="font-bold mb-3">Description</h2>
                        <p className="text-sm text-text-muted leading-relaxed mb-4">{gift.description}</p>
                        {gift.ipfsCID && (
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                <span className="font-medium">IPFS:</span>
                                <a href={formatImageUrl(`ipfs://${gift.ipfsCID}`)} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline truncate">
                                    {gift.ipfsCID.slice(0, 20)}...
                                </a>
                            </div>
                        )}
                        <h3 className="font-semibold text-sm mb-2 mt-4">Terms & Conditions</h3>
                        <p className="text-xs text-text-muted">{gift.terms || 'Standard platform terms apply.'}</p>
                    </div>

                    {/* Ownership History */}
                    <div className="rounded-2xl glass p-6">
                        <h2 className="font-bold mb-4">📜 Ownership History</h2>
                        <div className="space-y-4">
                            {gift.ownershipHistory?.length > 0 ? (
                                gift.ownershipHistory.map((record, i) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-primary' : 'bg-border'}`} />
                                            {i < gift.ownershipHistory.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{record.action}</span>
                                                <span className="text-xs text-text-muted">{formatDate(record.timestamp)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-text-muted">{truncateAddress(record.owner)}</span>
                                                {record.txHash !== '0x' && (
                                                    <a href={explorerUrl(record.txHash)} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:text-primary text-xs flex items-center gap-0.5">
                                                        <HiExternalLink className="text-[10px]" /> View
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-text-muted italic">No ownership history available for this item.</p>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Right: Purchase Panel */}
                <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="rounded-2xl glass p-6 sticky top-24">
                        <div className="flex items-center gap-2 mb-2">
                            <HiShieldCheck className="text-green-400" />
                            <span className="text-xs text-green-400 font-medium">
                                {isOnChain ? 'On-Chain Verified' : 'Demo Listing'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold mb-1">{gift.title}</h1>
                        <p className="text-text-muted text-sm mb-4 capitalize">{gift.brand} • {categoryLabel(gift.category)}</p>

                        {/* Price */}
                        <div className="rounded-xl bg-surface-light p-4 mb-4">
                            <span className="text-xs text-text-muted block mb-1">
                                {activeListing ? 'Listed Price' : 'Price'}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-accent">{listingPrice}</span>
                                <span className="text-text-muted">ETH</span>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="rounded-xl bg-surface-light p-3">
                                <span className="text-[10px] text-text-muted block">Available</span>
                                <span className="text-sm font-bold">{activeListing ? 1 : gift.available} / {gift.quantity}</span>
                            </div>
                            <div className="rounded-xl bg-surface-light p-3">
                                <span className="text-[10px] text-text-muted block">Token ID</span>
                                <span className="text-sm font-bold">#{gift.tokenId || 'N/A'}</span>
                            </div>
                            <div className="rounded-xl bg-surface-light p-3">
                                <span className="text-[10px] text-text-muted block">Type</span>
                                <span className="text-sm font-bold capitalize">{gift.voucherType.replace('_', ' ')}</span>
                            </div>
                            <div className="rounded-xl bg-surface-light p-3">
                                <span className="text-[10px] text-text-muted block">Status</span>
                                <span className={`text-sm font-bold capitalize ${activeListing ? 'text-accent' : statusBadgeColor(gift.status).split(' ')[1]}`}>
                                    {activeListing ? 'Listed' : gift.status}
                                </span>
                            </div>
                        </div>

                        {/* Seller */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-light mb-4">
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-sm">🎁</div>
                            <div className="flex-1 min-w-0">
                                <span className="text-xs text-text-muted block">
                                    {activeListing ? 'Seller' : 'Creator'}
                                </span>
                                <span className="text-sm font-medium truncate block">
                                    {truncateAddress(activeListing?.seller || gift.seller)}
                                    {isOwner && <span className="text-primary-light ml-1">(You)</span>}
                                </span>
                            </div>
                            <button 
                                onClick={async () => {
                                    const success = await copyToClipboard(NFT_ADDRESS);
                                    if (success) alert('Contract address copied!');
                                }}
                                className="p-2 rounded-lg bg-surface hover:bg-surface-lighter transition-colors cursor-pointer text-text-muted hover:text-primary-light"
                            >
                                <HiClipboardCopy size={16} />
                            </button>
                        </div>

                        {/* Actions */}
                        {isOnChain && isOwner && !activeListing ? (
                            <div className="mb-4">
                                {showListModal ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-text-muted block mb-1">Sale Price (ETH)</label>
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
                                        <button
                                            onClick={handleList}
                                            disabled={listing || !listPrice}
                                            className="w-full py-4 rounded-2xl gradient-primary text-white font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {listing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : '🏷️ Confirm Listing'}
                                        </button>
                                        <button onClick={() => setShowListModal(false)} className="w-full py-2 text-sm text-text-muted hover:text-text cursor-pointer">Cancel</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowListModal(true)}
                                        className="w-full py-4 rounded-2xl bg-accent text-white font-bold hover:opacity-90 transition-opacity cursor-pointer"
                                    >
                                        🏷️ List on Marketplace
                                    </button>
                                )}
                            </div>
                        ) : activeListing ? (
                            <button
                                onClick={handleBuy}
                                disabled={!canBuy}
                                className="w-full py-4 rounded-2xl gradient-primary text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-lg glow mb-4 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {buying ? <span className="w-6 h-6 border-3 border-white/30 border-t-white animate-spin rounded-full" /> : `🛒 Buy Now — ${listingPrice} ETH`}
                            </button>
                        ) : isOnChain ? (
                            <div className="p-4 rounded-2xl glass text-center mb-4">
                                <p className="text-sm text-text-muted font-medium">Currently Not Listed for Sale</p>
                            </div>
                        ) : (
                            <button disabled className="w-full py-4 rounded-2xl glass text-text-muted font-bold mb-4 opacity-50 cursor-not-allowed">
                                Demo Only
                            </button>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const key = `giftchain_wishlist_${address || 'anon'}`;
                                    const list = JSON.parse(localStorage.getItem(key) || '[]');
                                    if (wishlisted) {
                                        localStorage.setItem(key, JSON.stringify(list.filter((x: string) => x !== gift.id)));
                                    } else {
                                        list.push(gift.id);
                                        localStorage.setItem(key, JSON.stringify(list));
                                    }
                                    setWishlisted(!wishlisted);
                                }}
                                className={`flex-1 py-3 rounded-xl glass text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer ${wishlisted ? 'text-red-400' : ''}`}
                            >
                                <HiHeart className={wishlisted ? 'fill-current' : ''} /> {wishlisted ? 'Saved' : 'Wishlist'}
                            </button>
                            <button
                                onClick={async () => {
                                    const success = await copyToClipboard(window.location.href);
                                    if (success) {
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }
                                }}
                                className="flex-1 py-3 rounded-xl glass text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <HiShare /> {copied ? 'Copied!' : 'Share'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Related */}
            {related.length > 0 && (
                <section className="mt-16">
                    <h2 className="text-2xl font-bold mb-8">Related Gift Cards</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {related.map(g => <GiftCard key={g.id} gift={g} />)}
                    </div>
                </section>
            )}
        </div>
    );
}
