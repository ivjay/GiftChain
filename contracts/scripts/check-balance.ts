import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();

  console.log("Network:", network.name);
  console.log("Current Block:", await ethers.provider.getBlockNumber());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
