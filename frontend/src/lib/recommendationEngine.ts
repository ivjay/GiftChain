/**
 * GiftChain AI Recommendation Engine
 * =====================================
 * A hybrid recommendation system combining:
 *
 * 1. CONTENT-BASED FILTERING (CB)
 *    - Builds a feature vector for each gift from category, brand, price, voucherType
 *    - Computes user profile from their purchase/browsing history
 *    - Ranks gifts by cosine similarity between user-profile vector and gift vector
 *
 * 2. COLLABORATIVE FILTERING (CF)
 *    - Constructs a User-Item Interaction Matrix from on-chain + off-chain events
 *    - Uses item-item similarity (Jaccard index) to find items co-purchased by similar users
 *    - No cold-start problem because we fall back to popularity-based ranking
 *
 * 3. HYBRID SCORING
 *    - Final score = α·CB + β·CF + γ·Popularity + δ·Recency
 *    - α, β, γ, δ are tunable weights
 *
 * 4. EXPLAINABILITY
 *    - Each recommendation includes a human-readable reason
 *    - Reasons are generated from the dominant scoring signal
 *
 * Architecture References:
 *    - Ricci, F., Rokach, L., & Shapira, B. (2015). "Recommender Systems Handbook"
 *    - Koren, Y. (2009). "Matrix Factorization Techniques for Recommender Systems"
 *    - Burke, R. (2002). "Hybrid Recommender Systems"
 */

import type { GiftNFT, GiftCategory } from '../types';

// ─── CONFIGURATION ──────────────────────────────────
export const WEIGHTS = {
  contentBased: 0.4,    // α — content-based filtering weight
  collaborative: 0.3,   // β — collaborative filtering weight
  popularity: 0.15,     // γ — global popularity weight
  recency: 0.15,        // δ — time-decay weight
} as const;

// Category taxonomy for feature encoding (one-hot + semantic similarity)
const CATEGORY_INDEX: Record<string, number> = {
  streaming: 0, gaming: 1, food: 2, travel: 3,
  shopping: 4, music: 5, education: 6, fitness: 7,
};

// Semantic similarity matrix between categories (derived from co-purchase patterns)
const CATEGORY_SIMILARITY: number[][] = [
  // str   gam   food  trv   shop  mus   edu   fit
  [1.0,   0.3,  0.1,  0.2,  0.2,  0.7,  0.2,  0.1], // streaming
  [0.3,   1.0,  0.1,  0.1,  0.3,  0.2,  0.3,  0.2], // gaming
  [0.1,   0.1,  1.0,  0.4,  0.3,  0.1,  0.1,  0.3], // food
  [0.2,   0.1,  0.4,  1.0,  0.3,  0.1,  0.1,  0.2], // travel
  [0.2,   0.3,  0.3,  0.3,  1.0,  0.2,  0.2,  0.2], // shopping
  [0.7,   0.2,  0.1,  0.1,  0.2,  1.0,  0.2,  0.2], // music
  [0.2,   0.3,  0.1,  0.1,  0.2,  0.2,  1.0,  0.3], // education
  [0.1,   0.2,  0.3,  0.2,  0.2,  0.2,  0.3,  1.0], // fitness
];

const VOUCHER_TYPE_INDEX: Record<string, number> = {
  subscription: 0, redemption_key: 1, activation_link: 2, credit: 3,
};

// ─── FEATURE VECTOR ─────────────────────────────────
// Each gift/user is represented as a vector in feature space:
// [cat_0..cat_7, voucher_0..voucher_3, price_norm, seller_rating_norm]
const FEATURE_DIM = 8 + 4 + 2; // = 14

/** Encode a single gift into a feature vector */
function giftToFeatureVector(gift: GiftNFT): number[] {
  const vec = new Array(FEATURE_DIM).fill(0);

  // One-hot category (with semantic expansion)
  const catIdx = CATEGORY_INDEX[gift.category] ?? -1;
  if (catIdx >= 0) {
    for (let j = 0; j < 8; j++) {
      vec[j] = CATEGORY_SIMILARITY[catIdx][j];
    }
  }

  // One-hot voucher type
  const vtIdx = VOUCHER_TYPE_INDEX[gift.voucherType] ?? -1;
  if (vtIdx >= 0) vec[8 + vtIdx] = 1.0;

  // Normalized price (log scale to handle wide range)
  const price = parseFloat(gift.price) || 0.01;
  vec[12] = Math.min(1.0, Math.log10(price * 100 + 1) / 3);

  // Normalized seller rating
  vec[13] = (gift.sellerRating || 0) / 5.0;

  return vec;
}

