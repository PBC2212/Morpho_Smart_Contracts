// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockRWAToken
 * @dev Simple ERC20 token for testing RWA Liquidity Hub
 * Allows anyone to mint tokens for testing purposes
 */
contract MockRWAToken is ERC20, Ownable {
    uint8 private _decimals;
    string private _tokenType;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        string memory tokenType_,
        address initialOwner
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        _tokenType = tokenType_;
        
        // Transfer ownership to initialOwner
        _transferOwnership(initialOwner);
        
        // Mint initial supply to owner
        _mint(initialOwner, 1000000 * (10 ** decimals_));
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function tokenType() public view returns (string memory) {
        return _tokenType;
    }
    
    /**
     * @dev Mint tokens for testing (anyone can call this for demo purposes)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev Mint tokens to caller for testing
     */
    function mintToSelf(uint256 amount) external {
        _mint(msg.sender, amount);
    }
    
    /**
     * @dev Get test tokens (1000 tokens)
     */
    function getTestTokens() external {
        _mint(msg.sender, 1000 * (10 ** _decimals));
    }
}