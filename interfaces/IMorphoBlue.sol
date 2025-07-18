// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IMorphoBlue - Complete Morpho Blue Interface
 * @dev This interface includes all functions needed for RWA lending integration
 */
interface IMorphoBlue {
    // ============ STRUCTS ============
    
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    struct Position {
        uint256 supplyShares;
        uint128 borrowShares;
        uint128 collateral;
    }

    struct Market {
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint128 lastUpdate;
        uint128 fee;
    }

    struct Authorization {
        address authorizer;
        address authorized;
        bool isAuthorized;
        uint256 nonce;
        uint256 deadline;
    }

    // ============ EVENTS ============

    event CreateMarket(bytes32 indexed id, MarketParams marketParams);
    
    event Supply(
        bytes32 indexed id,
        address indexed supplier,
        address indexed onBehalf,
        uint256 assets,
        uint256 shares
    );
    
    event Withdraw(
        bytes32 indexed id,
        address indexed supplier,
        address indexed onBehalf,
        address indexed receiver,
        uint256 assets,
        uint256 shares
    );
    
    event Borrow(
        bytes32 indexed id,
        address indexed borrower,
        address indexed onBehalf,
        address indexed receiver,
        uint256 assets,
        uint256 shares
    );
    
    event Repay(
        bytes32 indexed id,
        address indexed repayer,
        address indexed onBehalf,
        uint256 assets,
        uint256 shares
    );
    
    event SupplyCollateral(
        bytes32 indexed id,
        address indexed supplier,
        address indexed onBehalf,
        uint256 assets
    );
    
    event WithdrawCollateral(
        bytes32 indexed id,
        address indexed supplier,
        address indexed onBehalf,
        address indexed receiver,
        uint256 assets
    );
    
    event Liquidate(
        bytes32 indexed id,
        address indexed liquidator,
        address indexed borrower,
        uint256 repaidAssets,
        uint256 repaidShares,
        uint256 seizedAssets,
        uint256 badDebtAssets,
        uint256 badDebtShares
    );
    
    event FlashLoan(
        address indexed caller,
        address indexed token,
        uint256 assets
    );
    
    event SetAuthorization(
        address indexed authorizer,
        address indexed authorized,
        bool isAuthorized
    );
    
    event IncrementNonce(address indexed authorizer, uint256 usedNonce);
    
    event SetFee(bytes32 indexed id, uint256 newFee);
    
    event SetFeeRecipient(address indexed newFeeRecipient);

    // ============ ERRORS ============

    error ErrorsLib__AlreadySet();
    error ErrorsLib__AuthorizerNotSender();
    error ErrorsLib__BorrowExceedsMaxBorrowShares();
    error ErrorsLib__DeadlineExceeded();
    error ErrorsLib__InconsistentInput();
    error ErrorsLib__InsufficientCollateral();
    error ErrorsLib__InsufficientLiquidity();
    error ErrorsLib__InvalidAuthorization();
    error ErrorsLib__InvalidMarketParams();
    error ErrorsLib__InvalidNonce();
    error ErrorsLib__InvalidSignature();
    error ErrorsLib__MarketNotCreated();
    error ErrorsLib__MaxFeeExceeded();
    error ErrorsLib__NotHealthy();
    error ErrorsLib__NotLiquidatable();
    error ErrorsLib__RepayExceedsMaxRepayShares();
    error ErrorsLib__UnauthorizedWithdraw();
    error ErrorsLib__WithdrawExceedsMaxWithdrawShares();
    error ErrorsLib__ZeroAddress();
    error ErrorsLib__ZeroShares();

    // ============ MAIN FUNCTIONS ============

    /**
     * @notice Creates a new market
     * @param marketParams The market parameters
     * @return id The market ID
     */
    function createMarket(MarketParams calldata marketParams) external returns (bytes32 id);