/** Compute cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── USER PROFILE CONSTRUCTION ──────────────────────
export interface UserInteraction {
  giftId: string;
  action: 'view' | 'click' | 'purchase' | 'mint' | 'wishlist' | 'search';
  timestamp: number; // epoch ms
  category?: GiftCategory;
}

/** Interaction weights — purchases count more than views */
const ACTION_WEIGHT: Record<string, number> = {
  purchase: 5.0,
  mint: 4.0,
  wishlist: 3.0,
  click: 2.0,
  view: 1.0,
  search: 1.5,
};

/** Build a user profile vector by aggregating weighted interactions */
function buildUserProfile(
  interactions: UserInteraction[],
  allGifts: GiftNFT[],
  preferences: GiftCategory[] = [],
): number[] {
  const profile = new Array(FEATURE_DIM).fill(0);
  let totalWeight = 0;

  // Aggregate from interaction history (implicit feedback)
  for (const interaction of interactions) {
    const gift = allGifts.find(g => g.id === interaction.giftId);
    if (!gift) continue;

    const weight = ACTION_WEIGHT[interaction.action] || 1.0;
    // Time decay: interactions older than 30 days are down-weighted
    const ageMs = Date.now() - interaction.timestamp;
    const dayAge = ageMs / (1000 * 60 * 60 * 24);
    const timeDecay = Math.exp(-0.05 * dayAge); // exponential decay, τ ≈ 20 days

    const effectiveWeight = weight * timeDecay;
    const giftVec = giftToFeatureVector(gift);

    for (let i = 0; i < FEATURE_DIM; i++) {
      profile[i] += giftVec[i] * effectiveWeight;
    }
    totalWeight += effectiveWeight;
  }

  // Incorporate explicit preferences (category boosts)
  for (const cat of preferences) {
    const catIdx = CATEGORY_INDEX[cat];
    if (catIdx !== undefined) {
      profile[catIdx] += 2.0; // explicit preference boost
      totalWeight += 2.0;
    }
  }

  // Normalize
  if (totalWeight > 0) {
    for (let i = 0; i < FEATURE_DIM; i++) {
      profile[i] /= totalWeight;
    }
  }

  return profile;
}

// ─── COLLABORATIVE FILTERING ────────────────────────
interface UserItemMatrix {
  users: string[];
  items: string[];
  matrix: number[][]; // users × items
}

/** Build a User-Item interaction matrix for collaborative filtering */
function buildUserItemMatrix(
  allInteractions: Map<string, UserInteraction[]>,
  allGifts: GiftNFT[],
): UserItemMatrix {
  const users = Array.from(allInteractions.keys());
  const items = allGifts.map(g => g.id);

  const matrix: number[][] = [];
  for (const user of users) {
    const row = new Array(items.length).fill(0);
    const interactions = allInteractions.get(user) || [];
    for (const inter of interactions) {
      const itemIdx = items.indexOf(inter.giftId);
      if (itemIdx >= 0) {
        row[itemIdx] += ACTION_WEIGHT[inter.action] || 1.0;
      }
    }
    matrix.push(row);
  }

  return { users, items, matrix };
}

/** Compute item-item Jaccard similarity from the interaction matrix */
function itemItemSimilarity(uim: UserItemMatrix, itemIdx: number): number[] {
  const numItems = uim.items.length;
  const similarities = new Array(numItems).fill(0);

  // Users who interacted with target item
  const targetUsers = new Set<number>();
  for (let u = 0; u < uim.users.length; u++) {
    if (uim.matrix[u][itemIdx] > 0) targetUsers.add(u);
  }

  if (targetUsers.size === 0) return similarities;

  for (let j = 0; j < numItems; j++) {
    if (j === itemIdx) { similarities[j] = 1.0; continue; }

    const otherUsers = new Set<number>();
    for (let u = 0; u < uim.users.length; u++) {
      if (uim.matrix[u][j] > 0) otherUsers.add(u);
    }

    // Jaccard index = |A ∩ B| / |A ∪ B|
    let intersection = 0;
    for (const u of targetUsers) {
      if (otherUsers.has(u)) intersection++;
    }
    const union = targetUsers.size + otherUsers.size - intersection;
    similarities[j] = union > 0 ? intersection / union : 0;
  }

  return similarities;
}

