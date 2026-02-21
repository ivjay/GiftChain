// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GiftNFT
 * @dev ERC-1155 multi-token contract for digital gift cards.
 * Stores IPFS CID per token for encrypted voucher credentials.
 * Implements burn-to-redeem mechanic for irreversible usage tracking.
 */
contract GiftNFT is ERC1155, ERC1155Burnable, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId = 1;
    string public name = "GiftChain NFT";
    string public symbol = "GIFT";

    struct GiftMetadata {
        string ipfsCID;
        address creator;
        uint256 createdAt;
        string category;
        uint256 baseTokenType; // 0 for voucher, 1 for subscription, etc.
        uint256 initialSupply;
    }

    mapping(uint256 => GiftMetadata) public gifts;
    mapping(uint256 => string) private _tokenURIs;

    event GiftMinted(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 quantity,
        string ipfsCID,
        string category
    );

    event GiftRedeemed(
        uint256 indexed tokenId,
        address indexed redeemer,
        uint256 quantity,
        uint256 timestamp
    );

    constructor() ERC1155("") Ownable(msg.sender) {}

    /**
     * @dev Mint new gift card NFTs (ERC-1155 batch support)
     */
    function mint(
        address to,
        uint256 quantity,
        string calldata ipfsCID,
        string calldata category,
        uint256 baseTokenType,
        string calldata tokenURI_
    ) external nonReentrant returns (uint256) {
        require(quantity > 0, "Quantity must be > 0");
        
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId, quantity, "");

        gifts[tokenId] = GiftMetadata({
            ipfsCID: ipfsCID,
            creator: msg.sender,
            createdAt: block.timestamp,
            category: category,
            baseTokenType: baseTokenType,
            initialSupply: quantity
        });

        _tokenURIs[tokenId] = tokenURI_;

        emit GiftMinted(tokenId, msg.sender, quantity, ipfsCID, category);
        return tokenId;
    }

    /**
     * @dev Redeem a gift card by burning it. This is irreversible.
     * The token is removed from circulation, proving it has been used.
     */
    function redeem(uint256 tokenId, uint256 quantity) external nonReentrant {
        require(balanceOf(msg.sender, tokenId) >= quantity, "Insufficient balance to redeem");
        
        // Burn the token to mark as used
        burn(msg.sender, tokenId, quantity);

        emit GiftRedeemed(tokenId, msg.sender, quantity, block.timestamp);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function getGiftMetadata(uint256 tokenId) external view returns (GiftMetadata memory) {
        return gifts[tokenId];
    }

    // Returns total minted so far
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}
