// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * GUACA (GCA) — Growth participation token for the FIDELIO network.
 * Supply cap: 3,000,000 GCA
 * Merchants earn GCA through vesting (CATR volume milestones).
 * GCA trades freely — no transfer tax.
 * Redemption: bridge burns GCA when admin approves a redemption request.
 */
contract GCAToken is ERC20Capped, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public constant MAX_SUPPLY = 3_000_000 * 10 ** 18;

    // Distribution allocations (informational — enforced by cap)
    uint256 public constant MERCHANT_ALLOCATION   = 1_200_000 * 10 ** 18; // 40% — minted on demand
    uint256 public constant INVESTOR_ALLOCATION   =   900_000 * 10 ** 18; // 30%
    uint256 public constant FOUNDER_ALLOCATION    =   300_000 * 10 ** 18; // 10%
    uint256 public constant TEAM_ALLOCATION       =   300_000 * 10 ** 18; // 10%
    uint256 public constant ECOSYSTEM_ALLOCATION  =   300_000 * 10 ** 18; // 10%

    constructor(
        address _founder,
        address _treasury,
        address _admin,
        address _minter,
        address _burner
    ) ERC20("GUACA", "GCA") ERC20Capped(MAX_SUPPLY) {
        require(_founder  != address(0), "Founder is zero address");
        require(_treasury != address(0), "Treasury is zero address");
        require(_admin    != address(0), "Admin is zero address");
        require(_minter   != address(0), "Minter is zero address");
        require(_burner   != address(0), "Burner is zero address");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _minter);
        _grantRole(BURNER_ROLE, _burner);

        // Mint initial allocations at deploy (merchant allocation minted on demand)
        _mint(_founder,  FOUNDER_ALLOCATION);    // 300,000 GCA — Cristian
        _mint(_treasury, INVESTOR_ALLOCATION);   // 900,000 GCA — investor pool
        _mint(_treasury, TEAM_ALLOCATION);       // 300,000 GCA — future team
        _mint(_treasury, ECOSYSTEM_ALLOCATION);  // 300,000 GCA — ecosystem reserve
    }

    /// @notice Mint GCA to a recipient (welcome gift or vesting milestone).
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Burn GCA from an address (redemption approval).
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
}
