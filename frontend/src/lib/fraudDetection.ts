/**
 * GiftChain Fraud Detection Engine
 * ==================================
 * Implements multiple heuristic-based anomaly detectors that analyze
 * on-chain transaction patterns to identify suspicious activity.
 *
 * Detection Modules:
 * 1. WASH TRADING   — Detects circular transactions between related wallets
 * 2. VELOCITY ABUSE — Flags accounts with unusually high transaction frequency
 * 3. PRICE ANOMALY  — Identifies listings far outside statistical norms (>2σ)
 * 4. SYBIL PATTERNS — Detects multiple wallets exhibiting coordinated behavior
 * 5. RAPID FLIP     — Flags buy-then-relist within short timeframes (arbitrage)
 *
 * Each detector returns a FraudAlert[] with severity, confidence, and evidence.
 *
 * References:
 *   - Victor, F. & Weintraut, A.M. (2021). "Detecting and Quantifying Wash Trading on Decentralized Cryptocurrency Exchanges"
 *   - Chen, W. et al. (2020). "Detecting Ponzi Schemes on Ethereum"
 */

import type { FraudAlert } from '../types';

// ─── TRANSACTION MODEL ──────────────────────────────
export interface OnChainTransaction {
  txHash: string;
  from: string;
  to: string;
  tokenId: number;
  type: 'mint' | 'purchase' | 'transfer' | 'list' | 'redeem';
  priceWei?: bigint;
  priceETH?: number;
  timestamp: number; // epoch seconds
  blockNumber: number;
}

// ─── DETECTOR CONFIGURATION ─────────────────────────
export const FRAUD_CONFIG = {
  washTrading: {
    windowSeconds: 7 * 24 * 3600,        // 7 day lookback
    minCycleLength: 2,                    // A→B→A = 2 hops
    maxCycleLength: 4,                    // A→B→C→D→A
    confidenceThreshold: 0.7,
  },
  velocity: {
    maxTxPerHour: 10,                     // More than 10 tx/hr is suspicious
    maxTxPerDay: 50,                      // More than 50 tx/day
    maxMintsPerDay: 20,                   // Anti-spam minting
    criticalMultiplier: 3,               // 3x over threshold = critical
  },
  priceAnomaly: {
    zScoreThreshold: 2.0,                // Flag prices >2σ from mean
    minSampleSize: 5,                    // Need 5+ listings for stats
    suspiciouslyLowRatio: 0.1,           // <10% of avg = suspicious
    suspiciouslyHighRatio: 10,           // >10x avg = suspicious
  },
  rapidFlip: {
    minFlipTimeSeconds: 300,             // Relist within 5min = suspicious
    maxFlipTimeSeconds: 3600,            // Within 1hr = noteworthy
    minPriceIncreasePct: 50,             // >50% markup on rapid flip
  },
  sybil: {
    minWalletsInCluster: 3,              // 3+ wallets acting together
    maxTimeDeltaSeconds: 60,             // Actions within 1min of each other
    fundingSimilarityThreshold: 0.8,     // Similar funding patterns
  },
} as const;

// ─── 1. WASH TRADING DETECTOR ───────────────────────
/**
 * Detects circular trading patterns (A sells to B, B sells back to A)
 * by building a directed graph of token transfers and finding cycles.
 */
