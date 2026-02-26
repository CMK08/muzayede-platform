// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title FractionalOwnership
 * @notice ERC-1155 contract enabling fractional ownership of auction items.
 * Users can purchase shares (fractions) of high-value NFTs.
 */
contract FractionalOwnership is ERC1155, Ownable {
    struct FractionalListing {
        address nftContract;
        uint256 nftTokenId;
        uint256 totalShares;
        uint256 availableShares;
        uint256 pricePerShare;
        address originalOwner;
        bool isActive;
    }

    uint256 private _nextListingId;

    // Mapping from listing ID to fractional listing details
    mapping(uint256 => FractionalListing) public listings;

    // Mapping from listing ID to revenue accumulated
    mapping(uint256 => uint256) public accumulatedRevenue;

    event ListingCreated(
        uint256 indexed listingId,
        address nftContract,
        uint256 nftTokenId,
        uint256 totalShares,
        uint256 pricePerShare
    );

    event SharesPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 shares,
        uint256 totalPaid
    );

    event ListingClosed(uint256 indexed listingId);

    event RevenueDistributed(uint256 indexed listingId, uint256 amount);

    constructor() ERC1155("https://muzayede.com/api/v1/metadata/{id}.json") Ownable(msg.sender) {}

    /**
     * @notice Create a fractional listing by locking an NFT
     * @param nftContract Address of the ERC-721 contract
     * @param nftTokenId Token ID of the NFT to fractionalize
     * @param totalShares Number of shares to create
     * @param pricePerShare Price per share in wei
     */
    function createListing(
        address nftContract,
        uint256 nftTokenId,
        uint256 totalShares,
        uint256 pricePerShare
    ) external returns (uint256) {
        require(totalShares > 0, "FractionalOwnership: shares must be > 0");
        require(pricePerShare > 0, "FractionalOwnership: price must be > 0");

        // Transfer NFT to this contract (escrow)
        IERC721(nftContract).transferFrom(msg.sender, address(this), nftTokenId);

        uint256 listingId = _nextListingId++;

        listings[listingId] = FractionalListing({
            nftContract: nftContract,
            nftTokenId: nftTokenId,
            totalShares: totalShares,
            availableShares: totalShares,
            pricePerShare: pricePerShare,
            originalOwner: msg.sender,
            isActive: true
        });

        emit ListingCreated(listingId, nftContract, nftTokenId, totalShares, pricePerShare);
        return listingId;
    }

    /**
     * @notice Purchase fractional shares
     * @param listingId The listing to purchase from
     * @param shares Number of shares to purchase
     */
    function purchaseShares(uint256 listingId, uint256 shares) external payable {
        FractionalListing storage listing = listings[listingId];
        require(listing.isActive, "FractionalOwnership: listing not active");
        require(shares > 0 && shares <= listing.availableShares, "FractionalOwnership: invalid shares");

        uint256 totalCost = shares * listing.pricePerShare;
        require(msg.value >= totalCost, "FractionalOwnership: insufficient payment");

        listing.availableShares -= shares;

        // Mint ERC-1155 tokens representing shares
        _mint(msg.sender, listingId, shares, "");

        // Transfer payment to original owner
        payable(listing.originalOwner).transfer(totalCost);

        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit SharesPurchased(listingId, msg.sender, shares, totalCost);
    }

    /**
     * @notice Close a listing and return NFT to owner (only if all shares are owned by one person)
     */
    function closeListing(uint256 listingId) external {
        FractionalListing storage listing = listings[listingId];
        require(listing.isActive, "FractionalOwnership: listing not active");

        // Check if caller owns all shares
        require(
            balanceOf(msg.sender, listingId) == listing.totalShares,
            "FractionalOwnership: must own all shares to close"
        );

        listing.isActive = false;

        // Burn all share tokens
        _burn(msg.sender, listingId, listing.totalShares);

        // Return NFT to the share owner
        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, listing.nftTokenId);

        emit ListingClosed(listingId);
    }

    /**
     * @notice Get listing details
     */
    function getListing(uint256 listingId) external view returns (FractionalListing memory) {
        return listings[listingId];
    }
}
