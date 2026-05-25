/**
 * Deployment script for PrivateStreamMezo contract on Mezo Testnet.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network mezoTestnet
 *
 * Required env vars in .env.local:
 *   DEPLOYER_PRIVATE_KEY
 *   PLATFORM_TREASURY_ADDRESS
 *   REVENUE_CAP_USD        (default: 20)
 *   BTC_USD_FALLBACK       (default: 100000)
 *   PLATFORM_FEE_PERCENTAGE (default: 10)
 */

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BTC");

  // ── Parameters ──────────────────────────────────────────────────────────
  const treasury = process.env.PLATFORM_TREASURY_ADDRESS || deployer.address;
  const feeBps   = BigInt((Number(process.env.PLATFORM_FEE_PERCENTAGE) || 10) * 100); // 10% = 1000 bps
  const capUsd   = Number(process.env.REVENUE_CAP_USD) || 20;
  const btcUsd   = Number(process.env.BTC_USD_FALLBACK) || 100000;

  // Convert USD cap to wei: capUsd / btcUsd * 1e18
  const revenueCapWei = ethers.parseEther((capUsd / btcUsd).toFixed(18));

  console.log("\nDeployment parameters:");
  console.log("  Treasury:       ", treasury);
  console.log("  Platform fee:   ", feeBps.toString(), "bps");
  console.log("  Revenue cap:    ", ethers.formatEther(revenueCapWei), "BTC (~$" + capUsd + ")");

  // ── Deploy ───────────────────────────────────────────────────────────────
  const Factory = await ethers.getContractFactory("PrivateStreamMezo");
  const contract = await Factory.deploy(treasury, feeBps, revenueCapWei);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ PrivateStreamMezo deployed to:", address);
  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
