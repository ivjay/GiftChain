
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════════════");
  console.log("  🎁 GiftChain — Deploying to", (await ethers.provider.getNetwork()).name);
  console.log("═══════════════════════════════════════════════");
  console.log("  Deployer:", deployer.address);
  console.log("  Balance:", ethers.formatEther(balance), "ETH");
  console.log("");

  if (balance === 0n) {
    console.error("❌ No ETH! Get testnet ETH from https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
    process.exit(1);
  }

  // 1. Deploy GiftNFT
  console.log("1/3  Deploying GiftNFT...");
  const GiftNFT = await ethers.getContractFactory("GiftNFT");
  const giftNFT = await GiftNFT.deploy();
  await giftNFT.waitForDeployment();
  const nftAddress = await giftNFT.getAddress();
  console.log("  ✅ GiftNFT:", nftAddress);

  // 2. Deploy GiftMarketplace
  console.log("2/3  Deploying GiftMarketplace...");
  const Marketplace = await ethers.getContractFactory("GiftMarketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketAddress = await marketplace.getAddress();
  console.log("  ✅ GiftMarketplace:", marketAddress);

  // 3. Deploy RedemptionTracker
  console.log("3/3  Deploying RedemptionTracker...");
  const Tracker = await ethers.getContractFactory("RedemptionTracker");
  const tracker = await Tracker.deploy();
  await tracker.waitForDeployment();
  const trackerAddress = await tracker.getAddress();
  console.log("  ✅ RedemptionTracker:", trackerAddress);

  // Summary
  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log("  🎉 ALL CONTRACTS DEPLOYED!");
  console.log("═══════════════════════════════════════════════");
  console.log("");
  console.log("  Copy these into frontend/.env:");
  console.log("");
  console.log(`  VITE_GIFT_NFT_ADDRESS=${nftAddress}`);
  console.log(`  VITE_MARKETPLACE_ADDRESS=${marketAddress}`);
  console.log(`  VITE_REDEMPTION_TRACKER_ADDRESS=${trackerAddress}`);
  console.log("");
  console.log("  Etherscan verification commands:");
  console.log(`  npx hardhat verify --network sepolia ${nftAddress}`);
  console.log(`  npx hardhat verify --network sepolia ${marketAddress}`);
  console.log(`  npx hardhat verify --network amoy ${trackerAddress}`);

  // Save to JSON for reliability
  const deploymentData = {
    network: (await ethers.provider.getNetwork()).name,
    nft: nftAddress,
    marketplace: marketAddress,
    tracker: trackerAddress,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(__dirname, "../deployment-amoy.json"),
    JSON.stringify(deploymentData, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