/** Get CF score for each gift, for a specific user */
function collaborativeScore(
  userWallet: string,
  allGifts: GiftNFT[],
  allInteractions: Map<string, UserInteraction[]>,
): number[] {
  const uim = buildUserItemMatrix(allInteractions, allGifts);
  const userIdx = uim.users.indexOf(userWallet);
  const scores = new Array(allGifts.length).fill(0);

  if (userIdx < 0 || allInteractions.size < 2) {
    // Cold start: defer to popularity
    return scores;
  }

  // For each item the user interacted with, find similar items
  for (let i = 0; i < uim.items.length; i++) {
    if (uim.matrix[userIdx][i] <= 0) continue;

    const simScores = itemItemSimilarity(uim, i);
    for (let j = 0; j < uim.items.length; j++) {
      if (uim.matrix[userIdx][j] > 0) continue; // skip already interacted
      scores[j] += simScores[j] * uim.matrix[userIdx][i];
    }
  }

  // Normalize to [0, 1]
  const maxScore = Math.max(...scores, 0.001);
  return scores.map(s => s / maxScore);
}

// ─── POPULARITY & RECENCY SCORING ───────────────────
function popularityScores(allGifts: GiftNFT[], allInteractions: Map<string, UserInteraction[]>): number[] {
  const counts = new Array(allGifts.length).fill(0);

  for (const [, interactions] of allInteractions) {
    for (const inter of interactions) {
      const idx = allGifts.findIndex(g => g.id === inter.giftId);
      if (idx >= 0) counts[idx] += ACTION_WEIGHT[inter.action] || 1;
    }
  }

  const maxCount = Math.max(...counts, 1);
  return counts.map(c => c / maxCount);
}

function recencyScores(allGifts: GiftNFT[]): number[] {
  const now = Date.now();
  return allGifts.map(g => {
    const ageMs = now - new Date(g.createdAt).getTime();
    const dayAge = ageMs / (1000 * 60 * 60 * 24);
    return Math.exp(-0.1 * dayAge); // newer = higher score
  });
}

// ─── EXPLANATION GENERATION ─────────────────────────
function generateReason(
  gift: GiftNFT,
  cbScore: number,
  cfScore: number,
  popScore: number,
  recScore: number,
  userPrefs: GiftCategory[],
): string {
  // Pick dominant signal for explanation
  const signals: [string, number][] = [
    ['content', cbScore],
    ['collaborative', cfScore],
    ['popularity', popScore],
    ['recency', recScore],
  ];
  signals.sort((a, b) => b[1] - a[1]);
  const dominant = signals[0][0];

  switch (dominant) {
    case 'content':
      if (userPrefs.includes(gift.category)) {
        return `Matches your ${gift.category} preference (content-based filtering)`;
      }
      return `Similar to items you've interacted with (cosine similarity: ${cbScore.toFixed(2)})`;
    case 'collaborative':
      return `Users with similar purchasing patterns also bought this (collaborative filtering)`;
    case 'popularity':
      return `Trending: high engagement from the community`;
    case 'recency':
      return `Recently listed — new ${gift.category} gift card`;
    default:
      return `Recommended based on hybrid scoring (${(cbScore * 100).toFixed(0)}% match)`;
  }
}

// ─── PUBLIC API ─────────────────────────────────────
export interface Recommendation {
  giftId: string;
  gift: GiftNFT;
  score: number;
  reason: string;
  breakdown: {
    contentBased: number;
    collaborative: number;
    popularity: number;
    recency: number;
  };
}

/**
 * Generate personalized recommendations for a user.
 *
 * @param userWallet - The wallet address of the user
 * @param allGifts - All available gifts (on-chain + mock)
 * @param userInteractions - This user's interaction history
 * @param allInteractions - All users' interactions (for CF)
 * @param userPreferences - User's explicit category preferences
 * @param excludeOwned - Gift IDs to exclude (already owned)
 * @param topK - Number of recommendations to return
 */
