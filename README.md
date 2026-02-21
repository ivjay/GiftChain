# 🎁 GiftChain — AI-Powered NFT Gift Marketplace

A full-stack decentralized marketplace for buying, minting, transferring, and redeeming digital gift cards as ERC-1155 NFTs.

## Quick Start

### Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend (Express + TypeScript)
```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### AI Engine (FastAPI + scikit-learn)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + TypeScript + Tailwind CSS | UI & wallet integration |
| Web3 | wagmi + viem | MetaMask/WalletConnect |
| Smart Contracts | Solidity (ERC-1155) | Minting, marketplace, redemption |
| Backend | Express + TypeScript | API routes, receipts, user data |
| Database | Supabase (PostgreSQL) | Off-chain data storage |
| AI Engine | FastAPI + scikit-learn | Recommendations, fraud detection |
| Storage | IPFS (Pinata) | Encrypted credential storage |

## Smart Contracts

- **GiftNFT.sol** — ERC-1155 multi-token for gift cards with IPFS CID storage
- **Marketplace.sol** — Listing, buying, commissions (2.5%), secondary royalties
- **RedemptionTracker.sol** — Irreversible on-chain redemption tracking

## Environment Variables

Create `.env` files as needed (all optional for demo mode):

```
VITE_WALLETCONNECT_PROJECT_ID=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PINATA_API_KEY=
PINATA_SECRET=
```
