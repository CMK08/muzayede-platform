import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CollectorBadge } from "../typechain-types";

describe("CollectorBadge", function () {
  async function deployBadgeFixture() {
    const [admin, issuer, user1, user2, user3] = await ethers.getSigners();

    const BadgeFactory = await ethers.getContractFactory("CollectorBadge");
    const badge = await BadgeFactory.deploy(admin.address);
    await badge.waitForDeployment();

    // Grant issuer role
    const ISSUER_ROLE = await badge.ISSUER_ROLE();
    await badge.connect(admin).grantRole(ISSUER_ROLE, issuer.address);

    // Badge tier enum values
    const BRONZE = 0;
    const SILVER = 1;
    const GOLD = 2;
    const DIAMOND = 3;

    return { badge, admin, issuer, user1, user2, user3, ISSUER_ROLE, BRONZE, SILVER, GOLD, DIAMOND };
  }

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      const { badge } = await loadFixture(deployBadgeFixture);
      expect(await badge.name()).to.equal("Muzayede Collector Badge");
      expect(await badge.symbol()).to.equal("MBADGE");
    });

    it("should set default tier thresholds", async function () {
      const { badge, BRONZE, SILVER, GOLD, DIAMOND } = await loadFixture(deployBadgeFixture);
      expect(await badge.tierThresholds(BRONZE)).to.equal(5);
      expect(await badge.tierThresholds(SILVER)).to.equal(25);
      expect(await badge.tierThresholds(GOLD)).to.equal(100);
      expect(await badge.tierThresholds(DIAMOND)).to.equal(500);
    });

    it("should grant roles to the admin", async function () {
      const { badge, admin, ISSUER_ROLE } = await loadFixture(deployBadgeFixture);
      const DEFAULT_ADMIN_ROLE = await badge.DEFAULT_ADMIN_ROLE();
      expect(await badge.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await badge.hasRole(ISSUER_ROLE, admin.address)).to.be.true;
    });

    it("should start with zero total minted", async function () {
      const { badge } = await loadFixture(deployBadgeFixture);
      expect(await badge.totalMinted()).to.equal(0);
    });
  });

  describe("Award Badge", function () {
    it("should award a BRONZE badge with 5+ wins", async function () {
      const { badge, issuer, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);

      expect(await badge.ownerOf(0)).to.equal(user1.address);
      expect(await badge.hasBadge(user1.address, BRONZE)).to.be.true;

      const info = await badge.getBadgeInfo(0);
      expect(info.tier).to.equal(BRONZE);
      expect(info.auctionWins).to.equal(5);
    });

    it("should award a SILVER badge with 25+ wins", async function () {
      const { badge, issuer, user1, SILVER } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, SILVER, 30);

      expect(await badge.hasBadge(user1.address, SILVER)).to.be.true;
      const info = await badge.getBadgeInfo(0);
      expect(info.tier).to.equal(SILVER);
      expect(info.auctionWins).to.equal(30);
    });

    it("should award a GOLD badge with 100+ wins", async function () {
      const { badge, issuer, user1, GOLD } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, GOLD, 150);

      expect(await badge.hasBadge(user1.address, GOLD)).to.be.true;
    });

    it("should award a DIAMOND badge with 500+ wins", async function () {
      const { badge, issuer, user1, DIAMOND } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, DIAMOND, 500);

      expect(await badge.hasBadge(user1.address, DIAMOND)).to.be.true;
    });

    it("should emit BadgeAwarded event", async function () {
      const { badge, issuer, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      const tx = badge.connect(issuer).awardBadge(user1.address, BRONZE, 7);

      await expect(tx)
        .to.emit(badge, "BadgeAwarded")
        .withArgs(0, user1.address, BRONZE, 7, (v: bigint) => v > 0n);
    });

    it("should allow multiple badge tiers for the same user", async function () {
      const { badge, issuer, user1, BRONZE, SILVER, GOLD } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 10);
      await badge.connect(issuer).awardBadge(user1.address, SILVER, 30);
      await badge.connect(issuer).awardBadge(user1.address, GOLD, 120);

      expect(await badge.hasBadge(user1.address, BRONZE)).to.be.true;
      expect(await badge.hasBadge(user1.address, SILVER)).to.be.true;
      expect(await badge.hasBadge(user1.address, GOLD)).to.be.true;
      expect(await badge.totalMinted()).to.equal(3);
    });

    it("should revert if user already has the same badge tier", async function () {
      const { badge, issuer, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);

      await expect(
        badge.connect(issuer).awardBadge(user1.address, BRONZE, 10)
      ).to.be.revertedWith("CollectorBadge: user already has this badge tier");
    });

    it("should revert if auction wins are below tier threshold", async function () {
      const { badge, issuer, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      await expect(
        badge.connect(issuer).awardBadge(user1.address, BRONZE, 3)
      ).to.be.revertedWith("CollectorBadge: insufficient auction wins for tier");
    });

    it("should revert if awarding to zero address", async function () {
      const { badge, issuer, BRONZE } = await loadFixture(deployBadgeFixture);

      await expect(
        badge.connect(issuer).awardBadge(ethers.ZeroAddress, BRONZE, 5)
      ).to.be.revertedWith("CollectorBadge: award to zero address");
    });

    it("should revert if caller is not an issuer", async function () {
      const { badge, user1, user2, BRONZE } = await loadFixture(deployBadgeFixture);

      await expect(
        badge.connect(user1).awardBadge(user2.address, BRONZE, 5)
      ).to.be.reverted;
    });
  });

  describe("Soulbound (Non-transferable)", function () {
    it("should prevent transferring badges between users", async function () {
      const { badge, issuer, user1, user2, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);

      await expect(
        badge.connect(user1).transferFrom(user1.address, user2.address, 0)
      ).to.be.revertedWith("CollectorBadge: badges are soulbound and cannot be transferred");
    });

    it("should prevent safeTransferFrom", async function () {
      const { badge, issuer, user1, user2, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);

      await expect(
        badge.connect(user1)["safeTransferFrom(address,address,uint256)"](
          user1.address,
          user2.address,
          0
        )
      ).to.be.revertedWith("CollectorBadge: badges are soulbound and cannot be transferred");
    });

    it("should prevent approved transfers", async function () {
      const { badge, issuer, user1, user2, user3, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);
      await badge.connect(user1).approve(user3.address, 0);

      await expect(
        badge.connect(user3).transferFrom(user1.address, user2.address, 0)
      ).to.be.revertedWith("CollectorBadge: badges are soulbound and cannot be transferred");
    });
  });

  describe("On-chain SVG Metadata", function () {
    it("should return a valid data URI for tokenURI", async function () {
      const { badge, issuer, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 10);

      const uri = await badge.tokenURI(0);
      expect(uri).to.match(/^data:application\/json;base64,/);

      // Decode and validate JSON structure
      const base64Data = uri.replace("data:application/json;base64,", "");
      const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
      const metadata = JSON.parse(jsonString);

      expect(metadata.name).to.include("Bronze");
      expect(metadata.name).to.include("Collector Badge");
      expect(metadata.description).to.include("10 auction wins");
      expect(metadata.image).to.match(/^data:image\/svg\+xml;base64,/);

      // Validate attributes
      expect(metadata.attributes).to.be.an("array");
      const tierAttr = metadata.attributes.find(
        (a: any) => a.trait_type === "Tier"
      );
      expect(tierAttr.value).to.equal("Bronze");

      const winsAttr = metadata.attributes.find(
        (a: any) => a.trait_type === "Auction Wins"
      );
      expect(winsAttr.value).to.equal(10);

      const transferAttr = metadata.attributes.find(
        (a: any) => a.trait_type === "Transferable"
      );
      expect(transferAttr.value).to.equal("No (Soulbound)");
    });

    it("should generate correct SVG with tier colors for each tier", async function () {
      const { badge, issuer, user1, user2, user3, BRONZE, SILVER, GOLD } =
        await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);
      await badge.connect(issuer).awardBadge(user2.address, SILVER, 25);
      await badge.connect(issuer).awardBadge(user3.address, GOLD, 100);

      // Check each badge has a different SVG
      const uri0 = await badge.tokenURI(0);
      const uri1 = await badge.tokenURI(1);
      const uri2 = await badge.tokenURI(2);

      // Parse and extract SVG images
      const decodeSvg = (uri: string) => {
        const json = JSON.parse(
          Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
        );
        return Buffer.from(
          json.image.replace("data:image/svg+xml;base64,", ""),
          "base64"
        ).toString();
      };

      const svg0 = decodeSvg(uri0);
      const svg1 = decodeSvg(uri1);
      const svg2 = decodeSvg(uri2);

      expect(svg0).to.include("#CD7F32"); // Bronze color
      expect(svg0).to.include("Bronze");
      expect(svg1).to.include("#C0C0C0"); // Silver color
      expect(svg1).to.include("Silver");
      expect(svg2).to.include("#FFD700"); // Gold color
      expect(svg2).to.include("Gold");
    });

    it("should revert tokenURI for non-existent token", async function () {
      const { badge } = await loadFixture(deployBadgeFixture);

      await expect(badge.tokenURI(999)).to.be.revertedWith(
        "CollectorBadge: token does not exist"
      );
    });
  });

  describe("View Functions", function () {
    it("should return badge info by token ID", async function () {
      const { badge, issuer, user1, GOLD } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, GOLD, 150);

      const info = await badge.getBadgeInfo(0);
      expect(info.tier).to.equal(GOLD);
      expect(info.auctionWins).to.equal(150);
      expect(info.awardedAt).to.be.greaterThan(0);
    });

    it("should return user badge token ID", async function () {
      const { badge, issuer, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);

      const tokenId = await badge.getUserBadgeToken(user1.address, BRONZE);
      expect(tokenId).to.equal(0);
    });

    it("should track badges awarded per tier", async function () {
      const { badge, issuer, user1, user2, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 5);
      await badge.connect(issuer).awardBadge(user2.address, BRONZE, 8);

      expect(await badge.badgesAwarded(BRONZE)).to.equal(2);
    });

    it("should revert getBadgeInfo for non-existent token", async function () {
      const { badge } = await loadFixture(deployBadgeFixture);
      await expect(badge.getBadgeInfo(999)).to.be.revertedWith(
        "CollectorBadge: token does not exist"
      );
    });
  });

  describe("Admin Functions", function () {
    it("should allow admin to update tier thresholds", async function () {
      const { badge, admin, BRONZE } = await loadFixture(deployBadgeFixture);

      await badge.connect(admin).setTierThreshold(BRONZE, 10);
      expect(await badge.tierThresholds(BRONZE)).to.equal(10);
    });

    it("should revert threshold update with zero value", async function () {
      const { badge, admin, BRONZE } = await loadFixture(deployBadgeFixture);

      await expect(
        badge.connect(admin).setTierThreshold(BRONZE, 0)
      ).to.be.revertedWith("CollectorBadge: threshold must be > 0");
    });

    it("should enforce new threshold on subsequent awards", async function () {
      const { badge, admin, issuer, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      // Increase BRONZE threshold to 10
      await badge.connect(admin).setTierThreshold(BRONZE, 10);

      // 5 wins should no longer be enough
      await expect(
        badge.connect(issuer).awardBadge(user1.address, BRONZE, 5)
      ).to.be.revertedWith("CollectorBadge: insufficient auction wins for tier");

      // 10 wins should work
      await badge.connect(issuer).awardBadge(user1.address, BRONZE, 10);
      expect(await badge.hasBadge(user1.address, BRONZE)).to.be.true;
    });

    it("should prevent non-admin from updating thresholds", async function () {
      const { badge, user1, BRONZE } = await loadFixture(deployBadgeFixture);

      await expect(
        badge.connect(user1).setTierThreshold(BRONZE, 10)
      ).to.be.reverted;
    });
  });
});