export function detectWashTrading(transactions: OnChainTransaction[]): FraudAlert[] {
  const alerts: FraudAlert[] = [];
  const now = Date.now() / 1000;
  const window = FRAUD_CONFIG.washTrading.windowSeconds;

  // Filter to recent transfer/purchase transactions
  const recent = transactions.filter(
    tx => (tx.type === 'purchase' || tx.type === 'transfer') &&
          (now - tx.timestamp) < window
  );

  // Build adjacency list per token: from→to transitions
  const graphs = new Map<number, Map<string, Set<string>>>(); // tokenId → { from → Set<to> }

  for (const tx of recent) {
    if (!graphs.has(tx.tokenId)) graphs.set(tx.tokenId, new Map());
    const graph = graphs.get(tx.tokenId)!;
    const fromLower = tx.from.toLowerCase();
    const toLower = tx.to.toLowerCase();
    if (!graph.has(fromLower)) graph.set(fromLower, new Set());
    graph.get(fromLower)!.add(toLower);
  }

  // DFS for cycles in each token's transfer graph
  for (const [tokenId, graph] of graphs) {
    for (const [startNode] of graph) {
      const visited = new Set<string>();
      const path: string[] = [];

      function dfs(node: string, depth: number): boolean {
        if (depth > FRAUD_CONFIG.washTrading.maxCycleLength) return false;
        if (depth >= FRAUD_CONFIG.washTrading.minCycleLength && node === startNode) {
          // Found a cycle!
          const confidence = Math.min(1.0, 0.5 + depth * 0.15);
          const severity = confidence > 0.8 ? 'critical' : confidence > 0.6 ? 'high' : 'medium';

          alerts.push({
            id: `wash-${tokenId}-${startNode.slice(0, 8)}-${Date.now()}`,
            severity,
            type: 'Wash Trading',
            description: `Circular trading pattern detected for Token #${tokenId}. Path: ${path.join(' → ')} → ${startNode} (${depth} hops). This suggests artificial volume inflation.`,
            wallet: startNode,
            timestamp: new Date().toISOString(),
            status: 'active',
            recommendedAction: `Investigate addresses in cycle: ${path.slice(0, 3).join(', ')}. Consider flagging Token #${tokenId} for review.`,
          });
          return true;
        }

        if (visited.has(node)) return false;
        visited.add(node);
        path.push(node);

        const neighbors = graph.get(node);
        if (neighbors) {
          for (const next of neighbors) {
            if (dfs(next, depth + 1)) return true;
          }
        }

        path.pop();
        visited.delete(node);
        return false;
      }

      dfs(startNode, 0);
    }
  }

  return alerts;
}

// ─── 2. VELOCITY ABUSE DETECTOR ─────────────────────
/**
 * Flags accounts with suspiciously high transaction frequency.
 * Uses sliding window analysis over 1hr and 24hr periods.
 */
export function detectVelocityAbuse(transactions: OnChainTransaction[]): FraudAlert[] {
  const alerts: FraudAlert[] = [];
  const now = Date.now() / 1000;

  // Group by wallet
  const perWallet = new Map<string, OnChainTransaction[]>();
  for (const tx of transactions) {
    const wallet = tx.from.toLowerCase();
    if (!perWallet.has(wallet)) perWallet.set(wallet, []);
    perWallet.get(wallet)!.push(tx);
  }

  for (const [wallet, txs] of perWallet) {
    // Count transactions in last hour
    const lastHour = txs.filter(tx => (now - tx.timestamp) < 3600);
    const lastDay = txs.filter(tx => (now - tx.timestamp) < 86400);
    const mintsLastDay = lastDay.filter(tx => tx.type === 'mint');

    const config = FRAUD_CONFIG.velocity;

    if (lastHour.length > config.maxTxPerHour) {
      const ratio = lastHour.length / config.maxTxPerHour;
      const severity = ratio >= config.criticalMultiplier ? 'critical' : ratio >= 2 ? 'high' : 'medium';

      alerts.push({
        id: `velocity-hr-${wallet.slice(0, 8)}-${Date.now()}`,
        severity,
        type: 'Velocity Abuse',
        description: `Wallet ${wallet.slice(0, 10)}... executed ${lastHour.length} transactions in the last hour (threshold: ${config.maxTxPerHour}). This is ${ratio.toFixed(1)}x the normal rate and may indicate automated bot activity.`,
        wallet,
        timestamp: new Date().toISOString(),
        status: 'active',
        recommendedAction: 'Rate-limit this wallet. Check if transactions are automated. Consider temporary suspension if pattern continues.',
      });
    }

    if (lastDay.length > config.maxTxPerDay) {
      const ratio = lastDay.length / config.maxTxPerDay;
      alerts.push({
        id: `velocity-day-${wallet.slice(0, 8)}-${Date.now()}`,
        severity: ratio >= config.criticalMultiplier ? 'high' : 'medium',
        type: 'High Frequency Trading',
        description: `Wallet ${wallet.slice(0, 10)}... has ${lastDay.length} transactions today (threshold: ${config.maxTxPerDay}). Ratio: ${ratio.toFixed(1)}x normal.`,
        wallet,
        timestamp: new Date().toISOString(),
        status: 'active',
        recommendedAction: 'Monitor wallet for additional suspicious patterns. Cross-reference with wash trading analysis.',
      });
    }

    if (mintsLastDay.length > config.maxMintsPerDay) {
      alerts.push({
        id: `velocity-mint-${wallet.slice(0, 8)}-${Date.now()}`,
        severity: 'high',
        type: 'Spam Minting',
        description: `Wallet ${wallet.slice(0, 10)}... minted ${mintsLastDay.length} tokens in 24 hours. This exceeds the ${config.maxMintsPerDay} mint/day threshold and may be a spam attack.`,
        wallet,
        timestamp: new Date().toISOString(),
        status: 'active',
        recommendedAction: 'Flag all recently minted tokens for quality review. Consider adding minting cooldown for this wallet.',
      });
    }
  }

  return alerts;
}

