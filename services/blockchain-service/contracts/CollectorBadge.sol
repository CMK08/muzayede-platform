// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CollectorBadge
 * @notice Non-transferable (Soulbound) ERC-721 badges for collector achievements.
 * Badges are awarded by the platform and cannot be transferred between users.
 */
contract CollectorBadge is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Badge types and their metadata
    struct BadgeInfo {
        string badgeType;
        string name;
        string rarity;
        uint256 awardedAt;
    }

    // Mapping from token ID to badge info
    mapping(uint256 => BadgeInfo) public badges;

    // Mapping to track which badges a user has (user => badgeType => bool)
    mapping(address => mapping(string => bool)) public userBadges;

    // Authorized issuers
    mapping(address => bool) public authorizedIssuers;

    event BadgeAwarded(
        uint256 indexed tokenId,
        address indexed recipient,
        string badgeType,
        string name,
        string rarity
    );

    event IssuerAuthorized(address indexed issuer, bool authorized);

    modifier onlyIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner(),
            "CollectorBadge: caller is not an authorized issuer"
        );
        _;
    }

    constructor() ERC721("Muzayede Collector Badge", "MBADGE") Ownable(msg.sender) {
        authorizedIssuers[msg.sender] = true;
    }

    /**
     * @notice Award a badge to a user
     * @param to Recipient address
     * @param uri Metadata URI
     * @param badgeType Unique badge type identifier
     * @param name Human-readable badge name
     * @param rarity Badge rarity level
     */
    function awardBadge(
        address to,
        string memory uri,
        string memory badgeType,
        string memory name,
        string memory rarity
    ) external onlyIssuer returns (uint256) {
        require(!userBadges[to][badgeType], "CollectorBadge: user already has this badge");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        badges[tokenId] = BadgeInfo({
            badgeType: badgeType,
            name: name,
            rarity: rarity,
            awardedAt: block.timestamp
        });

        userBadges[to][badgeType] = true;

        emit BadgeAwarded(tokenId, to, badgeType, name, rarity);
        return tokenId;
    }

    /**
     * @notice Check if a user has a specific badge type
     */
    function hasBadge(address user, string memory badgeType) external view returns (bool) {
        return userBadges[user][badgeType];
    }

    /**
     * @notice Get badge info by token ID
     */
    function getBadgeInfo(uint256 tokenId) external view returns (BadgeInfo memory) {
        require(_ownerOf(tokenId) != address(0), "CollectorBadge: token does not exist");
        return badges[tokenId];
    }

    /**
     * @notice Authorize or revoke a badge issuer
     */
    function setIssuer(address issuer, bool authorized) external onlyOwner {
        authorizedIssuers[issuer] = authorized;
        emit IssuerAuthorized(issuer, authorized);
    }

    /**
     * @notice Override transfer to make badges soulbound (non-transferable).
     * Badges can only be minted, not transferred between users.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) and burning (to == address(0))
        // Block transfers between users
        if (from != address(0) && to != address(0)) {
            revert("CollectorBadge: badges are soulbound and cannot be transferred");
        }

        return super._update(to, tokenId, auth);
    }

    // Required overrides
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
