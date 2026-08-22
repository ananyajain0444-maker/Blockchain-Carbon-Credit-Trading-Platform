// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CarbonCredit
/// @notice Educational / portfolio project. Issues, transfers, and retires SIMULATED
///         carbon credit tokens. This contract does NOT create legally recognized or
///         officially verified carbon credits — see README "Disclaimer" section.
contract CarbonCredit is ERC20, AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    struct Project {
        bytes32 projectId;       // keccak256(name|region|dev)
        address developer;
        string methodology;      // e.g. simulated VCS-style methodology id
        string region;           // ISO region/country
        string uri;              // ipfs://... metadata JSON
        bool isActive;
    }

    struct IssuanceBatch {
        bytes32 batchId;
        bytes32 projectId;
        uint256 amount;          // tokens issued (1 token = 1 simulated tCO2e)
        uint16 vintage;          // e.g. 2026
        address verifier;
        string docsURI;          // simulated audit docs on IPFS
        uint256 timestamp;
    }

    struct Retirement {
        uint256 retireId;
        address owner;
        uint256 amount;
        string reason;           // "offset flight", "corporate net-zero", etc.
        string referenceInfo;     // invoice/claim URL or IPFS reference
        uint256 timestamp;
    }

    uint8 private immutable _decimals;

    mapping(bytes32 => Project) public projects;
    mapping(bytes32 => IssuanceBatch) public batches;
    mapping(uint256 => Retirement) public retirements;

    uint256 public nextRetireId;
    uint256 public retiredSupply; // total burned/retired to date

    event ProjectRegistered(bytes32 indexed projectId, address indexed developer);
    event ProjectStatus(bytes32 indexed projectId, bool isActive);
    event BatchIssued(bytes32 indexed batchId, bytes32 indexed projectId, uint256 amount, uint16 vintage, address verifier);
    event Retired(uint256 indexed retireId, address indexed owner, uint256 amount, string reason);

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // --- Admin: Verifier management -----------------------------------------------
    function setVerifier(address account, bool allowed) external onlyRole(ADMIN_ROLE) {
        if (allowed) {
            _grantRole(VERIFIER_ROLE, account);
        } else {
            _revokeRole(VERIFIER_ROLE, account);
        }
    }

    // --- Project lifecycle ----------------------------------------------------------
    function registerProject(
        bytes32 projectId,
        address developer,
        string calldata methodology,
        string calldata region,
        string calldata uri
    ) external onlyRole(ADMIN_ROLE) {
        require(projects[projectId].projectId == bytes32(0), "Project exists");
        require(developer != address(0), "Invalid developer address");
        projects[projectId] = Project(projectId, developer, methodology, region, uri, true);
        emit ProjectRegistered(projectId, developer);
    }

    function setProjectActive(bytes32 projectId, bool on) external onlyRole(ADMIN_ROLE) {
        require(projects[projectId].projectId != bytes32(0), "No project");
        projects[projectId].isActive = on;
        emit ProjectStatus(projectId, on);
    }

    // --- Issuance (mint) -------------------------------------------------------------
    /// @notice Only an authorized VERIFIER can mint simulated credits for an active project.
    function issueBatch(
        bytes32 batchId,
        bytes32 projectId,
        uint256 amount,
        uint16 vintage,
        string calldata docsURI,
        address to
    ) external onlyRole(VERIFIER_ROLE) {
        require(projects[projectId].isActive, "Inactive project");
        require(batches[batchId].batchId == bytes32(0), "Batch exists");
        require(amount > 0, "Amount must be > 0");
        require(to != address(0), "Invalid recipient");

        batches[batchId] = IssuanceBatch(batchId, projectId, amount, vintage, msg.sender, docsURI, block.timestamp);
        _mint(to, amount);
        emit BatchIssued(batchId, projectId, amount, vintage, msg.sender);
    }

    // --- Retirement (burn) ------------------------------------------------------------
    /// @notice Permanently retires (burns) credits from the caller's own balance.
    ///         Retirement is irreversible — retired tokens cannot re-enter circulation.
    function retire(uint256 amount, string calldata reason, string calldata referenceInfo) external {
        require(amount > 0, "Amount must be > 0");
        _burn(msg.sender, amount);
        retiredSupply += amount;
        uint256 id = ++nextRetireId;
        retirements[id] = Retirement(id, msg.sender, amount, reason, referenceInfo, block.timestamp);
        emit Retired(id, msg.sender, amount, reason);
    }

    // --- Views --------------------------------------------------------------------------
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }
}