// ─── 3. PRICE ANOMALY DETECTOR ──────────────────────
/**
 * Uses Z-score analysis to detect listings with prices significantly
 * deviating from the category mean. Flags both suspiciously low prices
 * (potential scam/stolen credentials) and suspiciously high (market manipulation).
 */
export function detectPriceAnomalies(
  listings: { tokenId: number; priceETH: number; seller: string; category: string }[],
): FraudAlert[] {
  const alerts: FraudAlert[] = [];

  // Group by category
  const byCategory = new Map<string, typeof listings>();
  for (const listing of listings) {
    if (!byCategory.has(listing.category)) byCategory.set(listing.category, []);
    byCategory.get(listing.category)!.push(listing);
  }

  for (const [category, catListings] of byCategory) {
    if (catListings.length < FRAUD_CONFIG.priceAnomaly.minSampleSize) continue;

    // Calculate statistics
    const prices = catListings.map(l => l.priceETH);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length);

    if (stdDev === 0) continue; // All prices identical, skip

    for (const listing of catListings) {
      const zScore = (listing.priceETH - mean) / stdDev;

      // Check for suspiciously low price
      if (zScore < -FRAUD_CONFIG.priceAnomaly.zScoreThreshold ||
          listing.priceETH < mean * FRAUD_CONFIG.priceAnomaly.suspiciouslyLowRatio) {
        alerts.push({
          id: `price-low-${listing.tokenId}-${Date.now()}`,
          severity: listing.priceETH < mean * 0.05 ? 'critical' : 'high',
          type: 'Suspiciously Low Price',
          description: `Token #${listing.tokenId} listed at ${listing.priceETH.toFixed(4)} ETH in ${category} — that's ${Math.abs(zScore).toFixed(1)}σ below the category average of ${mean.toFixed(4)} ETH. May indicate stolen/invalid credentials.`,
          wallet: listing.seller,
          timestamp: new Date().toISOString(),
          status: 'active',
          recommendedAction: `Verify the credential validity for Token #${listing.tokenId}. Contact seller for explanation. Consider delisting if unresponsive.`,
        });
      }

      // Check for suspiciously high price
      if (zScore > FRAUD_CONFIG.priceAnomaly.zScoreThreshold ||
          listing.priceETH > mean * FRAUD_CONFIG.priceAnomaly.suspiciouslyHighRatio) {
        alerts.push({
          id: `price-high-${listing.tokenId}-${Date.now()}`,
          severity: 'medium',
          type: 'Overpriced Listing',
          description: `Token #${listing.tokenId} listed at ${listing.priceETH.toFixed(4)} ETH — ${zScore.toFixed(1)}σ above the ${category} average (${mean.toFixed(4)} ETH). Possible price manipulation or scam listing.`,
          wallet: listing.seller,
          timestamp: new Date().toISOString(),
          status: 'active',
          recommendedAction: 'Routine monitoring. Flag listing with price warning for buyers.',
        });
      }
    }
  }

  return alerts;
}

// ─── 4. RAPID FLIP DETECTOR ─────────────────────────
/**
 * Detects buy-then-relist patterns within short timeframes,
 * especially with significant price markup.
 */
export function detectRapidFlips(transactions: OnChainTransaction[]): FraudAlert[] {
  const alerts: FraudAlert[] = [];

  // Find purchase events followed by list events for the same token by the same buyer
  const purchases = transactions.filter(tx => tx.type === 'purchase');
  const listings = transactions.filter(tx => tx.type === 'list');

  for (const purchase of purchases) {
    const buyer = purchase.to.toLowerCase();
    const relistings = listings.filter(
      l => l.from.toLowerCase() === buyer &&
           l.tokenId === purchase.tokenId &&
           l.timestamp > purchase.timestamp
    );

    for (const relist of relistings) {
      const flipTimeSeconds = relist.timestamp - purchase.timestamp;

      if (flipTimeSeconds < FRAUD_CONFIG.rapidFlip.maxFlipTimeSeconds) {
        const buyPrice = purchase.priceETH || 0;
        const listPrice = relist.priceETH || 0;
        const markup = buyPrice > 0 ? ((listPrice - buyPrice) / buyPrice) * 100 : 0;

        const severity = flipTimeSeconds < FRAUD_CONFIG.rapidFlip.minFlipTimeSeconds
          ? 'high' : 'medium';

        if (markup > FRAUD_CONFIG.rapidFlip.minPriceIncreasePct || flipTimeSeconds < FRAUD_CONFIG.rapidFlip.minFlipTimeSeconds) {
          alerts.push({
            id: `flip-${purchase.tokenId}-${buyer.slice(0, 8)}-${Date.now()}`,
            severity,
            type: 'Rapid Flip',
            description: `Token #${purchase.tokenId} was purchased and relisted within ${Math.floor(flipTimeSeconds / 60)} minutes${markup > 0 ? ` with a ${markup.toFixed(0)}% markup` : ''}. This may indicate arbitrage or speculative manipulation.`,
            wallet: buyer,
            timestamp: new Date().toISOString(),
            status: 'active',
            recommendedAction: 'Monitor for repeated flip patterns. If systematic, consider adding listing cooldown for recently purchased items.',
          });
        }
      }
    }
  }

  return alerts;
}

