import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AuctionNFT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AuctionNFT", function () {
  async function deployAuctionNFTFixture() {
    const [admin, minter, user1, user2, user3] = await ethers.getSigners();

    const AuctionNFTFactory = await ethers.getContractFactory("AuctionNFT");
    const auctionNFT = await AuctionNFTFactory.deploy(admin.address);
    await auctionNFT.waitForDeployment();

    // Grant minter role
    const MINTER_ROLE = await auctionNFT.MINTER_ROLE();
    await auctionNFT.connect(admin).grantRole(MINTER_ROLE, minter.address);

    // Grant auction manager role
    const AUCTION_MANAGER_ROLE = await auctionNFT.AUCTION_MANAGER_ROLE();
    await auctionNFT.connect(admin).grantRole(AUCTION_MANAGER_ROLE, minter.address);

    return { auctionNFT, admin, minter, user1, user2, user3, MINTER_ROLE, AUCTION_MANAGER_ROLE };
  }

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      const { auctionNFT } = await loadFixture(deployAuctionNFTFixture);
      expect(await auctionNFT.name()).to.equal("Muzayede Auction NFT");
      expect(await auctionNFT.symbol()).to.equal("MAUC");
    });

    it("should grant DEFAULT_ADMIN_ROLE and MINTER_ROLE to deployer", async function () {
      const { auctionNFT, admin } = await loadFixture(deployAuctionNFTFixture);
      const DEFAULT_ADMIN_ROLE = await auctionNFT.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await auctionNFT.MINTER_ROLE();
      expect(await auctionNFT.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await auctionNFT.hasRole(MINTER_ROLE, admin.address)).to.be.true;
    });

    it("should grant AUCTION_MANAGER_ROLE to deployer", async function () {
      const { auctionNFT, admin } = await loadFixture(deployAuctionNFTFixture);
      const AUCTION_MANAGER_ROLE = await auctionNFT.AUCTION_MANAGER_ROLE();
      expect(await auctionNFT.hasRole(AUCTION_MANAGER_ROLE, admin.address)).to.be.true;
    });

    it("should start with zero total supply", async function () {
      const { auctionNFT } = await loadFixture(deployAuctionNFTFixture);
      expect(await auctionNFT.totalSupply()).to.equal(0);
      expect(await auctionNFT.totalMinted()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("should mint an NFT with correct metadata", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      const uri = "ipfs://QmTestHash123";
      const auctionId = "auction-001";

      const tx = await auctionNFT.connect(minter).mint(user1.address, uri, auctionId);
      const receipt = await tx.wait();

      expect(await auctionNFT.ownerOf(0)).to.equal(user1.address);
      expect(await auctionNFT.tokenURI(0)).to.equal(uri);
      expect(await auctionNFT.getAuctionId(0)).to.equal(auctionId);
      expect(await auctionNFT.totalSupply()).to.equal(1);
    });

    it("should emit CertificateMinted event", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      const uri = "ipfs://QmTestHash123";
      const auctionId = "auction-001";

      await expect(auctionNFT.connect(minter).mint(user1.address, uri, auctionId))
        .to.emit(auctionNFT, "CertificateMinted")
        .withArgs(0, user1.address, auctionId, uri);
    });

    it("should create an initial provenance record on mint", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      const history = await auctionNFT.getProvenanceHistory(0);
      expect(history.length).to.equal(1);
      expect(history[0].previousOwner).to.equal(ethers.ZeroAddress);
      expect(history[0].newOwner).to.equal(user1.address);
      expect(history[0].salePrice).to.equal(0);
      expect(history[0].notes).to.equal("Certificate minted");
    });

    it("should increment token IDs sequentially", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test1", "auction-001");
      await auctionNFT.connect(minter).mint(user2.address, "ipfs://test2", "auction-002");

      expect(await auctionNFT.ownerOf(0)).to.equal(user1.address);
      expect(await auctionNFT.ownerOf(1)).to.equal(user2.address);
      expect(await auctionNFT.totalMinted()).to.equal(2);
    });

    it("should revert if caller does not have MINTER_ROLE", async function () {
      const { auctionNFT, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await expect(
        auctionNFT.connect(user1).mint(user2.address, "ipfs://test", "auction-001")
      ).to.be.reverted;
    });

    it("should revert if minting to zero address", async function () {
      const { auctionNFT, minter } = await loadFixture(deployAuctionNFTFixture);

      await expect(
        auctionNFT.connect(minter).mint(ethers.ZeroAddress, "ipfs://test", "auction-001")
      ).to.be.revertedWith("AuctionNFT: mint to zero address");
    });

    it("should revert if URI is empty", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await expect(
        auctionNFT.connect(minter).mint(user1.address, "", "auction-001")
      ).to.be.revertedWith("AuctionNFT: empty URI");
    });
  });

  describe("Mint with Product ID", function () {
    it("should mint with both auction ID and product ID", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mintWithProduct(
        user1.address,
        "ipfs://test",
        "auction-001",
        "product-001"
      );

      expect(await auctionNFT.ownerOf(0)).to.equal(user1.address);
      expect(await auctionNFT.getAuctionId(0)).to.equal("auction-001");
      expect(await auctionNFT.getProductId(0)).to.equal("product-001");
    });
  });

  describe("Auction Lock", function () {
    it("should lock a token for an auction", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).lockForAuction(0, "auction-001");

      expect(await auctionNFT.isLocked(0)).to.be.true;
      expect(await auctionNFT.getLockedByAuction(0)).to.equal("auction-001");
    });

    it("should emit TokenLocked event", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await expect(auctionNFT.connect(minter).lockForAuction(0, "auction-001"))
        .to.emit(auctionNFT, "TokenLocked")
        .withArgs(0, "auction-001");
    });

    it("should prevent transfer of locked tokens", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).lockForAuction(0, "auction-001");

      await expect(
        auctionNFT.connect(user1).transferFrom(user1.address, user2.address, 0)
      ).to.be.revertedWith("AuctionNFT: token is locked for auction");
    });

    it("should prevent transferWithProvenance of locked tokens", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).lockForAuction(0, "auction-001");

      await expect(
        auctionNFT.connect(user1).transferWithProvenance(
          user1.address, user2.address, 0, 0, "Should fail"
        )
      ).to.be.revertedWith("AuctionNFT: token is locked for auction");
    });

    it("should unlock a token after auction ends", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).lockForAuction(0, "auction-001");
      await auctionNFT.connect(minter).unlockFromAuction(0);

      expect(await auctionNFT.isLocked(0)).to.be.false;
      expect(await auctionNFT.getLockedByAuction(0)).to.equal("");
    });

    it("should emit TokenUnlocked event", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).lockForAuction(0, "auction-001");

      await expect(auctionNFT.connect(minter).unlockFromAuction(0))
        .to.emit(auctionNFT, "TokenUnlocked")
        .withArgs(0, "auction-001");
    });

    it("should allow transfer after unlocking", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).lockForAuction(0, "auction-001");
      await auctionNFT.connect(minter).unlockFromAuction(0);

      await auctionNFT.connect(user1).transferFrom(user1.address, user2.address, 0);
      expect(await auctionNFT.ownerOf(0)).to.equal(user2.address);
    });

    it("should revert lock if token does not exist", async function () {
      const { auctionNFT, minter } = await loadFixture(deployAuctionNFTFixture);

      await expect(
        auctionNFT.connect(minter).lockForAuction(999, "auction-001")
      ).to.be.revertedWith("AuctionNFT: token does not exist");
    });

    it("should revert lock if token is already locked", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).lockForAuction(0, "auction-001");

      await expect(
        auctionNFT.connect(minter).lockForAuction(0, "auction-002")
      ).to.be.revertedWith("AuctionNFT: token already locked");
    });

    it("should revert lock with empty auction ID", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await expect(
        auctionNFT.connect(minter).lockForAuction(0, "")
      ).to.be.revertedWith("AuctionNFT: empty auction ID");
    });

    it("should revert unlock if token is not locked", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await expect(
        auctionNFT.connect(minter).unlockFromAuction(0)
      ).to.be.revertedWith("AuctionNFT: token not locked");
    });

    it("should revert lock if caller does not have AUCTION_MANAGER_ROLE", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await expect(
        auctionNFT.connect(user1).lockForAuction(0, "auction-001")
      ).to.be.reverted;
    });
  });

  describe("Provenance", function () {
    it("should record provenance events", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await auctionNFT.connect(minter).recordProvenance(
        0,
        user1.address,
        user2.address,
        ethers.parseEther("1.5"),
        "Sold at auction"
      );

      const history = await auctionNFT.getProvenanceHistory(0);
      expect(history.length).to.equal(2); // mint + record
      expect(history[1].previousOwner).to.equal(user1.address);
      expect(history[1].newOwner).to.equal(user2.address);
      expect(history[1].salePrice).to.equal(ethers.parseEther("1.5"));
      expect(history[1].notes).to.equal("Sold at auction");
    });

    it("should emit ProvenanceRecorded event", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await expect(
        auctionNFT.connect(minter).recordProvenance(
          0,
          user1.address,
          user2.address,
          ethers.parseEther("2.0"),
          "Resale"
        )
      ).to.emit(auctionNFT, "ProvenanceRecorded");
    });

    it("should build a provenance hash chain", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      await auctionNFT.connect(minter).recordProvenance(
        0, user1.address, user2.address, ethers.parseEther("1"), "Sale 1"
      );

      const chain = await auctionNFT.getProvenanceChain(0);
      expect(chain.length).to.equal(2);
      // Hashes should be non-zero bytes32 values
      expect(chain[0]).to.not.equal(ethers.ZeroHash);
      expect(chain[1]).to.not.equal(ethers.ZeroHash);
    });

    it("should return provenance count", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");
      expect(await auctionNFT.getProvenanceCount(0)).to.equal(1);

      await auctionNFT.connect(minter).recordProvenance(
        0, user1.address, user2.address, 0, "Appraisal"
      );
      expect(await auctionNFT.getProvenanceCount(0)).to.equal(2);
    });

    it("should revert provenance recording for non-existent token", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await expect(
        auctionNFT.connect(minter).recordProvenance(
          999, user1.address, user2.address, 0, "Should fail"
        )
      ).to.be.revertedWith("AuctionNFT: token does not exist");
    });
  });

  describe("Transfer with Provenance", function () {
    it("should transfer and record provenance in one transaction", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await auctionNFT.connect(user1).transferWithProvenance(
        user1.address,
        user2.address,
        0,
        ethers.parseEther("5"),
        "Private sale"
      );

      expect(await auctionNFT.ownerOf(0)).to.equal(user2.address);

      const history = await auctionNFT.getProvenanceHistory(0);
      expect(history.length).to.equal(2); // mint + transfer
      expect(history[1].previousOwner).to.equal(user1.address);
      expect(history[1].newOwner).to.equal(user2.address);
      expect(history[1].salePrice).to.equal(ethers.parseEther("5"));
    });

    it("should emit both ProvenanceRecorded and OwnershipTransferred events", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      const tx = auctionNFT.connect(user1).transferWithProvenance(
        user1.address,
        user2.address,
        0,
        ethers.parseEther("3"),
        "Sale"
      );

      await expect(tx).to.emit(auctionNFT, "ProvenanceRecorded");
      await expect(tx).to.emit(auctionNFT, "OwnershipTransferred");
    });

    it("should revert if caller is not authorized for transfer", async function () {
      const { auctionNFT, minter, user1, user2, user3 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test", "auction-001");

      await expect(
        auctionNFT.connect(user3).transferWithProvenance(
          user1.address,
          user2.address,
          0,
          0,
          "Unauthorized"
        )
      ).to.be.revertedWith("AuctionNFT: caller not authorized");
    });
  });

  describe("Access Control", function () {
    it("should allow admin to grant MINTER_ROLE", async function () {
      const { auctionNFT, admin, user1, MINTER_ROLE } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await auctionNFT.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("should allow admin to revoke MINTER_ROLE", async function () {
      const { auctionNFT, admin, minter, MINTER_ROLE } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      expect(await auctionNFT.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("should prevent non-admin from granting roles", async function () {
      const { auctionNFT, user1, user2, MINTER_ROLE } = await loadFixture(deployAuctionNFTFixture);

      await expect(
        auctionNFT.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.reverted;
    });
  });

  describe("ERC721 Enumerable", function () {
    it("should enumerate tokens by owner", async function () {
      const { auctionNFT, minter, user1 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test1", "a-001");
      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test2", "a-002");

      expect(await auctionNFT.balanceOf(user1.address)).to.equal(2);
      expect(await auctionNFT.tokenOfOwnerByIndex(user1.address, 0)).to.equal(0);
      expect(await auctionNFT.tokenOfOwnerByIndex(user1.address, 1)).to.equal(1);
    });

    it("should enumerate all tokens by index", async function () {
      const { auctionNFT, minter, user1, user2 } = await loadFixture(deployAuctionNFTFixture);

      await auctionNFT.connect(minter).mint(user1.address, "ipfs://test1", "a-001");
      await auctionNFT.connect(minter).mint(user2.address, "ipfs://test2", "a-002");

      expect(await auctionNFT.tokenByIndex(0)).to.equal(0);
      expect(await auctionNFT.tokenByIndex(1)).to.equal(1);
    });
  });
});
