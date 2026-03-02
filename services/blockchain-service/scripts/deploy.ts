import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("Muzayede Platform - Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
  console.log("-".repeat(60));

  // ─── Deploy AuctionNFT ───────────────────────────────────────
  console.log("\n[1/3] Deploying AuctionNFT...");
  const AuctionNFTFactory = await ethers.getContractFactory("AuctionNFT");
  const auctionNFT = await AuctionNFTFactory.deploy(deployer.address);
  await auctionNFT.waitForDeployment();
  const auctionNFTAddress = await auctionNFT.getAddress();
  console.log(`  AuctionNFT deployed to: ${auctionNFTAddress}`);

  // ─── Deploy FractionalOwnership ──────────────────────────────
  console.log("\n[2/3] Deploying FractionalOwnership...");
  const FractionalFactory = await ethers.getContractFactory("FractionalOwnership");
  const fractional = await FractionalFactory.deploy(deployer.address);
  await fractional.waitForDeployment();
  const fractionalAddress = await fractional.getAddress();
  console.log(`  FractionalOwnership deployed to: ${fractionalAddress}`);

  // ─── Deploy CollectorBadge ───────────────────────────────────
  console.log("\n[3/3] Deploying CollectorBadge...");
  const BadgeFactory = await ethers.getContractFactory("CollectorBadge");
  const badge = await BadgeFactory.deploy(deployer.address);
  await badge.waitForDeployment();
  const badgeAddress = await badge.getAddress();
  console.log(`  CollectorBadge deployed to: ${badgeAddress}`);

  // ─── Verify Roles ────────────────────────────────────────────
  console.log("\n" + "-".repeat(60));
  console.log("Verifying role assignments...");

  const MINTER_ROLE = await auctionNFT.MINTER_ROLE();
  const AUCTION_MANAGER_ROLE = await auctionNFT.AUCTION_MANAGER_ROLE();
  const OPERATOR_ROLE = await fractional.OPERATOR_ROLE();
  const ISSUER_ROLE = await badge.ISSUER_ROLE();

  const hasMinter = await auctionNFT.hasRole(MINTER_ROLE, deployer.address);
  const hasAuctionManager = await auctionNFT.hasRole(AUCTION_MANAGER_ROLE, deployer.address);
  const hasOperator = await fractional.hasRole(OPERATOR_ROLE, deployer.address);
  const hasIssuer = await badge.hasRole(ISSUER_ROLE, deployer.address);

  console.log(`  AuctionNFT MINTER_ROLE:          ${hasMinter ? "OK" : "MISSING"}`);
  console.log(`  AuctionNFT AUCTION_MANAGER_ROLE:  ${hasAuctionManager ? "OK" : "MISSING"}`);
  console.log(`  FractionalOwnership OPERATOR_ROLE: ${hasOperator ? "OK" : "MISSING"}`);
  console.log(`  CollectorBadge ISSUER_ROLE:        ${hasIssuer ? "OK" : "MISSING"}`);

  // ─── Summary ─────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("Deployment Summary");
  console.log("=".repeat(60));
  console.log(`  AuctionNFT:         ${auctionNFTAddress}`);
  console.log(`  FractionalOwnership: ${fractionalAddress}`);
  console.log(`  CollectorBadge:      ${badgeAddress}`);
  console.log("=".repeat(60));

  console.log("\nAdd these to your .env file:");
  console.log(`  AUCTION_NFT_CONTRACT=${auctionNFTAddress}`);
  console.log(`  FRACTIONAL_CONTRACT=${fractionalAddress}`);
  console.log(`  BADGE_CONTRACT=${badgeAddress}`);

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;
  console.log(`\nTotal gas cost: ${ethers.formatEther(gasUsed)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
