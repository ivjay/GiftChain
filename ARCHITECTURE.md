# GiftChain — Technical Architecture & Implementation Guide

## Table of Contents

1. [AI Recommendation Engine](#1-ai-recommendation-engine)
2. [Fraud Detection Engine](#2-fraud-detection-engine)
3. [Admin Access Control (RBAC)](#3-admin-access-control-rbac)
4. [Minting Flow](#4-minting-flow)
5. [Transaction Verification](#5-transaction-verification)

---

## 1. AI Recommendation Engine

### Architecture

**Type:** Hybrid Content-Based + Collaborative Filtering  
**Location:** `frontend/src/lib/recommendationEngine.ts`  
**Hook:** `frontend/src/hooks/useRecommendations.ts`

### How It Works

The recommendation engine produces a **hybrid score** for each gift card:

```
Score = α·CB + β·CF + γ·Pop + δ·Rec
Where: α=0.40, β=0.30, γ=0.15, δ=0.15
```

#### 1.1 Content-Based Filtering (40%)

- Each gift is encoded as a **14-dimensional feature vector**:
  - Dimensions 0-7: Category encoding using a **semantic similarity matrix** (e.g., streaming ↔ music have 0.7 similarity)
  - Dimensions 8-11: One-hot voucher type (subscription, redemption_key, activation_link, credit)
  - Dimension 12: Log-normalized price
  - Dimension 13: Seller rating (0-1)
- User profile is built by **weighted aggregation** of interacted gift vectors:
  - Purchases: 5x weight, Mints: 4x, Wishlist: 3x, Clicks: 2x, Views: 1x
  - **Exponential time decay** (`τ = 20 days`): older interactions are down-weighted
  - Explicit category preferences from Profile page get a **2.0 boost**
- Scoring: **Cosine similarity** between user profile vector and each gift vector

#### 1.2 Collaborative Filtering (30%)

- Builds a **User-Item Interaction Matrix** from all users' histories
- Computes **item-item Jaccard similarity**: for each item the user interacted with, finds items commonly co-purchased by other users
- **Cold start handling**: Falls back to popularity-based ranking when insufficient user history
- Data source: `localStorage` per-wallet interaction logs

#### 1.3 Popularity Score (15%)

- Weighted engagement: sum of all interaction weights across all users
- Max-normalized to [0, 1]

#### 1.4 Recency Boost (15%)

- `score = e^(-0.1 · dayAge)` — newer gifts get higher scores
- Ensures fresh listings are surfaced

#### 1.5 Explainability

Each recommendation includes a human-readable reason generated from the **dominant scoring signal**:

- "Matches your gaming preference (content-based filtering)"
- "Users with similar purchasing patterns also bought this (collaborative filtering)"
- "Trending: high engagement from the community"
- "Recently listed — new streaming gift card"

### Academic References

- Ricci, F., Rokach, L., & Shapira, B. (2015). _Recommender Systems Handbook_
- Koren, Y. (2009). _Matrix Factorization Techniques for Recommender Systems_
- Burke, R. (2002). _Hybrid Recommender Systems_

---

## 2. Fraud Detection Engine

### Architecture

**Type:** Heuristic-based multi-detector system  
**Location:** `frontend/src/lib/fraudDetection.ts`  
**Integration:** Admin Dashboard → "Fraud Detection" tab → "Run Analysis" button

### Detection Modules

#### 2.1 Wash Trading Detector

- Builds a **directed graph** of token transfers (from → to per tokenId)
- Performs **DFS cycle detection** to find circular trading patterns (A→B→C→A)
- Min cycle length: 2 hops, Max: 4 hops
- Lookback window: 7 days
- Severity escalates with cycle depth

#### 2.2 Velocity Abuse Detector

- **Sliding window analysis** over 1-hour and 24-hour periods per wallet
- Thresholds:
  - > 10 transactions/hour → flagged
  - > 50 transactions/day → flagged
  - > 20 mints/day → spam minting alert
- Severity scales with ratio (**3x threshold = critical**)

#### 2.3 Price Anomaly Detector

- Computes **mean and standard deviation** per category
- Flags listings with **Z-score > 2.0** (>2σ from category mean)
- Additional checks:
  - Price < 10% of category average → suspected stolen credentials
  - Price > 10x category average → price manipulation
- Requires minimum **5 listings** per category for statistical validity

#### 2.4 Rapid Flip Detector

- Detects **buy-then-relist patterns** within short timeframes
- Suspicious if relisted within 5 minutes (high severity) or 1 hour (medium)
- Flags relists with **>50% markup** as potential arbitrage

#### 2.5 Sybil Pattern Detector

- **Temporal clustering**: finds multiple wallets performing similar actions within 60 seconds
- Flags clusters of ≥3 wallets acting on same tokens
- Severity: ≥5 wallets in cluster = critical

### Data Pipeline

1. Fetches `GiftMinted` events from GiftNFT contract
2. Fetches `ItemSold` events from GiftMarketplace contract
3. Converts to `OnChainTransaction[]` format with timestamps from block data
4. Runs all 5 detectors on the transaction set
5. Results are sorted by severity and displayed with recommended actions

### Academic References

- Victor, F. & Weintraut, A.M. (2021). _Detecting and Quantifying Wash Trading on Decentralized Cryptocurrency Exchanges_
- Chen, W. et al. (2020). _Detecting Ponzi Schemes on Ethereum_

---

## 3. Admin Access Control (RBAC)

### Architecture

**Type:** On-chain owner verification + off-chain role management  
**Location:** `frontend/src/hooks/useAdminAccess.ts`

### Role Hierarchy

| Role        | Dashboard | Fraud | Admin Mgmt | Fee Withdrawal |
| ----------- | :-------: | :---: | :--------: | :------------: |
| Super Admin |    ✅     |  ✅   |     ✅     |       ✅       |
| Admin       |    ✅     |  ✅   |     ❌     |       ❌       |
| Moderator   |    ✅     |  ✅   |     ❌     |       ❌       |

### How Access Works

1. **Contract Owner** (deployer) is always `super_admin` — verified on-chain via `owner()` call
2. Super admin can **add additional wallets** as `admin` or `moderator` roles
3. Role assignments stored in `localStorage` per deployment
4. Non-admin wallets see an "Access Denied" screen with the contract owner address

### Adding/Removing Admins

- Navigate to **Admin Dashboard → Access Control** tab
- Only super_admin can add/remove roles
- Contract owner cannot be removed (on-chain authority)

---

## 4. Minting Flow

### Steps

1. **Details** — Title, brand, category, price, quantity, voucher type, **image upload**
2. **Credentials** — Enter voucher code (encrypted client-side with AES-256-GCM)
3. **Preview** — Review all details including uploaded image
4. **Mint** — Sign encryption key → Encrypt → Upload image to IPFS → Upload metadata to IPFS → Mint ERC-1155 on Sepolia

### Image Upload

- Accepts PNG, JPG, GIF up to 10MB
- Uploaded to IPFS via **Pinata** (`uploadFileToIPFS`)
- Stored as `ipfs://CID` in metadata
- Falls back to emoji if no image selected

### On-Chain Metadata

```solidity
GiftMetadata {
    ipfsCID      // IPFS CID pointing to JSON metadata
    creator      // Minter's wallet address
    createdAt    // Block timestamp
    category     // Gift category string
    baseTokenType // 0-3 (subscription, key, link, credit)
    initialSupply // Original quantity
}
```

---

## 5. Transaction Verification

All transactions are verifiable on **Sepolia Etherscan**:

- **Minting**: `GiftMinted` event → Etherscan tx link shown on success
- **Buying**: `ItemSold` event → Etherscan tx link on purchase confirmation
- **Listing**: `ItemListed` event → Etherscan tx link
- **Redeeming**: `GiftRedeemed` event → Burn transaction visible on Etherscan

### Contract Addresses (Sepolia) — Freshly Deployed & Verified ✅

| Contract           | Address                                      | Etherscan                                                                                           |
| ------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| GiftNFT (ERC-1155) | `0x29f0aa2ccc36ef2e7c2b3ea464c4f478608e9914` | [Verified ✅](https://sepolia.etherscan.io/address/0x29f0aa2ccc36ef2e7c2b3ea464c4f478608e9914#code) |
| GiftMarketplace    | `0x23c7a397fa899c80ea311fe26939f878a92d258f` | [Verified ✅](https://sepolia.etherscan.io/address/0x23c7a397fa899c80ea311fe26939f878a92d258f#code) |
| RedemptionTracker  | `0xafa75d4929c36fb5ac8187221ac9a11fe4c35ba6` | [Verified ✅](https://sepolia.etherscan.io/address/0xafa75d4929c36fb5ac8187221ac9a11fe4c35ba6#code) |