    /**
     * @notice Supplies assets to a market
     * @param marketParams The market parameters
     * @param assets The amount of assets to supply
     * @param shares The amount of shares to mint
     * @param onBehalf The address to supply on behalf of
     * @param data Additional data for callbacks
     * @return assetsSupplied The actual amount of assets supplied
     * @return sharesSupplied The actual amount of shares minted
     */
    function supply(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    /**
     * @notice Withdraws assets from a market
     * @param marketParams The market parameters
     * @param assets The amount of assets to withdraw
     * @param shares The amount of shares to burn
     * @param onBehalf The address to withdraw on behalf of
     * @param receiver The address to receive the assets
     * @return assetsWithdrawn The actual amount of assets withdrawn
     * @return sharesWithdrawn The actual amount of shares burned
     */
    function withdraw(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /**
     * @notice Borrows assets from a market
     * @param marketParams The market parameters
     * @param assets The amount of assets to borrow
     * @param shares The amount of shares to mint
     * @param onBehalf The address to borrow on behalf of
     * @param receiver The address to receive the assets
     * @return assetsBorrowed The actual amount of assets borrowed
     * @return sharesBorrowed The actual amount of shares minted
     */
    function borrow(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);

    /**
     * @notice Repays assets to a market
     * @param marketParams The market parameters
     * @param assets The amount of assets to repay
     * @param shares The amount of shares to burn
     * @param onBehalf The address to repay on behalf of
     * @param data Additional data for callbacks
     * @return assetsRepaid The actual amount of assets repaid
     * @return sharesRepaid The actual amount of shares burned
     */
    function repay(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

    /**
     * @notice Supplies collateral to a market
     * @param marketParams The market parameters
     * @param assets The amount of collateral to supply
     * @param onBehalf The address to supply on behalf of
     * @param data Additional data for callbacks
     */
    function supplyCollateral(
        MarketParams calldata marketParams,
        uint256 assets,
        address onBehalf,
        bytes calldata data
    ) external;

    /**
     * @notice Withdraws collateral from a market
     * @param marketParams The market parameters
     * @param assets The amount of collateral to withdraw
     * @param onBehalf The address to withdraw on behalf of
     * @param receiver The address to receive the collateral
     */
    function withdrawCollateral(
        MarketParams calldata marketParams,
        uint256 assets,
        address onBehalf,
        address receiver
    ) external;

    /**
     * @notice Liquidates a position
     * @param marketParams The market parameters
     * @param borrower The address of the borrower
     * @param seizedAssets The amount of collateral to seize
     * @param repaidShares The amount of debt shares to repay
     * @param data Additional data for callbacks
     * @return assetsRepaid The actual amount of assets repaid
     * @return assetsSeized The actual amount of assets seized
     */
    function liquidate(
        MarketParams calldata marketParams,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        bytes calldata data
    ) external returns (uint256 assetsRepaid, uint256 assetsSeized);

    /**
     * @notice Executes a flash loan
     * @param token The token to flash loan
     * @param assets The amount of assets to flash loan
     * @param data Additional data for callbacks
     */
    function flashLoan(address token, uint256 assets, bytes calldata data) external;

    /**
     * @notice Sets authorization for an address
     * @param authorized The address to authorize
     * @param isAuthorized Whether to authorize or deauthorize
     */
    function setAuthorization(address authorized, bool isAuthorized) external;

    /**
     * @notice Sets authorization via signature
     * @param authorization The authorization struct
     * @param signature The signature
     */
    function setAuthorizationWithSig(
        Authorization calldata authorization,
        bytes calldata signature
    ) external;

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Returns the market parameters for a given ID
     * @param id The market ID
     * @return marketParams The market parameters
     */
    function idToMarketParams(bytes32 id) external view returns (MarketParams memory marketParams);

    /**
     * @notice Returns the market for a given ID
     * @param id The market ID
     * @return market The market
     */
    function market(bytes32 id) external view returns (Market memory market);

    /**
     * @notice Returns the position for a given market and user
     * @param id The market ID
     * @param user The user address
     * @return position The position
     */
    function position(bytes32 id, address user) external view returns (Position memory position);

    /**
     * @notice Returns whether an address is authorized by another
     * @param authorizer The authorizer address
     * @param authorized The authorized address
     * @return isAuthorized Whether the address is authorized
     */
    function isAuthorized(address authorizer, address authorized) external view returns (bool isAuthorized);

    /**
     * @notice Returns the nonce for an address
     * @param authorizer The authorizer address
     * @return nonce The nonce
     */
    function nonce(address authorizer) external view returns (uint256 nonce);

    /**
     * @notice Returns the fee recipient
     * @return feeRecipient The fee recipient address
     */
    function feeRecipient() external view returns (address feeRecipient);

    /**
     * @notice Returns the owner
     * @return owner The owner address
     */
    function owner() external view returns (address owner);

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Accrues interest for a market
     * @param marketParams The market parameters
     */
    function accrueInterest(MarketParams calldata marketParams) external;

    /**
     * @notice Returns the total supply assets for a market
     * @param marketParams The market parameters
     * @return totalSupplyAssets The total supply assets
     */
    function totalSupplyAssets(MarketParams calldata marketParams) external view returns (uint256 totalSupplyAssets);

    /**
     * @notice Returns the total borrow assets for a market
     * @param marketParams The market parameters
     * @return totalBorrowAssets The total borrow assets
     */
    function totalBorrowAssets(MarketParams calldata marketParams) external view returns (uint256 totalBorrowAssets);

    /**
     * @notice Returns the expected supply assets for a user
     * @param marketParams The market parameters
     * @param user The user address
     * @return expectedSupplyAssets The expected supply assets
     */
    function expectedSupplyAssets(MarketParams calldata marketParams, address user) external view returns (uint256 expectedSupplyAssets);

    /**
     * @notice Returns the expected borrow assets for a user
     * @param marketParams The market parameters
     * @param user The user address
     * @return expectedBorrowAssets The expected borrow assets
     */
    function expectedBorrowAssets(MarketParams calldata marketParams, address user) external view returns (uint256 expectedBorrowAssets);

    /**
     * @notice Returns the health factor for a position
     * @param marketParams The market parameters
     * @param user The user address
     * @return healthFactor The health factor (1e18 = 100%)
     */
    function healthFactor(MarketParams calldata marketParams, address user) external view returns (uint256 healthFactor);

    /**
     * @notice Returns whether a position is healthy
     * @param marketParams The market parameters
     * @param user The user address
     * @return isHealthy Whether the position is healthy
     */
    function isHealthy(MarketParams calldata marketParams, address user) external view returns (bool isHealthy);

    /**
     * @notice Returns the current loan-to-value ratio
     * @param marketParams The market parameters
     * @param user The user address
     * @return ltv The loan-to-value ratio (1e18 = 100%)
     */
    function userLtv(MarketParams calldata marketParams, address user) external view returns (uint256 ltv);

    /**
     * @notice Returns the liquidation incentive factor
     * @param marketParams The market parameters
     * @return liquidationIncentiveFactor The liquidation incentive factor
     */
    function liquidationIncentiveFactor(MarketParams calldata marketParams) external view returns (uint256 liquidationIncentiveFactor);

    /**
     * @notice Converts shares to assets for supply
     * @param marketParams The market parameters
     * @param shares The amount of shares
     * @return assets The equivalent amount of assets
     */
    function toSupplyAssets(MarketParams calldata marketParams, uint256 shares) external view returns (uint256 assets);

    /**
     * @notice Converts assets to shares for supply
     * @param marketParams The market parameters
     * @param assets The amount of assets
     * @return shares The equivalent amount of shares
     */
    function toSupplyShares(MarketParams calldata marketParams, uint256 assets) external view returns (uint256 shares);

    /**
     * @notice Converts shares to assets for borrow
     * @param marketParams The market parameters
     * @param shares The amount of shares
     * @return assets The equivalent amount of assets
     */
    function toBorrowAssets(MarketParams calldata marketParams, uint256 shares) external view returns (uint256 assets);

    /**
     * @notice Converts assets to shares for borrow
     * @param marketParams The market parameters
     * @param assets The amount of assets
     * @return shares The equivalent amount of shares
     */
    function toBorrowShares(MarketParams calldata marketParams, uint256 assets) external view returns (uint256 shares);

    // ============ CONSTANTS ============

    /**
     * @notice The domain separator for signatures
     * @return domainSeparator The domain separator
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32 domainSeparator);

    /**
     * @notice The maximum fee (in basis points)
     * @return maxFee The maximum fee
     */
    function MAX_FEE() external view returns (uint256 maxFee);

    /**
     * @notice The liquidation cursor (liquidation incentive factor)
     * @return liquidationCursor The liquidation cursor
     */
    function LIQUIDATION_CURSOR() external view returns (uint256 liquidationCursor);

    // ============ MULTICALL SUPPORT ============

    /**
     * @notice Executes multiple calls in a single transaction
     * @param data Array of encoded function calls
     * @return results Array of results from each call
     */
    function multicall(bytes[] calldata data) external returns (bytes[] memory results);
}

/**
 * @title IOracle - Oracle interface for Morpho markets
 */
interface IOracle {
    /**
     * @notice Returns the price of the base asset in terms of the quote asset
     * @return price The price (scaled by 1e36 / (10^baseDecimals * 10^quoteDecimals))
     */
    function price() external view returns (uint256 price);

    /**
     * @notice Returns the price of the base asset in terms of the quote asset
     * @param baseToken The base token address
     * @param quoteToken The quote token address
     * @return price The price
     */
    function price(address baseToken, address quoteToken) external view returns (uint256 price);
}

/**
 * @title IIrm - Interest Rate Model interface
 */
interface IIrm {
    /**
     * @notice Returns the borrow rate for a market
     * @param marketParams The market parameters
     * @param market The market state
     * @return borrowRate The borrow rate per second (scaled by 1e18)
     */
    function borrowRate(
        MarketParams calldata marketParams,
        Market calldata market
    ) external view returns (uint256 borrowRate);

    /**
     * @notice Returns the borrow rate view for a market
     * @param marketParams The market parameters
     * @param market The market state
     * @return borrowRate The borrow rate per second (scaled by 1e18)
     */
    function borrowRateView(
        MarketParams calldata marketParams,
        Market calldata market
    ) external view returns (uint256 borrowRate);
}

/**
 * @title IMetaMorpho - MetaMorpho vault interface
 */
interface IMetaMorpho {
    /**
     * @notice Deposits assets into the vault
     * @param assets The amount of assets to deposit
     * @param receiver The address to receive the shares
     * @return shares The amount of shares minted
     */
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);

    /**
     * @notice Withdraws assets from the vault
     * @param assets The amount of assets to withdraw
     * @param receiver The address to receive the assets
     * @param owner The owner of the shares
     * @return shares The amount of shares burned
     */
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);

    /**
     * @notice Redeems shares for assets
     * @param shares The amount of shares to redeem
     * @param receiver The address to receive the assets
     * @param owner The owner of the shares
     * @return assets The amount of assets received
     */
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);

