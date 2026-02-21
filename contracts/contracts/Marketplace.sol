// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GiftMarketplace
 * @dev Handles listing, buying, commissions, and secondary royalties.
 * Implements ReentrancyGuard for safety.
 */
contract GiftMarketplace is Ownable, ERC1155Holder, ReentrancyGuard {
    uint256 private _listingCounter = 1;
    uint256 public platformFeeBps = 250; // 2.5%

    struct Listing {
        uint256 listingId;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 quantity;
        uint256 pricePerUnit;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 pricePerUnit
    );

    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 totalPrice
    );

    event ItemUpdated(uint256 indexed listingId, uint256 newPrice);
    event ItemCanceled(uint256 indexed listingId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev List a gift card NFT for sale.
     * Seller must approve this contract via setApprovalForAll() first.
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 pricePerUnit
    ) external nonReentrant returns (uint256) {
        require(quantity > 0, "Quantity must be > 0");
        require(pricePerUnit > 0, "Price must be > 0");
        require(
            IERC1155(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );
        require(
            IERC1155(nftContract).balanceOf(msg.sender, tokenId) >= quantity,
            "Insufficient balance"
        );

        uint256 listingId = _listingCounter++;
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            active: true
        });

        emit ItemListed(listingId, msg.sender, nftContract, tokenId, quantity, pricePerUnit);
        return listingId;
    }

    /**
     * @dev Buy a listed gift card.
     */
    function buyItem(uint256 listingId, uint256 quantity) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity");

        uint256 totalPrice = listing.pricePerUnit * quantity;
        require(msg.value >= totalPrice, "Insufficient payment");

        // Calculate and distribute fees
        uint256 platformFee = (totalPrice * platformFeeBps) / 10000;
        uint256 sellerProceeds = totalPrice - platformFee;

        // Transfer funds
        payable(listing.seller).transfer(sellerProceeds);
        // Fees stay in contract until withdrawn by owner

        // Transfer NFT from seller to buyer
        // Note: Seller must have approved the marketplace
        try IERC1155(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId, quantity, "") {
            // Transfer success
        } catch {
            revert("NFT transfer failed");
        }

        // Update listing state
        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            listing.active = false;
        }

        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit ItemSold(listingId, msg.sender, listing.nftContract, listing.tokenId, quantity, totalPrice);
    }

    /**
     * @dev Update the price of an active listing.
     */
    function updateListingPrice(uint256 listingId, uint256 newPrice) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing not active");
        require(newPrice > 0, "Price must be > 0");

        listing.pricePerUnit = newPrice;
        emit ItemUpdated(listingId, newPrice);
    }

    /**
     * @dev Cancel an active listing.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing not active");

        listing.active = false;
        emit ItemCanceled(listingId);
    }

    /**
     * @dev Admin function to withdraw accumulated platform fees.
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Admin function to update platform fee percentage (basis points).
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Max 10%");
        platformFeeBps = newFeeBps;
    }
}