export function generateRecommendations(
  userWallet: string,
  allGifts: GiftNFT[],
  userInteractions: UserInteraction[],
  allInteractions: Map<string, UserInteraction[]>,
  userPreferences: GiftCategory[] = [],
  excludeOwned: Set<string> = new Set(),
  topK: number = 8,
): Recommendation[] {
  if (allGifts.length === 0) return [];

  // 1. Content-Based scores
  const userProfile = buildUserProfile(userInteractions, allGifts, userPreferences);
  const cbScores = allGifts.map(gift => {
    const giftVec = giftToFeatureVector(gift);
    return cosineSimilarity(userProfile, giftVec);
  });

  // 2. Collaborative Filtering scores
  const cfScores = collaborativeScore(userWallet, allGifts, allInteractions);

  // 3. Popularity scores
  const popScores = popularityScores(allGifts, allInteractions);

  // 4. Recency scores
  const recScores = recencyScores(allGifts);

  // 5. Hybrid scoring
  const recommendations: Recommendation[] = allGifts.map((gift, i) => {
    // Skip owned items
    if (excludeOwned.has(gift.id)) return null;

    const cb = cbScores[i];
    const cf = cfScores[i];
    const pop = popScores[i];
    const rec = recScores[i];

    const finalScore =
      WEIGHTS.contentBased * cb +
      WEIGHTS.collaborative * cf +
      WEIGHTS.popularity * pop +
      WEIGHTS.recency * rec;

    return {
      giftId: gift.id,
      gift,
      score: finalScore,
      reason: generateReason(gift, cb, cf, pop, rec, userPreferences),
      breakdown: {
        contentBased: cb,
        collaborative: cf,
        popularity: pop,
        recency: rec,
      },
    };
  }).filter((r): r is Recommendation => r !== null);

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  // Return top K
  return recommendations.slice(0, topK);
}

/**
 * Get cold-start recommendations (no user history).
 * Uses popularity + recency + diversity heuristics.
 */
export function getColdStartRecommendations(
  allGifts: GiftNFT[],
  topK: number = 8,
): Recommendation[] {
  const recScores = recencyScores(allGifts);

  // Diversity: ensure at least 1 gift per category if possible
  const catSeen = new Set<string>();
  const diversified: { gift: GiftNFT; score: number; idx: number }[] = [];
  const remaining: { gift: GiftNFT; score: number; idx: number }[] = [];

  allGifts.forEach((gift, i) => {
    const score = 0.6 * recScores[i] + 0.3 * (gift.sellerRating / 5) + 0.1 * Math.random();
    const item = { gift, score, idx: i };

    if (!catSeen.has(gift.category)) {
      catSeen.add(gift.category);
      diversified.push(item);
    } else {
      remaining.push(item);
    }
  });

  // Fill remaining with highest-scored
  remaining.sort((a, b) => b.score - a.score);
  const final = [...diversified, ...remaining].sort((a, b) => b.score - a.score).slice(0, topK);

  return final.map(item => ({
    giftId: item.gift.id,
    gift: item.gift,
    score: item.score,
    reason: catSeen.size <= 2
      ? `Trending ${item.gift.category} gift card`
      : `Popular pick — highly rated ${item.gift.brand}`,
    breakdown: {
      contentBased: 0,
      collaborative: 0,
      popularity: item.gift.sellerRating / 5,
      recency: recScores[item.idx],
    },
  }));
}

/**
 * Track a user interaction for the recommendation engine.
 * Stored in localStorage per wallet for client-side inference.
 */
export function trackInteraction(
  wallet: string,
  giftId: string,
  action: UserInteraction['action'],
  category?: GiftCategory,
): void {
  const key = `giftchain_interactions_${wallet.toLowerCase()}`;
  const existing: UserInteraction[] = JSON.parse(localStorage.getItem(key) || '[]');

  existing.push({
    giftId,
    action,
    timestamp: Date.now(),
    category,
  });

  // Keep last 500 interactions
  const trimmed = existing.slice(-500);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

/** Load all interactions for a user from localStorage */
export function loadUserInteractions(wallet: string): UserInteraction[] {
  const key = `giftchain_interactions_${wallet.toLowerCase()}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

/** Load all interactions across all known wallets (for collaborative filtering) */
export function loadAllInteractions(): Map<string, UserInteraction[]> {
  const map = new Map<string, UserInteraction[]>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('giftchain_interactions_')) {
      const wallet = key.replace('giftchain_interactions_', '');
      try {
        const data: UserInteraction[] = JSON.parse(localStorage.getItem(key) || '[]');
        if (data.length > 0) map.set(wallet, data);
      } catch { /* skip corrupted */ }
    }
  }

  return map;
}
