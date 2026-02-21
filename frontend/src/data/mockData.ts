import type { GiftNFT, Receipt, FraudAlert, PlatformAnalytics, UserProfile } from '../types';

const categories = ['streaming', 'gaming', 'food', 'travel', 'shopping', 'music', 'education', 'fitness'] as const;
const brands: Record<string, { name: string; image: string; category: typeof categories[number] }> = {
    netflix: { name: 'Netflix Premium', image: '🎬', category: 'streaming' },
    spotify: { name: 'Spotify Premium', image: '🎵', category: 'music' },
    steam: { name: 'Steam Wallet', image: '🎮', category: 'gaming' },
    uber_eats: { name: 'Uber Eats Credit', image: '🍔', category: 'food' },
    airbnb: { name: 'Airbnb Travel Credit', image: '✈️', category: 'travel' },
    amazon: { name: 'Amazon Gift Card', image: '📦', category: 'shopping' },
    coursera: { name: 'Coursera Plus', image: '📚', category: 'education' },
    peloton: { name: 'Peloton Membership', image: '🏋️', category: 'fitness' },
    xbox: { name: 'Xbox Game Pass', image: '🕹️', category: 'gaming' },
    hulu: { name: 'Hulu Premium', image: '📺', category: 'streaming' },
    doordash: { name: 'DoorDash Credit', image: '🥡', category: 'food' },
    expedia: { name: 'Expedia Travel', image: '🌍', category: 'travel' },
    apple_music: { name: 'Apple Music', image: '🎶', category: 'music' },
    playstation: { name: 'PlayStation Plus', image: '🎯', category: 'gaming' },
    grubhub: { name: 'Grubhub Gift Card', image: '🍕', category: 'food' },
    udemy: { name: 'Udemy Pro', image: '🎓', category: 'education' },
};

const mockWallets = [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68',
    '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
];

function randomAddr(): string {
    return mockWallets[Math.floor(Math.random() * mockWallets.length)];
}

function genTxHash(): string {
    return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function genCID(): string {
    return 'Qm' + Array.from({ length: 44 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
}

const brandKeys = Object.keys(brands);

export const mockGifts: GiftNFT[] = brandKeys.map((key, i) => {
    const b = brands[key];
    const prices = ['0.01', '0.025', '0.05', '0.08', '0.1', '0.15', '0.02', '0.03'];
    const priceUSD = [25, 50, 100, 150, 200, 300, 40, 75];
    return {
        id: `gift-${i + 1}`,
        tokenId: 1000 + i,
        title: b.name,
        description: `Premium ${b.name} digital gift card. Redeem for instant access to ${b.name} services. Perfect for gifting to friends and family.`,
        brand: key,
        category: b.category,
        voucherType: i % 4 === 0 ? 'subscription' : i % 4 === 1 ? 'redemption_key' : i % 4 === 2 ? 'activation_link' : 'credit',
        price: prices[i % prices.length],
        priceUSD: priceUSD[i % priceUSD.length],
        quantity: Math.floor(Math.random() * 50) + 5,
        available: Math.floor(Math.random() * 30) + 1,
        image: b.image,
        seller: randomAddr(),
        sellerRating: 3.5 + Math.random() * 1.5,
        expiryDate: i % 3 === 0 ? new Date(Date.now() + 86400000 * (30 + Math.floor(Math.random() * 335))).toISOString() : undefined,
        ipfsCID: genCID(),
        status: 'active',
        createdAt: new Date(Date.now() - 86400000 * Math.floor(Math.random() * 60)).toISOString(),
        terms: 'Non-refundable. Single use only. Subject to platform terms of service.',
        ownershipHistory: [
            { owner: randomAddr(), timestamp: new Date(Date.now() - 86400000 * 30).toISOString(), txHash: genTxHash(), action: 'Minted' },
            { owner: randomAddr(), timestamp: new Date(Date.now() - 86400000 * 15).toISOString(), txHash: genTxHash(), action: 'Purchased' },
        ]
    };
});

export const mockMyCollection: GiftNFT[] = mockGifts.slice(0, 6).map((g, i) => ({
    ...g,
    id: `my-${g.id}`,
    status: i === 0 ? 'redeemed' : i === 5 ? 'listed' : 'active',
}));

export const mockReceipts: Receipt[] = [
    { id: 'r1', userWallet: mockWallets[0], type: 'mint', txHash: genTxHash(), tokenId: 1000, giftTitle: 'Netflix Premium', amount: '0.01', fee: '0.002', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'confirmed', ipfsCID: genCID() },
    { id: 'r2', userWallet: mockWallets[0], type: 'purchase', txHash: genTxHash(), tokenId: 1001, giftTitle: 'Spotify Premium', amount: '0.025', fee: '0.001', counterparty: mockWallets[1], timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'confirmed' },
    { id: 'r3', userWallet: mockWallets[0], type: 'redeem', txHash: genTxHash(), tokenId: 1002, giftTitle: 'Steam Wallet', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'confirmed' },
    { id: 'r4', userWallet: mockWallets[0], type: 'transfer', txHash: genTxHash(), tokenId: 1003, giftTitle: 'Uber Eats Credit', counterparty: mockWallets[2], timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'confirmed' },
    { id: 'r5', userWallet: mockWallets[0], type: 'purchase', txHash: genTxHash(), tokenId: 1004, giftTitle: 'Airbnb Travel Credit', amount: '0.05', fee: '0.0015', counterparty: mockWallets[3], timestamp: new Date(Date.now() - 86400000 * 7).toISOString(), status: 'confirmed' },
    { id: 'r6', userWallet: mockWallets[0], type: 'mint', txHash: genTxHash(), tokenId: 1005, giftTitle: 'Amazon Gift Card', amount: '0.08', fee: '0.003', timestamp: new Date().toISOString(), status: 'pending' },
];

export const mockFraudAlerts: FraudAlert[] = [
    { id: 'fa1', severity: 'critical', type: 'Rapid Bulk Purchase', description: 'Wallet executed 47 purchases in under 2 minutes — potential automated bot activity.', wallet: mockWallets[4], timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'active', recommendedAction: 'Suspend wallet and review all recent transactions' },
    { id: 'fa2', severity: 'high', type: 'Duplicate Credential', description: 'Same voucher credential hash detected across 3 different minted tokens.', wallet: mockWallets[3], timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'active', recommendedAction: 'Flag listings for manual review and notify seller' },
    { id: 'fa3', severity: 'medium', type: 'Price Manipulation', description: 'Listing price changed 12 times within 1 hour, possibly wash trading pattern.', wallet: mockWallets[2], timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'reviewed', recommendedAction: 'Monitor for 24h before action' },
    { id: 'fa4', severity: 'low', type: 'Abnormal Redemption', description: 'User redeemed 5 vouchers in quick succession — likely legitimate bulk user.', wallet: mockWallets[1], timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'dismissed', recommendedAction: 'No action required' },
];

export const mockAnalytics: PlatformAnalytics = {
    totalMints: 1247,
    totalSales: 3891,
    totalVolume: '142.5 ETH',
    activeUsers: 2834,
    totalRevenue: '3.56 ETH',
    avgGasPrice: '0.002 ETH',
    recommendationCTR: 12.4,
    conversionLift: 34.7,
    fraudAlertsCount: 4,
};

export const mockUser: UserProfile = {
    wallet: mockWallets[0],
    displayName: 'GiftChain User',
    avatar: '🎁',
    preferences: ['gaming', 'streaming', 'music'],
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
};
