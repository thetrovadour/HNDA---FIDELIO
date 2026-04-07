// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CATRToken is ERC20Capped, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    address public immutable treasury;
    address public immutable rewardPool;

    constructor(
        address _treasury,
        address _rewardPool,
        address _admin,
        address _minter,
        address _burner
    ) ERC20("CATR Token", "CATR") ERC20Capped(50_000_000 * 10 ** 18) {
        require(_treasury != address(0), "Treasury is zero address");
        require(_rewardPool != address(0), "RewardPool is zero address");
        require(_admin != address(0), "Admin is zero address");
        require(_minter != address(0), "Minter is zero address");
        require(_burner != address(0), "Burner is zero address");

        treasury = _treasury;
        rewardPool = _rewardPool;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _minter);
        _grantRole(BURNER_ROLE, _burner);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Capped) {
        // Mint or burn: no commission
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        // Regular transfer: deduct 0.63% commission
        uint256 commission = (amount * 63) / 10000;
        uint256 toTreasury = (commission * 75) / 100;
        uint256 toRewardPool = commission - toTreasury;
        uint256 toRecipient = amount - commission;

        super._update(from, to, toRecipient);
        super._update(from, treasury, toTreasury);
        super._update(from, rewardPool, toRewardPool);
    }
}
