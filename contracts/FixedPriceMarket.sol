// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Like {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/// @title FixedPriceMarket
/// @notice Minimal peer-to-peer marketplace for listing and buying CarbonCredit tokens.
///         Sellers must approve() this contract before listing. No custody is taken —
///         tokens move directly from seller to buyer via transferFrom on purchase.
contract FixedPriceMarket {
    struct Listing {
        address seller;
        uint256 amount;
        uint256 pricePerUnit; // in wei, per 1 token
        bool active;
    }

    IERC20Like public token;
    uint256 public nextId;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed id, address indexed seller, uint256 amount, uint256 pricePerUnit);
    event ListingCancelled(uint256 indexed id);
    event Purchased(uint256 indexed id, address indexed buyer, uint256 amount);

    constructor(address token_) {
        require(token_ != address(0), "Invalid token address");
        token = IERC20Like(token_);
    }

    function list(uint256 amount, uint256 pricePerUnit) external returns (uint256 id) {
        require(amount > 0, "Amount must be > 0");
        require(pricePerUnit > 0, "Price must be > 0");
        require(token.allowance(msg.sender, address(this)) >= amount, "Approve marketplace first");

        id = ++nextId;
        listings[id] = Listing(msg.sender, amount, pricePerUnit, true);
        emit Listed(id, msg.sender, amount, pricePerUnit);
    }

    function cancelListing(uint256 id) external {
        Listing storage L = listings[id];
        require(L.active, "Listing not active");
        require(L.seller == msg.sender, "Only seller can cancel");
        L.active = false;
        emit ListingCancelled(id);
    }

    function buy(uint256 id, uint256 amount) external payable {
        Listing storage L = listings[id];
        require(L.active, "Listing not active");
        require(amount > 0 && amount <= L.amount, "Invalid amount");

        uint256 cost = amount * L.pricePerUnit;
        require(msg.value == cost, "Incorrect ETH sent");
        require(token.allowance(L.seller, address(this)) >= amount, "Seller approval revoked");

        // Effects before external calls (checks-effects-interactions)
        L.amount -= amount;
        if (L.amount == 0) {
            L.active = false;
        }

        require(token.transferFrom(L.seller, msg.sender, amount), "Token transfer failed");

        (bool ok, ) = payable(L.seller).call{value: cost}("");
        require(ok, "Payment to seller failed");

        emit Purchased(id, msg.sender, amount);
    }
}
