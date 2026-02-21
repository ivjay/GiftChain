import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HiDownload, HiExternalLink, HiFilter, HiClipboardCopy } from 'react-icons/hi';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem, formatEther } from 'viem';
import { mockReceipts } from '../data/mockData';
import { formatDateTime, truncateAddress, explorerUrl, statusBadgeColor, generateReceiptPDF, copyToClipboard } from '../lib/utils';
import type { Receipt, ReceiptType } from '../types';

const NFT_ADDRESS = (import.meta.env.VITE_GIFT_NFT_ADDRESS || '0x') as `0x${string}`;
const MARKETPLACE_ADDRESS = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '0x') as `0x${string}`;

const typeIcons: Record<ReceiptType, string> = { mint: '🪙', purchase: '🛒', redeem: '🎉', transfer: '🎁' };
const typeFilters: { value: ReceiptType | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'mint', label: '🪙 Mint' },
    { value: 'purchase', label: '🛒 Purchase' },
    { value: 'redeem', label: '🎉 Redeem' },
    { value: 'transfer', label: '🎁 Transfer' },
];

export default function Transactions() {
    const [typeFilter, setTypeFilter] = useState<ReceiptType | ''>('');
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [onChainReceipts, setOnChainReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch on-chain events
    useEffect(() => {
        if (!publicClient || !address) return;

        async function fetchEvents() {
            setLoading(true);
            const receipts: Receipt[] = [];

            try {
                // Fetch GiftMinted events
                const mintLogs = await publicClient!.getLogs({
                    address: NFT_ADDRESS,
                    event: parseAbiItem('event GiftMinted(uint256 indexed tokenId, address indexed creator, uint256 quantity, string ipfsCID, string category)'),
                    fromBlock: 34000000n,
                    toBlock: 'latest',
                });

                for (const log of mintLogs) {
                    const block = await publicClient!.getBlock({ blockHash: log.blockHash! });
                    receipts.push({
                        id: `mint-${log.transactionHash}`,
                        userWallet: log.args.creator || '',
                        type: 'mint',
                        txHash: log.transactionHash!,
                        tokenId: Number(log.args.tokenId),
                        giftTitle: `Gift #${log.args.tokenId} (${log.args.category})`,
                        amount: 'Free',
                        timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
                        status: 'confirmed',
                        ipfsCID: log.args.ipfsCID,
                    });
                }

                // Fetch ItemSold events from marketplace
                try {
                    const soldLogs = await publicClient!.getLogs({
                        address: MARKETPLACE_ADDRESS,
                        event: parseAbiItem('event ItemSold(uint256 indexed listingId, address indexed buyer, address indexed nftContract, uint256 tokenId, uint256 quantity, uint256 totalPrice)'),
                        fromBlock: 34000000n,
                        toBlock: 'latest',
                    });

                    for (const log of soldLogs) {
                        const block = await publicClient!.getBlock({ blockHash: log.blockHash! });
                        receipts.push({
                            id: `purchase-${log.transactionHash}`,
                            userWallet: log.args.buyer || '',
                            type: 'purchase',
                            txHash: log.transactionHash!,
                            tokenId: Number(log.args.tokenId),
                            giftTitle: `Gift #${log.args.tokenId}`,
                            amount: `${formatEther(log.args.totalPrice || 0n)} ETH`,
                            timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
                            status: 'confirmed',
                        });
                    }
                } catch { /* no sales yet */ }

                // Fetch GiftRedeemed events
                try {
                    const redeemLogs = await publicClient!.getLogs({
                        address: NFT_ADDRESS,
                        event: parseAbiItem('event GiftRedeemed(uint256 indexed tokenId, address indexed redeemer, uint256 quantity, uint256 timestamp)'),
                        fromBlock: 34000000n,
                        toBlock: 'latest',
                    });

                    for (const log of redeemLogs) {
                        receipts.push({
                            id: `redeem-${log.transactionHash}`,
                            userWallet: log.args.redeemer || '',
                            type: 'redeem',
                            txHash: log.transactionHash!,
                            tokenId: Number(log.args.tokenId),
                            giftTitle: `Gift #${log.args.tokenId}`,
                            timestamp: new Date(Number(log.args.timestamp || 0n) * 1000).toISOString(),
                            status: 'confirmed',
                        });
                    }
                } catch { /* no redeems yet */ }

            } catch (err) {
                console.error('[Transactions] Error fetching events:', err);
            }

            // Sort by date descending
            receipts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setOnChainReceipts(receipts);
            setLoading(false);
        }

        fetchEvents();
    }, [publicClient, address]);

    // Combine on-chain + mock receipts
    const allReceipts = useMemo(() => {
        return [...onChainReceipts, ...mockReceipts];
    }, [onChainReceipts]);

    const filtered = typeFilter ? allReceipts.filter(r => r.type === typeFilter) : allReceipts;

    return (
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Transaction History</h1>
                    <p className="text-text-muted mt-1">
                        {onChainReceipts.length} on-chain + {mockReceipts.length} demo receipts
                        {loading && <span className="ml-2 text-primary-light animate-pulse">Loading...</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <HiFilter className="text-text-muted" />
                    {typeFilters.map(f => (
                        <button key={f.value} onClick={() => setTypeFilter(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${typeFilter === f.value ? 'bg-primary text-white' : 'bg-surface-light text-text-muted hover:text-text'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* On-chain receipts highlight */}
            {onChainReceipts.length > 0 && !typeFilter && (
                <div className="rounded-2xl glass p-4 mb-6 border border-green-500/20">
                    <p className="text-xs text-green-400 font-medium">⛓️ {onChainReceipts.length} real blockchain transaction(s) found</p>
                </div>
            )}

            <div className="space-y-4">
                {filtered.map((receipt, i) => (
                    <motion.div key={receipt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className={`rounded-2xl glass p-5 hover:bg-card-hover transition-colors ${receipt.id.startsWith('mint-') || receipt.id.startsWith('purchase-') || receipt.id.startsWith('redeem-') ? 'border-l-4 border-l-green-500/40' : ''}`}>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-surface-light flex items-center justify-center text-2xl shrink-0">
                                {typeIcons[receipt.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h3 className="font-semibold text-sm">{receipt.giftTitle}</h3>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadgeColor(receipt.status)}`}>{receipt.status}</span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-light text-text-muted capitalize">{receipt.type}</span>
                                    {(receipt.id.startsWith('mint-') || receipt.id.startsWith('purchase-') || receipt.id.startsWith('redeem-')) && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/20 text-green-400">On-Chain</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted mt-2">
                                    <span>Token #{receipt.tokenId}</span>
                                    <span>{formatDateTime(receipt.timestamp)}</span>
                                    {receipt.amount && <span className="text-accent font-medium">{receipt.amount}</span>}
                                    {receipt.fee && <span>Fee: {receipt.fee} ETH</span>}
                                    {receipt.counterparty && <span>↔ {truncateAddress(receipt.counterparty)}</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <a href={explorerUrl(receipt.txHash)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-light hover:text-primary flex items-center gap-1 w-fit">
                                        <HiExternalLink className="text-[10px]" /> {truncateAddress(receipt.txHash)}
                                    </a>
                                    <button 
                                        onClick={async () => {
                                            const success = await copyToClipboard(receipt.txHash);
                                            if (success) alert('Tx hash copied!');
                                        }}
                                        className="p-1 rounded bg-surface-lighter hover:bg-white/10 transition-colors cursor-pointer text-text-muted hover:text-primary-light"
                                        title="Copy Hash"
                                    >
                                        <HiClipboardCopy size={12} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => generateReceiptPDF(receipt)} className="shrink-0 p-3 rounded-xl glass hover:bg-white/10 transition-colors group cursor-pointer" title="Download PDF">
                                <HiDownload className="text-text-muted group-hover:text-primary-light transition-colors" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
            {filtered.length === 0 && (
                <div className="text-center py-20 rounded-2xl glass">
                    <span className="text-5xl block mb-4">📋</span>
                    <h3 className="text-lg font-semibold mb-2">No receipts found</h3>
                    <p className="text-text-muted text-sm">Try adjusting your filters or make your first transaction</p>
                </div>
            )}
        </div>
    );
}
