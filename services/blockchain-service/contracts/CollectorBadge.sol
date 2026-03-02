// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title CollectorBadge
 * @notice Non-transferable (Soulbound) ERC-721 badges for collector achievements
 * on the Muzayede platform. Badges are awarded based on auction wins and cannot
 * be transferred between users. Metadata with SVG art is generated fully on-chain.
 *
 * Badge tiers:
 *   BRONZE  - 5 auction wins
 *   SILVER  - 25 auction wins
 *   GOLD    - 100 auction wins
 *   DIAMOND - 500 auction wins
 */
contract CollectorBadge is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    uint256 private _nextTokenId;

    /// @notice Badge tier enumeration
    enum BadgeTier { BRONZE, SILVER, GOLD, DIAMOND }

    /// @notice Badge information stored on-chain
    struct BadgeInfo {
        BadgeTier tier;
        uint256 auctionWins;
        uint256 awardedAt;
    }

    /// @notice Threshold of auction wins required for each tier
    mapping(BadgeTier => uint256) public tierThresholds;

    /// @notice Mapping from token ID to badge info
    mapping(uint256 => BadgeInfo) public badges;

    /// @notice Mapping to track which badge tiers a user has (user => tier => tokenId)
    /// 0 means not awarded
    mapping(address => mapping(BadgeTier => uint256)) private _userBadgeTokens;

    /// @notice Track if a user has a specific tier (user => tier => bool)
    mapping(address => mapping(BadgeTier => bool)) public userHasBadge;

    /// @notice Track total badges awarded per tier
    mapping(BadgeTier => uint256) public badgesAwarded;

    // ──────────────────────────── Events ────────────────────────────

    event BadgeAwarded(
        uint256 indexed tokenId,
        address indexed recipient,
        BadgeTier tier,
        uint256 auctionWins,
        uint256 timestamp
    );

    // ──────────────────────────── Constructor ────────────────────────────

    constructor(
        address defaultAdmin
    ) ERC721("Muzayede Collector Badge", "MBADGE") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ISSUER_ROLE, defaultAdmin);

        // Set default thresholds
        tierThresholds[BadgeTier.BRONZE] = 5;
        tierThresholds[BadgeTier.SILVER] = 25;
        tierThresholds[BadgeTier.GOLD] = 100;
        tierThresholds[BadgeTier.DIAMOND] = 500;
    }

    // ──────────────────────────── Badge Awarding ────────────────────────────

    /**
     * @notice Award a badge to a user based on their auction wins
     * @param to Recipient address
     * @param tier The badge tier to award
     * @param auctionWins The number of auction wins (must meet tier threshold)
     * @return tokenId The ID of the minted badge token
     */
    function awardBadge(
        address to,
        BadgeTier tier,
        uint256 auctionWins
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(to != address(0), "CollectorBadge: award to zero address");
        require(!userHasBadge[to][tier], "CollectorBadge: user already has this badge tier");
        require(
            auctionWins >= tierThresholds[tier],
            "CollectorBadge: insufficient auction wins for tier"
        );

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        badges[tokenId] = BadgeInfo({
            tier: tier,
            auctionWins: auctionWins,
            awardedAt: block.timestamp
        });

        userHasBadge[to][tier] = true;
        _userBadgeTokens[to][tier] = tokenId;
        badgesAwarded[tier]++;

        emit BadgeAwarded(tokenId, to, tier, auctionWins, block.timestamp);
        return tokenId;
    }

    // ──────────────────────────── Admin Functions ────────────────────────────

    /**
     * @notice Update the threshold for a badge tier
     * @param tier The tier to update
     * @param threshold New minimum auction wins required
     */
    function setTierThreshold(
        BadgeTier tier,
        uint256 threshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(threshold > 0, "CollectorBadge: threshold must be > 0");
        tierThresholds[tier] = threshold;
    }

    // ──────────────────────────── View Functions ────────────────────────────

    /**
     * @notice Check if a user has a specific badge tier
     */
    function hasBadge(address user, BadgeTier tier) external view returns (bool) {
        return userHasBadge[user][tier];
    }

    /**
     * @notice Get badge info by token ID
     */
    function getBadgeInfo(uint256 tokenId) external view returns (BadgeInfo memory) {
        require(_ownerOf(tokenId) != address(0), "CollectorBadge: token does not exist");
        return badges[tokenId];
    }

    /**
     * @notice Get the token ID for a user's badge of a specific tier
     */
    function getUserBadgeToken(
        address user,
        BadgeTier tier
    ) external view returns (uint256) {
        require(userHasBadge[user][tier], "CollectorBadge: user does not have this badge");
        return _userBadgeTokens[user][tier];
    }

    /**
     * @notice Get the total number of badges minted
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ──────────────────────────── On-chain SVG Metadata ────────────────────────────

    /**
     * @notice Generate fully on-chain tokenURI with SVG art
     * @param tokenId The token ID to query
     * @return data URI containing JSON metadata with embedded SVG image
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "CollectorBadge: token does not exist");

        BadgeInfo memory badge = badges[tokenId];
        string memory tierName = _tierName(badge.tier);
        string memory tierColor = _tierColor(badge.tier);
        string memory tierGlow = _tierGlowColor(badge.tier);

        // Build SVG
        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 350">',
            '<defs><radialGradient id="glow"><stop offset="0%" stop-color="',
            tierGlow,
            '" stop-opacity="0.6"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>',
            '<rect width="350" height="350" rx="20" fill="#1a1a2e"/>',
            '<circle cx="175" cy="140" r="90" fill="url(#glow)"/>',
            '<circle cx="175" cy="140" r="60" fill="none" stroke="',
            tierColor,
            '" stroke-width="4"/>',
            '<text x="175" y="150" text-anchor="middle" font-size="40" fill="',
            tierColor,
            '">',
            _tierEmoji(badge.tier),
            '</text>',
            '<text x="175" y="240" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white">',
            tierName,
            '</text>',
            '<text x="175" y="270" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#aaa">Muzayede Collector</text>',
            '<text x="175" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#666">',
            badge.auctionWins.toString(),
            ' Auction Wins</text>',
            '<text x="175" y="325" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#444">#',
            tokenId.toString(),
            '</text></svg>'
        ));

        // Build JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name":"Muzayede ',
            tierName,
            ' Collector Badge #',
            tokenId.toString(),
            '","description":"Soulbound collector badge awarded for ',
            badge.auctionWins.toString(),
            ' auction wins on the Muzayede platform.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Tier","value":"',
            tierName,
            '"},{"trait_type":"Auction Wins","display_type":"number","value":',
            badge.auctionWins.toString(),
            '},{"trait_type":"Awarded At","display_type":"date","value":',
            badge.awardedAt.toString(),
            '},{"trait_type":"Transferable","value":"No (Soulbound)"}]}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    // ──────────────────────────── Soulbound Logic ────────────────────────────

    /**
     * @dev Override _update to make badges soulbound (non-transferable).
     * Only minting (from == address(0)) and burning (to == address(0)) are allowed.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting and burning, block user-to-user transfers
        if (from != address(0) && to != address(0)) {
            revert("CollectorBadge: badges are soulbound and cannot be transferred");
        }

        return super._update(to, tokenId, auth);
    }

    // ──────────────────────────── Internal Helpers ────────────────────────────

    function _tierName(BadgeTier tier) internal pure returns (string memory) {
        if (tier == BadgeTier.BRONZE) return "Bronze";
        if (tier == BadgeTier.SILVER) return "Silver";
        if (tier == BadgeTier.GOLD) return "Gold";
        return "Diamond";
    }

    function _tierColor(BadgeTier tier) internal pure returns (string memory) {
        if (tier == BadgeTier.BRONZE) return "#CD7F32";
        if (tier == BadgeTier.SILVER) return "#C0C0C0";
        if (tier == BadgeTier.GOLD) return "#FFD700";
        return "#B9F2FF";
    }

    function _tierGlowColor(BadgeTier tier) internal pure returns (string memory) {
        if (tier == BadgeTier.BRONZE) return "#CD7F32";
        if (tier == BadgeTier.SILVER) return "#C0C0C0";
        if (tier == BadgeTier.GOLD) return "#FFD700";
        return "#00BFFF";
    }

    function _tierEmoji(BadgeTier tier) internal pure returns (string memory) {
        if (tier == BadgeTier.BRONZE) return unicode"🥉";
        if (tier == BadgeTier.SILVER) return unicode"🥈";
        if (tier == BadgeTier.GOLD) return unicode"🥇";
        return unicode"💎";
    }

    // ──────────────────────────── Required Overrides ────────────────────────────

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
