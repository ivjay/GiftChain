import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { GiftNFT } from '../types';
import { statusBadgeColor, categoryEmoji, isImageUrl, formatImageUrl } from '../lib/utils';

interface GiftCardProps {
    gift: GiftNFT;
    compact?: boolean;
    owned?: boolean;
    onAction?: (action: string) => void;
}

const categoryGradients: Record<string, string> = {
    streaming: 'from-red-500/30 via-pink-500/20 to-purple-600/30',
    gaming: 'from-green-500/30 via-emerald-500/20 to-teal-600/30',
    food: 'from-orange-500/30 via-amber-500/20 to-yellow-600/30',
    travel: 'from-blue-500/30 via-cyan-500/20 to-sky-600/30',
    shopping: 'from-pink-500/30 via-rose-500/20 to-red-600/30',
    music: 'from-violet-500/30 via-purple-500/20 to-indigo-600/30',
    education: 'from-indigo-500/30 via-blue-500/20 to-cyan-600/30',
    fitness: 'from-lime-500/30 via-green-500/20 to-emerald-600/30',
};

export default function GiftCard({ gift, compact, owned, onAction }: GiftCardProps) {
    const isRedeemed = gift.status === 'redeemed';
    const isOnChain = gift.id.startsWith('onchain-');
    const gradient = categoryGradients[gift.category] || 'from-primary/30 to-primary-dark/30';

    if (compact) {
        return (
            <Link to={`/gift/${gift.id}`} className="block">
                <div className={`rounded-2xl glass-card hover:bg-card-hover transition-all card-lift p-4 ${isRedeemed ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                        {isImageUrl(gift.image) ? (
                            <img src={formatImageUrl(gift.image)} alt={gift.title} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                                <span className="text-xl">{gift.image}</span>
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-semibold truncate">{gift.title}</h3>
                                {isOnChain && <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/20 text-green-400 font-bold shrink-0">⛓️</span>}
                            </div>
                            <p className="text-xs text-text-muted">{gift.brand}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-accent">{gift.price} ETH</span>
                        <span className="text-xs text-text-muted">{gift.available} left</span>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <div className={`rounded-2xl glass-card overflow-hidden card-lift group relative ${isRedeemed ? 'opacity-60 grayscale' : ''}`}>
            {/* Subtle animated top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Card Image Area */}
            <Link to={`/gift/${gift.id}`}>
                <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
                    {/* Mesh overlay */}
                    <div className="absolute inset-0 opacity-30" style={{
                        backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)',
                    }} />

                    {isImageUrl(gift.image) ? (
                        <img src={formatImageUrl(gift.image)} alt={gift.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <span className="text-6xl group-hover:scale-110 transition-transform duration-500 drop-shadow-lg">
                            {gift.image}
                        </span>
                    )}

                    {/* Category badge */}
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[10px] font-medium text-white/90 capitalize border border-white/10">
                        <span>{categoryEmoji(gift.category)}</span>
                        {gift.category}
                    </span>

                    {/* On-chain badge */}
                    {isOnChain && (
                        <span className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-green-500/20 backdrop-blur-md text-[10px] font-bold text-green-400 border border-green-500/30 flex items-center gap-1">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                            </span>
                            On-Chain
                        </span>
                    )}

                    {/* Status badge for owned */}
                    {owned && !isOnChain && (
                        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusBadgeColor(gift.status)} capitalize`}>
                            {gift.status}
                        </span>
                    )}
                    {owned && isOnChain && (
                        <span className={`absolute top-11 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusBadgeColor(gift.status)} capitalize`}>
                            {gift.status}
                        </span>
                    )}

                    {/* Expiry */}
                    {gift.expiryDate && (
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/50 backdrop-blur-md text-[9px] text-white/70 border border-white/10">
                            Exp: {new Date(gift.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                    )}
                </div>
            </Link>

            {/* Card Body */}
            <div className="p-4">
                <Link to={`/gift/${gift.id}`}>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-primary-light transition-colors truncate">{gift.title}</h3>
                </Link>
                <p className="text-xs text-text-muted mb-3 line-clamp-2 leading-relaxed">{gift.description}</p>

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold gradient-text-subtle" style={{ fontFamily: 'var(--font-display)' }}>{gift.price}</span>
                        <span className="text-xs text-text-muted">ETH</span>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-text-muted mb-0.5">{gift.available} / {gift.quantity}</div>
                        <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                                <span key={i} className={`text-[10px] ${i < Math.floor(gift.sellerRating) ? 'text-accent' : 'text-border'}`}>★</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                {owned ? (
                    <div className="flex gap-2">
                        {gift.status === 'active' && (
                            <>
                                <button onClick={() => onAction?.('redeem')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all cursor-pointer border border-green-500/20 hover:border-green-500/40">
                                    🎉 Redeem
                                </button>
                                <button onClick={() => onAction?.('transfer')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-primary/15 text-primary-light hover:bg-primary/25 transition-all cursor-pointer border border-primary/20 hover:border-primary/40">
                                    🎁 Transfer
                                </button>
                            </>
                        )}
                        {gift.status === 'redeemed' && (
                            <span className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-surface-lighter text-text-muted text-center">
                                Redeemed ✓
                            </span>
                        )}
                        {gift.status === 'listed' && (
                            <button onClick={() => onAction?.('delist')} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-accent/15 text-accent hover:bg-accent/25 transition-all cursor-pointer border border-accent/20">
                                Delist
                            </button>
                        )}
                    </div>
                ) : (
                    <Link
                        to={`/gift/${gift.id}`}
                        className="group/btn block w-full py-2.5 rounded-xl text-center text-sm font-semibold gradient-primary text-white hover:opacity-90 transition-all relative overflow-hidden"
                    >
                        <span className="relative z-10">View Details</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                    </Link>
                )}
            </div>
        </div>
    );
}
