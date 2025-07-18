// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title RWAOracle - Multi-source Oracle for Real World Assets
 * @dev This oracle provides price feeds for RWA tokens using multiple sources
 * 
 * Features:
 * - Multiple oracle sources for redundancy
 * - Chainlink integration for traditional assets
 * - Manual price setting for illiquid RWA tokens
 * - Circuit breakers for abnormal price movements
 * - Time-weighted average pricing (TWAP)
 * - Emergency pause functionality
 */
contract RWAOracle is Ownable, ReentrancyGuard {
    
    // ============ STRUCTS ============
    
    struct PriceData {
        uint256 price;           // Price in USD (8 decimals)
        uint256 timestamp;       // Last update timestamp
        uint256 confidence;      // Confidence score (0-100)
        address source;          // Source of the price
        bool isValid;           // Whether the price is valid
    }
    
    struct OracleConfig {
        address chainlinkFeed;   // Chainlink price feed address
        address backupFeed;      // Backup oracle feed
        uint256 maxPriceAge;     // Maximum age of price data (seconds)
        uint256 priceDeviation;  // Maximum allowed price deviation (basis points)
        uint8 decimals;          // Token decimals
        bool isActive;           // Whether the oracle is active
        bool requiresManualUpdate; // Whether manual updates are required
    }
    
    struct TWAPData {
        uint256 cumulativePrice;
        uint256 lastUpdate;
        uint256 windowSize;      // TWAP window size in seconds
        uint256 currentTWAP;
    }
    
    // ============ CONSTANTS ============
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_PRICE_DEVIATION = 5000;  // 50% max deviation
    uint256 public constant MIN_CONFIDENCE = 50;         // Minimum confidence score
    uint256 public constant DEFAULT_TWAP_WINDOW = 3600;  // 1 hour TWAP
    uint256 public constant PRICE_SCALE = 1e8;           // 8 decimal places
    uint256 public constant MAX_PRICE_AGE = 86400;       // 24 hours max price age
    
    // ============ STATE VARIABLES ============
    
    mapping(address => OracleConfig) public oracleConfigs;
    mapping(address => PriceData) public currentPrices;
    mapping(address => PriceData[]) public priceHistory;
    mapping(address => TWAPData) public twapData;
    mapping(address => bool) public authorizedUpdaters;
    
    address[] public supportedTokens;
    
    bool public emergencyPaused;
    address public emergencyAdmin;
    uint256 public globalPriceUpdateInterval;
    
    // ============ EVENTS ============
    
    event PriceUpdated(
        address indexed token,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 confidence,
        address source
    );
    
    event OracleConfigured(
        address indexed token,
        address chainlinkFeed,
        address backupFeed,
        uint256 maxPriceAge
    );
    
    event EmergencyPaused(bool paused);
    
    event AuthorizedUpdaterSet(address indexed updater, bool authorized);
    
    event PriceDeviationAlert(
        address indexed token,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 deviation
    );
    
    event TWAPUpdated(
        address indexed token,
        uint256 twapPrice,
        uint256 windowSize
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    modifier whenNotPaused() {
        require(!emergencyPaused, "Emergency paused");
        _;
    }
    
    modifier validToken(address token) {
        require(oracleConfigs[token].isActive, "Token not supported");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _emergencyAdmin) {
        require(_emergencyAdmin != address(0), "Invalid emergency admin");
        emergencyAdmin = _emergencyAdmin;
        globalPriceUpdateInterval = 300; // 5 minutes
    }
    
    // ============ MAIN ORACLE FUNCTIONS ============
    
    /**
     * @notice Get the current price for a token
     * @param token The token address
     * @return price The current price (8 decimals)
     */
    function getPrice(address token) external view whenNotPaused validToken(token) returns (uint256 price) {
        PriceData memory priceData = currentPrices[token];
        OracleConfig memory config = oracleConfigs[token];
        
        require(priceData.isValid, "No valid price");
        require(block.timestamp - priceData.timestamp <= config.maxPriceAge, "Price too old");
        require(priceData.confidence >= MIN_CONFIDENCE, "Price confidence too low");
        
        return priceData.price;
    }
    
    /**
     * @notice Get the TWAP price for a token
     * @param token The token address
     * @return twapPrice The time-weighted average price
     */
    function getTWAPPrice(address token) external view whenNotPaused validToken(token) returns (uint256 twapPrice) {
        TWAPData memory twap = twapData[token];
        require(twap.currentTWAP > 0, "No TWAP data");
        return twap.currentTWAP;
    }
    
    /**
     * @notice Get price with additional metadata
     * @param token The token address
     * @return price The current price
     * @return timestamp The last update timestamp
     * @return confidence The confidence score
     */
    function getPriceWithMetadata(address token) external view whenNotPaused validToken(token) returns (
        uint256 price,
        uint256 timestamp,
        uint256 confidence
    ) {
        PriceData memory priceData = currentPrices[token];
        require(priceData.isValid, "No valid price");
        
        return (priceData.price, priceData.timestamp, priceData.confidence);
    }
    
    /**
     * @notice Update price from Chainlink feed
     * @param token The token address
     */
    function updatePriceFromChainlink(address token) external whenNotPaused validToken(token) {
        OracleConfig memory config = oracleConfigs[token];
        require(config.chainlinkFeed != address(0), "No Chainlink feed");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(config.chainlinkFeed);
        
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(price > 0, "Invalid price from Chainlink");
        require(updatedAt > 0, "Invalid timestamp");
        require(block.timestamp - updatedAt <= config.maxPriceAge, "Chainlink price too old");
        require(answeredInRound >= roundId, "Incomplete round");
        
        uint256 newPrice = uint256(price);
        
        // Check for price deviation
        if (currentPrices[token].isValid) {
            _checkPriceDeviation(token, newPrice);
        }
        
        // Update price
        _updatePrice(token, newPrice, 95, config.chainlinkFeed); // 95% confidence for Chainlink
        
        // Update TWAP
        _updateTWAP(token, newPrice);
    }
    
    /**
     * @notice Manual price update for illiquid RWA tokens
     * @param token The token address
     * @param price The new price (8 decimals)
     * @param confidence The confidence score (0-100)
     */
    function updatePriceManually(
        address token,
        uint256 price,
        uint256 confidence
    ) external onlyAuthorized whenNotPaused validToken(token) {
        OracleConfig memory config = oracleConfigs[token];
        require(config.requiresManualUpdate, "Manual updates not allowed");
        require(price > 0, "Invalid price");
        require(confidence >= MIN_CONFIDENCE && confidence <= 100, "Invalid confidence");
        
        // Check for price deviation
        if (currentPrices[token].isValid) {
            _checkPriceDeviation(token, price);
        }
        
        // Update price
        _updatePrice(token, price, confidence, msg.sender);
        
        // Update TWAP
        _updateTWAP(token, price);
    }
    
    /**
     * @notice Update price from backup oracle
     * @param token The token address
     */
    function updatePriceFromBackup(address token) external whenNotPaused validToken(token) {
        OracleConfig memory config = oracleConfigs[token];
        require(config.backupFeed != address(0), "No backup feed");
        
        // Try to get price from backup oracle
        try AggregatorV3Interface(config.backupFeed).latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            require(price > 0, "Invalid backup price");
            require(updatedAt > 0, "Invalid backup timestamp");
            require(block.timestamp - updatedAt <= config.maxPriceAge, "Backup price too old");
            
            uint256 newPrice = uint256(price);
            
            // Check for price deviation
            if (currentPrices[token].isValid) {
                _checkPriceDeviation(token, newPrice);
            }
            
            // Update price with lower confidence for backup
            _updatePrice(token, newPrice, 75, config.backupFeed); // 75% confidence for backup
            
            // Update TWAP
            _updateTWAP(token, newPrice);
            
        } catch {
            revert("Backup oracle failed");
        }
    }
    
    /**
     * @notice Batch update prices for multiple tokens
     * @param tokens Array of token addresses
     */
    function batchUpdatePrices(address[] calldata tokens) external whenNotPaused {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (oracleConfigs[tokens[i]].isActive && oracleConfigs[tokens[i]].chainlinkFeed != address(0)) {
                try this.updatePriceFromChainlink(tokens[i]) {
                    // Success
                } catch {
                    // Try backup if primary fails
                    if (oracleConfigs[tokens[i]].backupFeed != address(0)) {
                        try this.updatePriceFromBackup(tokens[i]) {
                            // Success
                        } catch {
                            // Both failed, continue to next token
                        }
                    }
                }
            }
        }
    }
    
    // ============ CONFIGURATION FUNCTIONS ============
    
    /**
     * @notice Configure oracle for a token
     * @param token The token address
     * @param config The oracle configuration
     */
    function configureOracle(
        address token,
        OracleConfig calldata config
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(config.maxPriceAge > 0 && config.maxPriceAge <= MAX_PRICE_AGE, "Invalid max price age");
        require(config.priceDeviation <= MAX_PRICE_DEVIATION, "Invalid price deviation");
        
        // Add to supported tokens if new
        if (!oracleConfigs[token].isActive) {
            supportedTokens.push(token);
        }
        
        oracleConfigs[token] = config;
        
        // Initialize TWAP data
        twapData[token] = TWAPData({
            cumulativePrice: 0,
            lastUpdate: block.timestamp,
            windowSize: config.requiresManualUpdate ? DEFAULT_TWAP_WINDOW * 24 : DEFAULT_TWAP_WINDOW,
            currentTWAP: 0
        });
        
        emit OracleConfigured(token, config.chainlinkFeed, config.backupFeed, config.maxPriceAge);
    }
    
    /**
     * @notice Set authorized updater
     * @param updater The updater address
     * @param authorized Whether to authorize
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        require(updater != address(0), "Invalid updater");
        authorizedUpdaters[updater] = authorized;
        emit AuthorizedUpdaterSet(updater, authorized);
    }
    
    /**
     * @notice Set emergency pause
     * @param paused Whether to pause
     */
    function setEmergencyPause(bool paused) external {
        require(msg.sender == emergencyAdmin || msg.sender == owner(), "Not authorized");
        emergencyPaused = paused;
        emit EmergencyPaused(paused);
    }
    
    /**
     * @notice Set global price update interval
     * @param interval New interval in seconds
     */
    function setGlobalPriceUpdateInterval(uint256 interval) external onlyOwner {
        require(interval >= 60 && interval <= 3600, "Invalid interval"); // 1 minute to 1 hour
        globalPriceUpdateInterval = interval;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get oracle configuration for a token
     * @param token The token address
     * @return config The oracle configuration
     */
    function getOracleConfig(address token) external view returns (OracleConfig memory config) {
        return oracleConfigs[token];
    }
    
    /**
     * @notice Get price history for a token
     * @param token The token address
     * @param limit Maximum number of entries to return
     * @return history Array of price data
     */
    function getPriceHistory(address token, uint256 limit) external view returns (PriceData[] memory history) {
        PriceData[] memory fullHistory = priceHistory[token];
        uint256 length = fullHistory.length;
        
        if (length == 0) {
            return new PriceData[](0);
        }
        
        uint256 returnLength = length > limit ? limit : length;
        history = new PriceData[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            history[i] = fullHistory[length - returnLength + i];
        }
        
        return history;
    }
    
    /**
     * @notice Get all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return supportedTokens;
    }
    
    /**
     * @notice Check if price needs update
     * @param token The token address
     * @return needsUpdate Whether price needs update
     */
    function needsPriceUpdate(address token) external view returns (bool needsUpdate) {
        if (!oracleConfigs[token].isActive) return false;
        
        PriceData memory priceData = currentPrices[token];
        if (!priceData.isValid) return true;
        
        return block.timestamp - priceData.timestamp > globalPriceUpdateInterval;
    }
    
    /**
     * @notice Get health status for all oracles
     * @return healthyCount Number of healthy oracles
     * @return totalCount Total number of oracles
     * @return unhealthyTokens Array of tokens with unhealthy oracles
     */
    function getOracleHealthStatus() external view returns (
        uint256 healthyCount,
        uint256 totalCount,
        address[] memory unhealthyTokens
    ) {
        totalCount = supportedTokens.length;
        address[] memory tempUnhealthy = new address[](totalCount);
        uint256 unhealthyCount = 0;
        
        for (uint256 i = 0; i < totalCount; i++) {
            address token = supportedTokens[i];
            PriceData memory priceData = currentPrices[token];
            OracleConfig memory config = oracleConfigs[token];
            
            bool isHealthy = priceData.isValid && 
                           block.timestamp - priceData.timestamp <= config.maxPriceAge &&
                           priceData.confidence >= MIN_CONFIDENCE;
            
            if (isHealthy) {
                healthyCount++;
            } else {
                tempUnhealthy[unhealthyCount] = token;
                unhealthyCount++;
            }
        }
        
        // Create properly sized array
        unhealthyTokens = new address[](unhealthyCount);
        for (uint256 i = 0; i < unhealthyCount; i++) {
            unhealthyTokens[i] = tempUnhealthy[i];
        }
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Internal function to update price
     * @param token The token address
     * @param price The new price
     * @param confidence The confidence score
     * @param source The price source
     */
    function _updatePrice(address token, uint256 price, uint256 confidence, address source) internal {
        uint256 oldPrice = currentPrices[token].price;
        
        // Update current price
        currentPrices[token] = PriceData({
            price: price,
            timestamp: block.timestamp,
            confidence: confidence,
            source: source,
            isValid: true
        });
        
        // Add to price history
        priceHistory[token].push(currentPrices[token]);
        
        // Limit history size to prevent excessive gas costs
        if (priceHistory[token].length > 100) {
            // Remove oldest entry
            for (uint256 i = 0; i < priceHistory[token].length - 1; i++) {
                priceHistory[token][i] = priceHistory[token][i + 1];
            }
            priceHistory[token].pop();
        }
        
        emit PriceUpdated(token, oldPrice, price, confidence, source);
    }
    
    /**
     * @notice Update TWAP for a token
     * @param token The token address
     * @param price The new price
     */
    function _updateTWAP(address token, uint256 price) internal {
        TWAPData storage twap = twapData[token];
        
        if (twap.lastUpdate == 0) {
            // First update
            twap.cumulativePrice = price;
            twap.lastUpdate = block.timestamp;
            twap.currentTWAP = price;
        } else {
            uint256 timeElapsed = block.timestamp - twap.lastUpdate;
            
            if (timeElapsed > 0) {
                // Update cumulative price
                twap.cumulativePrice += price * timeElapsed;
                
                // Calculate TWAP
                uint256 totalTime = block.timestamp - (twap.lastUpdate - twap.windowSize);
                if (totalTime > twap.windowSize) {
                    totalTime = twap.windowSize;
                }
                
                if (totalTime > 0) {
                    twap.currentTWAP = twap.cumulativePrice / totalTime;
                }
                
                twap.lastUpdate = block.timestamp;
                
                emit TWAPUpdated(token, twap.currentTWAP, twap.windowSize);
            }
        }
    }
    
    /**
     * @notice Check for abnormal price deviation
     * @param token The token address
     * @param newPrice The new price
     */
    function _checkPriceDeviation(address token, uint256 newPrice) internal {
        PriceData memory currentPrice = currentPrices[token];
        OracleConfig memory config = oracleConfigs[token];
        
        if (currentPrice.isValid && currentPrice.price > 0) {
            uint256 deviation;
            
            if (newPrice > currentPrice.price) {
                deviation = ((newPrice - currentPrice.price) * BASIS_POINTS) / currentPrice.price;
            } else {
                deviation = ((currentPrice.price - newPrice) * BASIS_POINTS) / currentPrice.price;
            }
            
            if (deviation > config.priceDeviation) {
                emit PriceDeviationAlert(token, currentPrice.price, newPrice, deviation);
                
                // For very large deviations, consider pausing
                if (deviation > config.priceDeviation * 2) {
                    // Emergency pause could be triggered here
                    // This is a design decision for the specific implementation
                }
            }
        }
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @notice Emergency price override
     * @param token The token address
     * @param price The emergency price
     */
    function emergencyPriceOverride(address token, uint256 price) external {
        require(msg.sender == emergencyAdmin || msg.sender == owner(), "Not authorized");
        require(price > 0, "Invalid price");
        
        _updatePrice(token, price, 50, msg.sender); // Low confidence for emergency override
    }
    
    /**
     * @notice Emergency disable token
     * @param token The token address
     */
    function emergencyDisableToken(address token) external {
        require(msg.sender == emergencyAdmin || msg.sender == owner(), "Not authorized");
        oracleConfigs[token].isActive = false;
        currentPrices[token].isValid = false;
    }
}