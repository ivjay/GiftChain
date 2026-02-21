// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RedemptionTracker
 * @dev Permanently marks vouchers as redeemed on-chain. Irreversible.
 */
contract RedemptionTracker is Ownable {
    // Mapping from NFT ID to redeemed status
    mapping(uint256 => bool) public redeemed;

    event Redeemed(uint256 indexed tokenId, address indexed redeemer, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    function redeem(uint256 tokenId) external {
        // In a real implementation, this would interact with the NFT contract to verify ownership/burn
        // or be called by the NFT contract itself.
        // For this demo, we just mark the ID as redeemed.
        require(!redeemed[tokenId], "Already redeemed");
        redeemed[tokenId] = true;
        emit Redeemed(tokenId, msg.sender, block.timestamp);
    }

    function isRedeemed(uint256 tokenId) external view returns (bool) {
        return redeemed[tokenId];
    }
}
