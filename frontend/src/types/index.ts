export interface GiftNFT {
    id: string;
    tokenId: number;
    title: string;
    description: string;
    brand: string;
    category: GiftCategory;
    voucherType: VoucherType;
    price: string;
    priceUSD: number;
    quantity: number;
    available: number;
    image: string;
    seller: string;
    sellerRating: number;
    expiryDate?: string;
    ipfsCID: string;
    status: GiftStatus;
    createdAt: string;
    terms?: string;
    ownershipHistory: OwnershipRecord[];
    /** How many of this token the current user owns (only set for on-chain) */
    _userBalance?: number;
    /** The active listing ID if listed on marketplace */
    listingId?: number;
    /** The raw bigint price per unit if listed */
    _rawPricePerUnit?: bigint;
}

export type GiftCategory = 'streaming' | 'gaming' | 'food' | 'travel' | 'shopping' | 'music' | 'education' | 'fitness';
export type VoucherType = 'subscription' | 'redemption_key' | 'activation_link' | 'credit';
export type GiftStatus = 'active' | 'redeemed' | 'listed' | 'expired' | 'canceled';
export type ReceiptType = 'mint' | 'purchase' | 'redeem' | 'transfer';

export interface OwnershipRecord {
    owner: string;
    timestamp: string;
    txHash: string;
    action: string;
}

export interface Receipt {
    id: string;
    userWallet: string;
    type: ReceiptType;
    txHash: string;
    tokenId: number;
    giftTitle: string;
    amount?: string;
    fee?: string;
    counterparty?: string;
    ipfsCID?: string;
    timestamp: string;
    status: 'confirmed' | 'pending' | 'failed';
    metadata?: Record<string, unknown>;
}

export interface UserProfile {
    wallet: string;
    displayName: string;
    avatar: string;
    preferences: GiftCategory[];
    createdAt: string;
}

export interface FraudAlert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    wallet: string;
    timestamp: string;
    status: 'active' | 'reviewed' | 'dismissed';
    recommendedAction: string;
}

export interface AIRecommendation {
    giftId: string;
    score: number;
    reason: string;
}

export interface PlatformAnalytics {
    totalMints: number;
    totalSales: number;
    totalVolume: string;
    activeUsers: number;
    totalRevenue: string;
    avgGasPrice: string;
    recommendationCTR: number;
    conversionLift: number;
    fraudAlertsCount: number;
}
