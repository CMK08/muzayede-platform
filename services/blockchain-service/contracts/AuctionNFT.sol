// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuctionNFT
 * @notice ERC-721 NFT contract for auction items on the Muzayede platform.
 * Each token represents a unique auction item with provenance metadata.
 */
contract AuctionNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;

    // Mapping from token ID to auction ID
    mapping(uint256 => string) private _auctionIds;

    // Mapping from token ID to provenance hash chain
    mapping(uint256 => bytes32[]) private _provenanceHashes;

    // Authorized minters (platform services)
    mapping(address => bool) public authorizedMinters;

    event AuctionNFTMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string auctionId,
        string metadataUri
    );

    event ProvenanceRecorded(
        uint256 indexed tokenId,
        bytes32 provenanceHash,
        uint256 timestamp
    );

    event MinterAuthorized(address indexed minter, bool authorized);

    modifier onlyMinter() {
        require(
            authorizedMinters[msg.sender] || msg.sender == owner(),
            "AuctionNFT: caller is not an authorized minter"
        );
        _;
    }

    constructor() ERC721("Muzayede Auction NFT", "MAUC") Ownable(msg.sender) {
        authorizedMinters[msg.sender] = true;
    }

    /**
     * @notice Mint a new auction NFT
     * @param to The address that will own the minted NFT
     * @param uri The metadata URI (IPFS hash)
     * @param auctionId The associated auction ID from the platform
     */
    function mint(
        address to,
        string memory uri,
        string memory auctionId
    ) external onlyMinter returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _auctionIds[tokenId] = auctionId;

        emit AuctionNFTMinted(tokenId, to, auctionId, uri);
        return tokenId;
    }

    /**
     * @notice Record a provenance event hash for a token
     * @param tokenId The NFT token ID
     * @param provenanceHash Keccak256 hash of the provenance event data
     */
    function recordProvenance(
        uint256 tokenId,
        bytes32 provenanceHash
    ) external onlyMinter {
        require(_ownerOf(tokenId) != address(0), "AuctionNFT: token does not exist");
        _provenanceHashes[tokenId].push(provenanceHash);
        emit ProvenanceRecorded(tokenId, provenanceHash, block.timestamp);
    }

    /**
     * @notice Get the provenance hash chain for a token
     */
    function getProvenanceChain(uint256 tokenId) external view returns (bytes32[] memory) {
        return _provenanceHashes[tokenId];
    }

    /**
     * @notice Get the auction ID associated with a token
     */
    function getAuctionId(uint256 tokenId) external view returns (string memory) {
        return _auctionIds[tokenId];
    }

    /**
     * @notice Authorize or revoke a minter address
     */
    function setMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }

    // Required overrides for multiple inheritance
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
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
    ) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
