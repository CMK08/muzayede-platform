import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AuctionNFT, FractionalOwnership } from "../typechain-types";

describe("FractionalOwnership", function () {
  async function deployFractionalFixture() {
    const [admin, operator, nftOwner, buyer1, buyer2, buyer3] = await ethers.getSigners();

    // Deploy AuctionNFT first (needed to lock NFTs)
    const AuctionNFTFactory = await ethers.getContractFactory("AuctionNFT");
    const auctionNFT = await AuctionNFTFactory.deploy(admin.address);
    await auctionNFT.waitForDeployment();

    // Deploy FractionalOwnership
    const FractionalFactory = await ethers.getContractFactory("FractionalOwnership");
    const fractional = await FractionalFactory.deploy(admin.address);
    await fractional.waitForDeployment();

    // Grant roles
    const MINTER_ROLE = await auctionNFT.MINTER_ROLE();
    await auctionNFT.connect(admin).grantRole(MINTER_ROLE, admin.address);

    const OPERATOR_ROLE = await fractional.OPERATOR_ROLE();
    await fractional.connect(admin).grantRole(OPERATOR_ROLE, operator.address);

    // Mint an NFT for nftOwner to fractionalize
    await auctionNFT.connect(admin).mint(nftOwner.address, "ipfs://test-nft", "auction-100");

    // nftOwner approves the fractional contract to transfer the NFT
    const fractionalAddr = await fractional.getAddress();
    await auctionNFT.connect(nftOwner).approve(fractionalAddr, 0);

    const MINIMUM_HOLDING = 86400; // 1 day in seconds

    return {
      auctionNFT,
      fractional,
      admin,
      operator,
      nftOwner,
      buyer1,
      buyer2,
      buyer3,
      OPERATOR_ROLE,
      MINIMUM_HOLDING,
    };
  }

  describe("Deployment", function () {
    it("should deploy correctly with admin roles", async function () {
      const { fractional, admin, OPERATOR_ROLE } = await loadFixture(deployFractionalFixture);
      const DEFAULT_ADMIN_ROLE = await fractional.DEFAULT_ADMIN_ROLE();
      expect(await fractional.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await fractional.hasRole(OPERATOR_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Create Listing", function () {
    it("should create a fractional listing by locking an NFT", async function () {
      const { auctionNFT, fractional, nftOwner, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");

      await fractional.connect(nftOwner).createListing(
        nftAddr,
        0,         // tokenId
        100,       // totalShares
        pricePerShare,
        MINIMUM_HOLDING
      );

      const listing = await fractional.getListing(0);
      expect(listing.nftContract).to.equal(nftAddr);
      expect(listing.nftTokenId).to.equal(0);
      expect(listing.totalShares).to.equal(100);
      expect(listing.availableShares).to.equal(100);
      expect(listing.pricePerShare).to.equal(pricePerShare);
      expect(listing.originalOwner).to.equal(nftOwner.address);
      expect(listing.isActive).to.be.true;
      expect(listing.minimumHoldingPeriod).to.equal(MINIMUM_HOLDING);
    });

    it("should emit FractionCreated event", async function () {
      const { auctionNFT, fractional, nftOwner, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");

      await expect(
        fractional.connect(nftOwner).createListing(nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING)
      )
        .to.emit(fractional, "FractionCreated")
        .withArgs(0, nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING);
    });

    it("should transfer the NFT to the fractional contract", async function () {
      const { auctionNFT, fractional, nftOwner, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      const nftAddr = await auctionNFT.getAddress();
      const fractionalAddr = await fractional.getAddress();

      await fractional.connect(nftOwner).createListing(
        nftAddr, 0, 100, ethers.parseEther("0.1"), MINIMUM_HOLDING
      );

      expect(await auctionNFT.ownerOf(0)).to.equal(fractionalAddr);
    });

    it("should revert with zero shares", async function () {
      const { auctionNFT, fractional, nftOwner, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      await expect(
        fractional.connect(nftOwner).createListing(
          await auctionNFT.getAddress(), 0, 0, ethers.parseEther("0.1"), MINIMUM_HOLDING
        )
      ).to.be.revertedWith("FractionalOwnership: shares must be > 0");
    });

    it("should revert with zero price", async function () {
      const { auctionNFT, fractional, nftOwner, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      await expect(
        fractional.connect(nftOwner).createListing(
          await auctionNFT.getAddress(), 0, 100, 0, MINIMUM_HOLDING
        )
      ).to.be.revertedWith("FractionalOwnership: price must be > 0");
    });
  });

  describe("Purchase Shares", function () {
    async function createListingFixture() {
      const fixture = await deployFractionalFixture();
      const { auctionNFT, fractional, nftOwner, MINIMUM_HOLDING } = fixture;

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");

      await fractional.connect(nftOwner).createListing(
        nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING
      );

      return { ...fixture, pricePerShare };
    }

    it("should allow buying shares", async function () {
      const { fractional, buyer1, pricePerShare } = await loadFixture(createListingFixture);

      const shares = 10;
      const totalCost = pricePerShare * BigInt(shares);

      await fractional.connect(buyer1).purchaseShares(0, shares, { value: totalCost });

      expect(await fractional.balanceOf(buyer1.address, 0)).to.equal(shares);

      const listing = await fractional.getListing(0);
      expect(listing.availableShares).to.equal(90);
    });

    it("should emit SharesPurchased event", async function () {
      const { fractional, buyer1, pricePerShare } = await loadFixture(createListingFixture);

      const shares = 5;
      const totalCost = pricePerShare * BigInt(shares);

      await expect(
        fractional.connect(buyer1).purchaseShares(0, shares, { value: totalCost })
      )
        .to.emit(fractional, "SharesPurchased")
        .withArgs(0, buyer1.address, shares, totalCost);
    });

    it("should transfer payment to original owner", async function () {
      const { fractional, nftOwner, buyer1, pricePerShare } = await loadFixture(createListingFixture);

      const shares = 10;
      const totalCost = pricePerShare * BigInt(shares);

      const balanceBefore = await ethers.provider.getBalance(nftOwner.address);
      await fractional.connect(buyer1).purchaseShares(0, shares, { value: totalCost });
      const balanceAfter = await ethers.provider.getBalance(nftOwner.address);

      expect(balanceAfter - balanceBefore).to.equal(totalCost);
    });

    it("should refund excess payment", async function () {
      const { fractional, buyer1, pricePerShare } = await loadFixture(createListingFixture);

      const shares = 5;
      const totalCost = pricePerShare * BigInt(shares);
      const overpayment = ethers.parseEther("10");

      const balanceBefore = await ethers.provider.getBalance(buyer1.address);
      const tx = await fractional.connect(buyer1).purchaseShares(0, shares, { value: overpayment });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(buyer1.address);

      // buyer should only have spent totalCost + gas
      expect(balanceBefore - balanceAfter - gasCost).to.equal(totalCost);
    });

    it("should revert if insufficient payment", async function () {
      const { fractional, buyer1 } = await loadFixture(createListingFixture);

      await expect(
        fractional.connect(buyer1).purchaseShares(0, 10, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("FractionalOwnership: insufficient payment");
    });

    it("should revert if buying more shares than available", async function () {
      const { fractional, buyer1, pricePerShare } = await loadFixture(createListingFixture);

      await expect(
        fractional.connect(buyer1).purchaseShares(0, 101, {
          value: pricePerShare * 101n,
        })
      ).to.be.revertedWith("FractionalOwnership: insufficient shares");
    });
  });

  describe("Secondary Market (Sell Shares)", function () {
    async function buySharesFixture() {
      const fixture = await deployFractionalFixture();
      const { auctionNFT, fractional, nftOwner, buyer1, MINIMUM_HOLDING } = fixture;

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");

      await fractional.connect(nftOwner).createListing(nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING);

      // buyer1 purchases 50 shares
      await fractional.connect(buyer1).purchaseShares(0, 50, {
        value: pricePerShare * 50n,
      });

      return { ...fixture, pricePerShare };
    }

    it("should allow listing shares for sale after holding period", async function () {
      const { fractional, buyer1, MINIMUM_HOLDING } = await loadFixture(buySharesFixture);

      // Advance time past the holding period
      await time.increase(MINIMUM_HOLDING + 1);

      const askPrice = ethers.parseEther("0.15");
      await fractional.connect(buyer1).listSharesForSale(0, 20, askPrice);

      const sale = await fractional.sharesForSale(0, buyer1.address);
      expect(sale.quantity).to.equal(20);
      expect(sale.pricePerShare).to.equal(askPrice);
      expect(sale.isActive).to.be.true;
    });

    it("should revert listing shares before holding period", async function () {
      const { fractional, buyer1 } = await loadFixture(buySharesFixture);

      await expect(
        fractional.connect(buyer1).listSharesForSale(0, 20, ethers.parseEther("0.15"))
      ).to.be.revertedWith("FractionalOwnership: minimum holding period not met");
    });

    it("should allow buying shares from a secondary seller", async function () {
      const { fractional, buyer1, buyer2, MINIMUM_HOLDING } = await loadFixture(buySharesFixture);

      await time.increase(MINIMUM_HOLDING + 1);

      const askPrice = ethers.parseEther("0.15");
      await fractional.connect(buyer1).listSharesForSale(0, 20, askPrice);

      const totalCost = askPrice * 10n;
      await fractional.connect(buyer2).buySharesFromHolder(0, buyer1.address, 10, {
        value: totalCost,
      });

      expect(await fractional.balanceOf(buyer2.address, 0)).to.equal(10);
      expect(await fractional.balanceOf(buyer1.address, 0)).to.equal(40);
    });

    it("should emit SharesSold event on secondary sale", async function () {
      const { fractional, buyer1, buyer2, MINIMUM_HOLDING } = await loadFixture(buySharesFixture);

      await time.increase(MINIMUM_HOLDING + 1);

      const askPrice = ethers.parseEther("0.2");
      await fractional.connect(buyer1).listSharesForSale(0, 10, askPrice);

      const totalCost = askPrice * 5n;
      await expect(
        fractional.connect(buyer2).buySharesFromHolder(0, buyer1.address, 5, { value: totalCost })
      )
        .to.emit(fractional, "SharesSold")
        .withArgs(0, buyer1.address, buyer2.address, 5, totalCost);
    });

    it("should allow delisting shares", async function () {
      const { fractional, buyer1, MINIMUM_HOLDING } = await loadFixture(buySharesFixture);

      await time.increase(MINIMUM_HOLDING + 1);

      await fractional.connect(buyer1).listSharesForSale(0, 20, ethers.parseEther("0.15"));
      await fractional.connect(buyer1).delistShares(0);

      const sale = await fractional.sharesForSale(0, buyer1.address);
      expect(sale.isActive).to.be.false;
    });
  });

  describe("Dividend Distribution", function () {
    async function dividendFixture() {
      const fixture = await deployFractionalFixture();
      const { auctionNFT, fractional, nftOwner, operator, buyer1, buyer2, MINIMUM_HOLDING } = fixture;

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.01");

      await fractional.connect(nftOwner).createListing(nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING);

      // buyer1 buys 60 shares, buyer2 buys 40 shares
      await fractional.connect(buyer1).purchaseShares(0, 60, {
        value: pricePerShare * 60n,
      });
      await fractional.connect(buyer2).purchaseShares(0, 40, {
        value: pricePerShare * 40n,
      });

      return { ...fixture, pricePerShare };
    }

    it("should distribute dividends proportionally", async function () {
      const { fractional, operator, buyer1, buyer2 } = await loadFixture(dividendFixture);

      const dividendAmount = ethers.parseEther("10");
      await fractional.connect(operator).distributeDividend(0, { value: dividendAmount });

      const pending1 = await fractional.pendingDividend(0, buyer1.address);
      const pending2 = await fractional.pendingDividend(0, buyer2.address);

      // buyer1 owns 60%, buyer2 owns 40%
      expect(pending1).to.equal(ethers.parseEther("6"));
      expect(pending2).to.equal(ethers.parseEther("4"));
    });

    it("should emit DividendDistributed event", async function () {
      const { fractional, operator } = await loadFixture(dividendFixture);

      const dividendAmount = ethers.parseEther("5");
      await expect(
        fractional.connect(operator).distributeDividend(0, { value: dividendAmount })
      ).to.emit(fractional, "DividendDistributed");
    });

    it("should allow holders to claim dividends", async function () {
      const { fractional, operator, buyer1 } = await loadFixture(dividendFixture);

      await fractional.connect(operator).distributeDividend(0, {
        value: ethers.parseEther("10"),
      });

      const balanceBefore = await ethers.provider.getBalance(buyer1.address);
      const tx = await fractional.connect(buyer1).claimDividend(0);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(buyer1.address);

      const received = balanceAfter - balanceBefore + gasCost;
      expect(received).to.equal(ethers.parseEther("6"));
    });

    it("should emit DividendClaimed event", async function () {
      const { fractional, operator, buyer1 } = await loadFixture(dividendFixture);

      await fractional.connect(operator).distributeDividend(0, {
        value: ethers.parseEther("10"),
      });

      await expect(fractional.connect(buyer1).claimDividend(0))
        .to.emit(fractional, "DividendClaimed")
        .withArgs(0, buyer1.address, ethers.parseEther("6"));
    });

    it("should revert dividend claim with zero balance", async function () {
      const { fractional, operator, buyer3 } = await loadFixture(dividendFixture);

      await fractional.connect(operator).distributeDividend(0, {
        value: ethers.parseEther("10"),
      });

      await expect(
        fractional.connect(buyer3).claimDividend(0)
      ).to.be.revertedWith("FractionalOwnership: no shares held");
    });

    it("should revert dividend distribution by non-operator", async function () {
      const { fractional, buyer1 } = await loadFixture(dividendFixture);

      await expect(
        fractional.connect(buyer1).distributeDividend(0, { value: ethers.parseEther("1") })
      ).to.be.reverted;
    });
  });

  describe("Close Listing", function () {
    it("should allow consolidating owner to close and reclaim NFT", async function () {
      const { auctionNFT, fractional, nftOwner, buyer1, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");

      await fractional.connect(nftOwner).createListing(nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING);

      // buyer1 buys all 100 shares
      await fractional.connect(buyer1).purchaseShares(0, 100, {
        value: pricePerShare * 100n,
      });

      await fractional.connect(buyer1).closeListing(0);

      expect(await auctionNFT.ownerOf(0)).to.equal(buyer1.address);
      const listing = await fractional.getListing(0);
      expect(listing.isActive).to.be.false;
    });

    it("should revert if caller does not own all shares", async function () {
      const { auctionNFT, fractional, nftOwner, buyer1, buyer2, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");

      await fractional.connect(nftOwner).createListing(nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING);

      await fractional.connect(buyer1).purchaseShares(0, 60, {
        value: pricePerShare * 60n,
      });
      await fractional.connect(buyer2).purchaseShares(0, 40, {
        value: pricePerShare * 40n,
      });

      await expect(
        fractional.connect(buyer1).closeListing(0)
      ).to.be.revertedWith("FractionalOwnership: must own all sold shares to close");
    });
  });

  describe("View Functions", function () {
    it("should report sold shares correctly", async function () {
      const { auctionNFT, fractional, nftOwner, buyer1, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");
      await fractional.connect(nftOwner).createListing(nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING);

      await fractional.connect(buyer1).purchaseShares(0, 30, {
        value: pricePerShare * 30n,
      });

      expect(await fractional.soldShares(0)).to.equal(30);
    });

    it("should check canSell status", async function () {
      const { auctionNFT, fractional, nftOwner, buyer1, MINIMUM_HOLDING } =
        await loadFixture(deployFractionalFixture);

      const nftAddr = await auctionNFT.getAddress();
      const pricePerShare = ethers.parseEther("0.1");
      await fractional.connect(nftOwner).createListing(nftAddr, 0, 100, pricePerShare, MINIMUM_HOLDING);

      await fractional.connect(buyer1).purchaseShares(0, 10, {
        value: pricePerShare * 10n,
      });

      expect(await fractional.canSell(0, buyer1.address)).to.be.false;

      await time.increase(MINIMUM_HOLDING + 1);

      expect(await fractional.canSell(0, buyer1.address)).to.be.true;
    });
  });
});
