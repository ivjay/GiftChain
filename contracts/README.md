# Smart Contracts

This directory contains the Solidity smart contracts for GiftChain and their deployment scripts using Hardhat.

## Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Compile contracts:

   ```bash
   npx hardhat compile
   ```

3. Run tests (add tests in `test/` folder):
   ```bash
   npx hardhat test
   ```

## Deployment

1. Create a `.env` file (copy `.env.example`) and add your:

   - `PRIVATE_KEY` (Export from MetaMask)
   - `SEPOLIA_RPC_URL` (Optional, defaults to Ankr)
   - `ETHERSCAN_API_KEY` (Optional, for verification)

2. Deploy to Sepolia Testnet:

   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```

3. Copy the deployed addresses from the terminal output and paste them into `../frontend/.env`.

   ```
   VITE_GIFT_NFT_ADDRESS=<Your_NFT_Address>
   VITE_MARKETPLACE_ADDRESS=<Your_Marketplace_Address>
   ```

4. Verify contracts on Etherscan (optional):
   ```bash
   npx hardhat verify --network sepolia <ADDRESS>
   ```