// ─── 5. SYBIL PATTERN DETECTOR ──────────────────────
/**
 * Identifies clusters of wallets that exhibit coordinated behavior,
 * which may indicate a single entity operating multiple accounts.
 */
export function detectSybilPatterns(transactions: OnChainTransaction[]): FraudAlert[] {
  const alerts: FraudAlert[] = [];

  // Group transactions by timestamp proximity
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  // Sliding window to find bursts of simultaneous transactions from different wallets
  for (let i = 0; i < sorted.length; i++) {
    const cluster: Set<string> = new Set();
    const clusterTxs: OnChainTransaction[] = [];

    for (let j = i; j < sorted.length; j++) {
      if (sorted[j].timestamp - sorted[i].timestamp > FRAUD_CONFIG.sybil.maxTimeDeltaSeconds) break;
      cluster.add(sorted[j].from.toLowerCase());
      clusterTxs.push(sorted[j]);
    }

    if (cluster.size >= FRAUD_CONFIG.sybil.minWalletsInCluster) {
      // Check if they're all performing similar actions on similar tokens
      const tokenIds = new Set(clusterTxs.map(t => t.tokenId));
      const actions = new Set(clusterTxs.map(t => t.type));

      if (tokenIds.size <= 2 && actions.size <= 2) {
        const wallets = Array.from(cluster);
        alerts.push({
          id: `sybil-${wallets[0].slice(0, 8)}-${Date.now()}`,
          severity: cluster.size >= 5 ? 'critical' : 'high',
          type: 'Coordinated Sybil Activity',
          description: `${cluster.size} wallets performed ${actions.size === 1 ? Array.from(actions)[0] : 'similar'} actions on Token(s) #${Array.from(tokenIds).join(', ')} within ${FRAUD_CONFIG.sybil.maxTimeDeltaSeconds}s. Wallets may be controlled by the same entity.`,
          wallet: wallets[0],
          timestamp: new Date().toISOString(),
          status: 'active',
          recommendedAction: `Investigate wallet cluster: ${wallets.slice(0, 3).map(w => w.slice(0, 10) + '...').join(', ')}. Check funding source similarity on Etherscan.`,
        });
      }
    }
  }

  // Deduplicate alerts (same cluster detected multiple times in sliding window)
  const unique = new Map<string, FraudAlert>();
  for (const alert of alerts) {
    const key = `${alert.type}-${alert.wallet}`;
    if (!unique.has(key) || alert.severity > (unique.get(key)?.severity || '')) {
      unique.set(key, alert);
    }
  }

  return Array.from(unique.values());
}

// ─── MASTER ANALYSIS ────────────────────────────────
/**
 * Run all fraud detectors on a set of transactions.
 * Returns combined, deduplicated, severity-sorted alerts.
 */
export function runFullFraudAnalysis(
  transactions: OnChainTransaction[],
  listings?: { tokenId: number; priceETH: number; seller: string; category: string }[],
): FraudAlert[] {
  const allAlerts: FraudAlert[] = [];

  allAlerts.push(...detectWashTrading(transactions));
  allAlerts.push(...detectVelocityAbuse(transactions));
  allAlerts.push(...detectRapidFlips(transactions));
  allAlerts.push(...detectSybilPatterns(transactions));

  if (listings && listings.length >= FRAUD_CONFIG.priceAnomaly.minSampleSize) {
    allAlerts.push(...detectPriceAnomalies(listings));
  }

  // Sort by severity (critical > high > medium > low)
  const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  allAlerts.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

  return allAlerts;
}
