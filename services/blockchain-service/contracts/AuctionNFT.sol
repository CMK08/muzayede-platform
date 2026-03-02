// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AuctionNFT
 * @notice ERC-721 NFT contract for auction certificates on the Muzayede platform.
 * Each token represents a unique auction item with full provenance tracking.
 * Metadata (tokenURI) points to IPFS for decentralized storage.
 * Tokens can be locked during active auctions to prevent transfers.
 */
contract AuctionNFT is ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant AUCTION_MANAGER_ROLE = keccak256("AUCTION_MANAGER_ROLE");

    uint256 private _nextTokenId;

    /// @notice Provenance record stored on-chain
    struct ProvenanceRecord {
        address previousOwner;
        address newOwner;
        uint256 salePrice;
        uint256 timestamp;
        string notes;
    }

    /// @notice Mapping from token ID to auction ID (off-chain reference)
    mapping(uint256 => string) private _auctionIds;

    /// @notice Mapping from token ID to product ID (off-chain reference)
    mapping(uint256 => string) private _productIds;

    /// @notice Mapping from token ID to full provenance history
    mapping(uint256 => ProvenanceRecord[]) private _provenanceHistory;

    /// @notice Mapping from token ID to provenance hash chain (for verification)
    mapping(uint256 => bytes32[]) private _provenanceHashes;

    /// @notice Mapping from token ID to lock status (locked during active auctions)
    mapping(uint256 => bool) private _auctionLocked;

    /// @notice Mapping from token ID to the auction that locked it
    mapping(uint256 => string) private _lockedByAuction;

    // ──────────────────────────── Events ────────────────────────────

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string auctionId,
        string metadataUri
    );

    event ProvenanceRecorded(
        uint256 indexed tokenId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 salePrice,
        uint256 timestamp,
        string notes
    );

    event OwnershipTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    event TokenLocked(
        uint256 indexed tokenId,
        string auctionId
    );

    event TokenUnlocked(
        uint256 indexed tokenId,
        string auctionId
    );

    // ──────────────────────────── Constructor ────────────────────────────

    constructor(
        address defaultAdmin
    ) ERC721("Muzayede Auction NFT", "MAUC") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        _grantRole(AUCTION_MANAGER_ROLE, defaultAdmin);
    }

    // ──────────────────────────── Auction Lock ────────────────────────────

    /**
     * @notice Lock a token during an active auction (prevents transfers)
     * @param tokenId The token ID to lock
     * @param auctionId The auction ID that is locking this token
     */
    function lockForAuction(
        uint256 tokenId,
        string memory auctionId
    ) external onlyRole(AUCTION_MANAGER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "AuctionNFT: token does not exist");
        require(!_auctionLocked[tokenId], "AuctionNFT: token already locked");
        require(bytes(auctionId).length > 0, "AuctionNFT: empty auction ID");

        _auctionLocked[tokenId] = true;
        _lockedByAuction[tokenId] = auctionId;

        emit TokenLocked(tokenId, auctionId);
    }

    /**
     * @notice Unlock a token after an auction ends
     * @param tokenId The token ID to unlock
     */
    function unlockFromAuction(
        uint256 tokenId
    ) external onlyRole(AUCTION_MANAGER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "AuctionNFT: token does not exist");
        require(_auctionLocked[tokenId], "AuctionNFT: token not locked");

        string memory auctionId = _lockedByAuction[tokenId];
        _auctionLocked[tokenId] = false;
        _lockedByAuction[tokenId] = "";

        emit TokenUnlocked(tokenId, auctionId);
    }

    /**
     * @notice Check if a token is locked for an auction
     * @param tokenId The token ID to check
     * @return True if the token is locked
     */
    function isLocked(uint256 tokenId) external view returns (bool) {
        return _auctionLocked[tokenId];
    }

    /**
     * @notice Get the auction ID that has locked a token
     * @param tokenId The token ID to check
     * @return The auction ID string, or empty if not locked
     */
    function getLockedByAuction(uint256 tokenId) external view returns (string memory) {
        return _lockedByAuction[tokenId];
    }

    // ──────────────────────────── Minting ────────────────────────────

    /**
     * @notice Mint a new auction certificate NFT
     * @param to The address that will own the minted NFT
     * @param uri The metadata URI (IPFS hash, e.g. "ipfs://Qm...")
     * @param auctionId The associated auction ID from the Muzayede platform
     * @return tokenId The ID of the newly minted token
     */
    function mint(
        address to,
        string memory uri,
        string memory auctionId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "AuctionNFT: mint to zero address");
        require(bytes(uri).length > 0, "AuctionNFT: empty URI");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _auctionIds[tokenId] = auctionId;

        // Record initial provenance (minting event)
        _provenanceHistory[tokenId].push(ProvenanceRecord({
            previousOwner: address(0),
            newOwner: to,
            salePrice: 0,
            timestamp: block.timestamp,
            notes: "Certificate minted"
        }));

        bytes32 provenanceHash = keccak256(
            abi.encodePacked(address(0), to, uint256(0), block.timestamp)
        );
        _provenanceHashes[tokenId].push(provenanceHash);

        emit CertificateMinted(tokenId, to, auctionId, uri);
        return tokenId;
    }

    /**
     * @notice Mint a new auction certificate NFT with product ID reference
     * @param to The address that will own the minted NFT
     * @param uri The metadata URI (IPFS hash, e.g. "ipfs://Qm...")
     * @param auctionId The associated auction ID from the Muzayede platform
     * @param productId The associated product ID from the Muzayede platform
     * @return tokenId The ID of the newly minted token
     */
    function mintWithProduct(
        address to,
        string memory uri,
        string memory auctionId,
        string memory productId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "AuctionNFT: mint to zero address");
        require(bytes(uri).length > 0, "AuctionNFT: empty URI");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _auctionIds[tokenId] = auctionId;
        _productIds[tokenId] = productId;

        // Record initial provenance (minting event)
        _provenanceHistory[tokenId].push(ProvenanceRecord({
            previousOwner: address(0),
            newOwner: to,
            salePrice: 0,
            timestamp: block.timestamp,
            notes: "Certificate minted"
        }));

        bytes32 provenanceHash = keccak256(
            abi.encodePacked(address(0), to, uint256(0), block.timestamp)
        );
        _provenanceHashes[tokenId].push(provenanceHash);

        emit CertificateMinted(tokenId, to, auctionId, uri);
        return tokenId;
    }

    // ──────────────────────────── Provenance ────────────────────────────

    /**
     * @notice Record a provenance event for a token (sale, appraisal, etc.)
     * @param tokenId The NFT token ID
     * @param previousOwner The previous owner address
     * @param newOwner The new owner address
     * @param salePrice The price of the sale in wei (0 if not a sale)
     * @param notes Additional notes about the provenance event
     */
    function recordProvenance(
        uint256 tokenId,
        address previousOwner,
        address newOwner,
        uint256 salePrice,
        string memory notes
    ) external onlyRole(MINTER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "AuctionNFT: token does not exist");

        _provenanceHistory[tokenId].push(ProvenanceRecord({
            previousOwner: previousOwner,
            newOwner: newOwner,
            salePrice: salePrice,
            timestamp: block.timestamp,
            notes: notes
        }));

        bytes32 provenanceHash = keccak256(
            abi.encodePacked(previousOwner, newOwner, salePrice, block.timestamp)
        );
        _provenanceHashes[tokenId].push(provenanceHash);

        emit ProvenanceRecorded(
            tokenId,
            previousOwner,
            newOwner,
            salePrice,
            block.timestamp,
            notes
        );
    }

    /**
     * @notice Get the full provenance history for a token
     * @param tokenId The token ID to query
     * @return Array of ProvenanceRecord structs
     */
    function getProvenanceHistory(
        uint256 tokenId
    ) external view returns (ProvenanceRecord[] memory) {
        require(_ownerOf(tokenId) != address(0), "AuctionNFT: token does not exist");
        return _provenanceHistory[tokenId];
    }

    /**
     * @notice Get the provenance hash chain for verification
     * @param tokenId The token ID to query
     * @return Array of keccak256 provenance hashes
     */
    function getProvenanceChain(
        uint256 tokenId
    ) external view returns (bytes32[] memory) {
        return _provenanceHashes[tokenId];
    }

    /**
     * @notice Get the number of provenance records for a token
     * @param tokenId The token ID to query
     */
    function getProvenanceCount(uint256 tokenId) external view returns (uint256) {
        return _provenanceHistory[tokenId].length;
    }

    // ──────────────────────────── Transfer with Provenance ────────────────────────────

    /**
     * @notice Transfer a token and automatically record provenance
     * @param from Current owner
     * @param to New owner
     * @param tokenId The token to transfer
     * @param salePrice The sale price (0 for gifts/non-sale transfers)
     * @param notes Optional notes about the transfer
     */
    function transferWithProvenance(
        address from,
        address to,
        uint256 tokenId,
        uint256 salePrice,
        string memory notes
    ) external {
        // The caller must be approved or owner
        require(
            _isAuthorized(_ownerOf(tokenId), msg.sender, tokenId),
            "AuctionNFT: caller not authorized"
        );

        // Locked tokens cannot be transferred
        require(!_auctionLocked[tokenId], "AuctionNFT: token is locked for auction");

        // Record provenance before transfer
        _provenanceHistory[tokenId].push(ProvenanceRecord({
            previousOwner: from,
            newOwner: to,
            salePrice: salePrice,
            timestamp: block.timestamp,
            notes: bytes(notes).length > 0 ? notes : "Ownership transferred"
        }));

        bytes32 provenanceHash = keccak256(
            abi.encodePacked(from, to, salePrice, block.timestamp)
        );
        _provenanceHashes[tokenId].push(provenanceHash);

        emit ProvenanceRecorded(tokenId, from, to, salePrice, block.timestamp, notes);

        // Perform the actual transfer
        safeTransferFrom(from, to, tokenId);
    }

    // ──────────────────────────── View Functions ────────────────────────────

    /**
     * @notice Get the auction ID associated with a token
     */
    function getAuctionId(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "AuctionNFT: token does not exist");
        return _auctionIds[tokenId];
    }

    /**
     * @notice Get the product ID associated with a token
     */
    function getProductId(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "AuctionNFT: token does not exist");
        return _productIds[tokenId];
    }

    /**
     * @notice Get the total number of minted tokens
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ──────────────────────────── Internal Overrides ────────────────────────────

    /**
     * @dev Override _update to enforce auction lock and emit OwnershipTransferred event.
     * Locked tokens cannot be transferred (except minting and burning).
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);

        // Block transfers of locked tokens (allow minting where from == address(0))
        if (from != address(0) && to != address(0) && _auctionLocked[tokenId]) {
            revert("AuctionNFT: token is locked for auction");
        }

        address result = super._update(to, tokenId, auth);

        if (from != address(0) && to != address(0)) {
            emit OwnershipTransferred(tokenId, from, to);
        }

        return result;
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
