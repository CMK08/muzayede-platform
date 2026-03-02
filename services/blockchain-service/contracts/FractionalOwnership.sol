// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FractionalOwnership
 * @notice ERC-1155 contract enabling fractional ownership of high-value auction items.
 * Users can purchase shares (fractions) of NFTs, receive dividends, and sell shares.
 * Includes minimum holding period enforcement and dividend distribution.
 */
contract FractionalOwnership is ERC1155, AccessControl, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct FractionalListing {
        address nftContract;
        uint256 nftTokenId;
        uint256 totalShares;
        uint256 availableShares;
        uint256 pricePerShare;
        address originalOwner;
        bool isActive;
        uint256 createdAt;
        uint256 minimumHoldingPeriod; // seconds
        uint256 totalDividendsDistributed;
    }

    uint256 private _nextListingId;

    /// @notice Mapping from listing ID to fractional listing details
    mapping(uint256 => FractionalListing) public listings;

    /// @notice Mapping from listing ID to accumulated undistributed revenue
    mapping(uint256 => uint256) public accumulatedRevenue;

    /// @notice Tracks when a user purchased shares (listingId => user => timestamp)
    mapping(uint256 => mapping(address => uint256)) public purchaseTimestamp;

    /// @notice Tracks claimed dividends per user (listingId => user => amount claimed)
    mapping(uint256 => mapping(address => uint256)) public claimedDividends;

    /// @notice Dividend per share scaled by 1e18 (listingId => cumulativeDividendPerShare)
    mapping(uint256 => uint256) public cumulativeDividendPerShare;

    /// @notice Snapshot of cumulativeDividendPerShare at user's last claim or purchase
    mapping(uint256 => mapping(address => uint256)) public userDividendSnapshot;

    /// @notice Shares listed for sale by holders (listingId => seller => SharesForSale)
    struct SharesForSale {
        uint256 quantity;
        uint256 pricePerShare;
        bool isActive;
    }
    mapping(uint256 => mapping(address => SharesForSale)) public sharesForSale;

    // ──────────────────────────── Events ────────────────────────────

    event FractionCreated(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed nftTokenId,
        uint256 totalShares,
        uint256 pricePerShare,
        uint256 minimumHoldingPeriod
    );

    event SharesPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 shares,
        uint256 totalPaid
    );

    event SharesSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 shares,
        uint256 totalPaid
    );

    event SharesListedForSale(
        uint256 indexed listingId,
        address indexed seller,
        uint256 quantity,
        uint256 pricePerShare
    );

    event SharesDelistedFromSale(
        uint256 indexed listingId,
        address indexed seller
    );

    event DividendDistributed(
        uint256 indexed listingId,
        uint256 amount,
        uint256 totalDividendsToDate
    );

    event DividendClaimed(
        uint256 indexed listingId,
        address indexed holder,
        uint256 amount
    );

    event ListingClosed(uint256 indexed listingId, address indexed closedBy);

    // ──────────────────────────── Constructor ────────────────────────────

    constructor(
        address defaultAdmin
    ) ERC1155("https://muzayede.com/api/v1/fractional/metadata/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(OPERATOR_ROLE, defaultAdmin);
    }

    // ──────────────────────────── Create Listing ────────────────────────────

    /**
     * @notice Create a fractional listing by locking an NFT into escrow
     * @param nftContract Address of the ERC-721 contract
     * @param nftTokenId Token ID of the NFT to fractionalize
     * @param totalShares Number of shares to create
     * @param pricePerShare Price per share in wei
     * @param minimumHoldingPeriod Minimum seconds a buyer must hold before selling
     * @return listingId The ID of the created listing
     */
    function createListing(
        address nftContract,
        uint256 nftTokenId,
        uint256 totalShares,
        uint256 pricePerShare,
        uint256 minimumHoldingPeriod
    ) external returns (uint256) {
        require(nftContract != address(0), "FractionalOwnership: zero NFT address");
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
            isActive: true,
            createdAt: block.timestamp,
            minimumHoldingPeriod: minimumHoldingPeriod,
            totalDividendsDistributed: 0
        });

        emit FractionCreated(
            listingId,
            nftContract,
            nftTokenId,
            totalShares,
            pricePerShare,
            minimumHoldingPeriod
        );

        return listingId;
    }

    // ──────────────────────────── Buy Shares (Primary) ────────────────────────────

    /**
     * @notice Purchase fractional shares from the primary listing
     * @param listingId The listing to purchase from
     * @param shares Number of shares to purchase
     */
    function purchaseShares(
        uint256 listingId,
        uint256 shares
    ) external payable nonReentrant {
        FractionalListing storage listing = listings[listingId];
        require(listing.isActive, "FractionalOwnership: listing not active");
        require(shares > 0, "FractionalOwnership: zero shares");
        require(shares <= listing.availableShares, "FractionalOwnership: insufficient shares");

        uint256 totalCost = shares * listing.pricePerShare;
        require(msg.value >= totalCost, "FractionalOwnership: insufficient payment");

        listing.availableShares -= shares;

        // Snapshot dividend state for new holder
        if (balanceOf(msg.sender, listingId) == 0) {
            purchaseTimestamp[listingId][msg.sender] = block.timestamp;
            userDividendSnapshot[listingId][msg.sender] = cumulativeDividendPerShare[listingId];
        }

        // Mint ERC-1155 tokens representing shares
        _mint(msg.sender, listingId, shares, "");

        // Transfer payment to original owner
        (bool sent, ) = payable(listing.originalOwner).call{value: totalCost}("");
        require(sent, "FractionalOwnership: payment transfer failed");

        // Refund excess payment
        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refunded, "FractionalOwnership: refund failed");
        }

        emit SharesPurchased(listingId, msg.sender, shares, totalCost);
    }

    // ──────────────────────────── Secondary Market (Sell Shares) ────────────────────────────

    /**
     * @notice List shares for sale on the secondary market
     * @param listingId The fractional listing ID
     * @param quantity Number of shares to list
     * @param askPricePerShare Asking price per share in wei
     */
    function listSharesForSale(
        uint256 listingId,
        uint256 quantity,
        uint256 askPricePerShare
    ) external {
        FractionalListing storage listing = listings[listingId];
        require(listing.isActive, "FractionalOwnership: listing not active");
        require(quantity > 0, "FractionalOwnership: zero quantity");
        require(
            balanceOf(msg.sender, listingId) >= quantity,
            "FractionalOwnership: insufficient shares"
        );

        // Enforce minimum holding period
        require(
            block.timestamp >= purchaseTimestamp[listingId][msg.sender] + listing.minimumHoldingPeriod,
            "FractionalOwnership: minimum holding period not met"
        );

        sharesForSale[listingId][msg.sender] = SharesForSale({
            quantity: quantity,
            pricePerShare: askPricePerShare,
            isActive: true
        });

        emit SharesListedForSale(listingId, msg.sender, quantity, askPricePerShare);
    }

    /**
     * @notice Cancel a share listing on the secondary market
     * @param listingId The fractional listing ID
     */
    function delistShares(uint256 listingId) external {
        sharesForSale[listingId][msg.sender].isActive = false;
        emit SharesDelistedFromSale(listingId, msg.sender);
    }

    /**
     * @notice Buy shares from a secondary market seller
     * @param listingId The fractional listing ID
     * @param seller The address of the seller
     * @param shares Number of shares to buy
     */
    function buySharesFromHolder(
        uint256 listingId,
        address seller,
        uint256 shares
    ) external payable nonReentrant {
        SharesForSale storage sale = sharesForSale[listingId][seller];
        require(sale.isActive, "FractionalOwnership: no active sale");
        require(shares > 0 && shares <= sale.quantity, "FractionalOwnership: invalid shares");

        uint256 totalCost = shares * sale.pricePerShare;
        require(msg.value >= totalCost, "FractionalOwnership: insufficient payment");

        sale.quantity -= shares;
        if (sale.quantity == 0) {
            sale.isActive = false;
        }

        // Snapshot dividend state for buyer
        if (balanceOf(msg.sender, listingId) == 0) {
            purchaseTimestamp[listingId][msg.sender] = block.timestamp;
            userDividendSnapshot[listingId][msg.sender] = cumulativeDividendPerShare[listingId];
        }

        // Transfer shares from seller to buyer via ERC1155
        _safeTransferFrom(seller, msg.sender, listingId, shares, "");

        // Pay the seller
        (bool sent, ) = payable(seller).call{value: totalCost}("");
        require(sent, "FractionalOwnership: payment transfer failed");

        // Refund excess
        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refunded, "FractionalOwnership: refund failed");
        }

        emit SharesSold(listingId, seller, msg.sender, shares, totalCost);
    }

    // ──────────────────────────── Dividend Distribution ────────────────────────────

    /**
     * @notice Distribute dividends to all shareholders of a listing
     * @param listingId The fractional listing ID
     * @dev Dividends are distributed proportionally based on share ownership.
     *      Holders must call claimDividend to withdraw their portion.
     */
    function distributeDividend(
        uint256 listingId
    ) external payable onlyRole(OPERATOR_ROLE) {
        FractionalListing storage listing = listings[listingId];
        require(listing.isActive, "FractionalOwnership: listing not active");
        require(msg.value > 0, "FractionalOwnership: zero dividend");

        uint256 soldShares = listing.totalShares - listing.availableShares;
        require(soldShares > 0, "FractionalOwnership: no shareholders");

        // Increase cumulative dividend per share (scaled by 1e18 for precision)
        cumulativeDividendPerShare[listingId] += (msg.value * 1e18) / soldShares;
        listing.totalDividendsDistributed += msg.value;

        emit DividendDistributed(
            listingId,
            msg.value,
            listing.totalDividendsDistributed
        );
    }

    /**
     * @notice Claim accumulated dividends for a listing
     * @param listingId The fractional listing ID
     */
    function claimDividend(uint256 listingId) external nonReentrant {
        uint256 shares = balanceOf(msg.sender, listingId);
        require(shares > 0, "FractionalOwnership: no shares held");

        uint256 owed = _pendingDividend(listingId, msg.sender);
        require(owed > 0, "FractionalOwnership: no dividend to claim");

        // Update snapshot
        userDividendSnapshot[listingId][msg.sender] = cumulativeDividendPerShare[listingId];
        claimedDividends[listingId][msg.sender] += owed;

        (bool sent, ) = payable(msg.sender).call{value: owed}("");
        require(sent, "FractionalOwnership: dividend claim failed");

        emit DividendClaimed(listingId, msg.sender, owed);
    }

    /**
     * @notice View pending (unclaimed) dividend for a holder
     * @param listingId The fractional listing ID
     * @param holder The holder address
     * @return Pending dividend amount in wei
     */
    function pendingDividend(
        uint256 listingId,
        address holder
    ) external view returns (uint256) {
        return _pendingDividend(listingId, holder);
    }

    function _pendingDividend(
        uint256 listingId,
        address holder
    ) internal view returns (uint256) {
        uint256 shares = balanceOf(holder, listingId);
        if (shares == 0) return 0;

        uint256 cumulative = cumulativeDividendPerShare[listingId];
        uint256 snapshot = userDividendSnapshot[listingId][holder];
        return (shares * (cumulative - snapshot)) / 1e18;
    }

    // ──────────────────────────── Close Listing ────────────────────────────

    /**
     * @notice Close a listing and return NFT to the caller (must own all shares)
     * @param listingId The fractional listing ID
     */
    function closeListing(uint256 listingId) external nonReentrant {
        FractionalListing storage listing = listings[listingId];
        require(listing.isActive, "FractionalOwnership: listing not active");
        require(
            balanceOf(msg.sender, listingId) == listing.totalShares - listing.availableShares,
            "FractionalOwnership: must own all sold shares to close"
        );

        listing.isActive = false;

        // Burn all share tokens held by caller
        uint256 heldShares = balanceOf(msg.sender, listingId);
        if (heldShares > 0) {
            _burn(msg.sender, listingId, heldShares);
        }

        // Return NFT to the consolidating owner
        IERC721(listing.nftContract).transferFrom(
            address(this),
            msg.sender,
            listing.nftTokenId
        );

        emit ListingClosed(listingId, msg.sender);
    }

    // ──────────────────────────── View Functions ────────────────────────────

    /**
     * @notice Get listing details
     */
    function getListing(
        uint256 listingId
    ) external view returns (FractionalListing memory) {
        return listings[listingId];
    }

    /**
     * @notice Get the number of sold shares for a listing
     */
    function soldShares(uint256 listingId) external view returns (uint256) {
        FractionalListing storage listing = listings[listingId];
        return listing.totalShares - listing.availableShares;
    }

    /**
     * @notice Check if a holder has met the minimum holding period
     */
    function canSell(
        uint256 listingId,
        address holder
    ) external view returns (bool) {
        FractionalListing storage listing = listings[listingId];
        return block.timestamp >= purchaseTimestamp[listingId][holder] + listing.minimumHoldingPeriod;
    }

    // ──────────────────────────── Required Overrides ────────────────────────────

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