    /**
     * @notice Returns the total assets in the vault
     * @return totalAssets The total assets
     */
    function totalAssets() external view returns (uint256 totalAssets);

    /**
     * @notice Returns the asset token address
     * @return asset The asset token address
     */
    function asset() external view returns (address asset);

    /**
     * @notice Returns the balance of shares for an address
     * @param account The account address
     * @return balance The balance of shares
     */
    function balanceOf(address account) external view returns (uint256 balance);

    /**
     * @notice Returns the total supply of shares
     * @return totalSupply The total supply of shares
     */
    function totalSupply() external view returns (uint256 totalSupply);

    /**
     * @notice Converts assets to shares
     * @param assets The amount of assets
     * @return shares The equivalent amount of shares
     */
    function convertToShares(uint256 assets) external view returns (uint256 shares);

    /**
     * @notice Converts shares to assets
     * @param shares The amount of shares
     * @return assets The equivalent amount of assets
     */
    function convertToAssets(uint256 shares) external view returns (uint256 assets);

    /**
     * @notice Returns the maximum deposit amount
     * @param receiver The receiver address
     * @return maxAssets The maximum deposit amount
     */
    function maxDeposit(address receiver) external view returns (uint256 maxAssets);

    /**
     * @notice Returns the maximum withdrawal amount
     * @param owner The owner address
     * @return maxAssets The maximum withdrawal amount
     */
    function maxWithdraw(address owner) external view returns (uint256 maxAssets);

    /**
     * @notice Returns the maximum redeem amount
     * @param owner The owner address
     * @return maxShares The maximum redeem amount
     */
    function maxRedeem(address owner) external view returns (uint256 maxShares);

    /**
     * @notice Returns the maximum mint amount
     * @param receiver The receiver address
     * @return maxShares The maximum mint amount
     */
    function maxMint(address receiver) external view returns (uint256 maxShares);

    /**
     * @notice Previews the deposit
     * @param assets The amount of assets
     * @return shares The amount of shares
     */
    function previewDeposit(uint256 assets) external view returns (uint256 shares);

    /**
     * @notice Previews the withdrawal
     * @param assets The amount of assets
     * @return shares The amount of shares
     */
    function previewWithdraw(uint256 assets) external view returns (uint256 shares);

    /**
     * @notice Previews the redeem
     * @param shares The amount of shares
     * @return assets The amount of assets
     */
    function previewRedeem(uint256 shares) external view returns (uint256 assets);

    /**
     * @notice Previews the mint
     * @param shares The amount of shares
     * @return assets The amount of assets
     */
    function previewMint(uint256 shares) external view returns (uint256 assets);
}