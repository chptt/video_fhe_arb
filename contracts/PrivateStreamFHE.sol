// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PrivateStreamFHE
 * @notice Privacy-preserving encrypted video access platform on Arbitrum Sepolia.
 * @dev FHE-inspired architecture — designed for future Fhenix/Zama migration.
 */
contract PrivateStreamFHE {

    struct Campaign {
        uint256 id;
        address creator;
        string  metadataCID;
        uint256 priceWei;
        uint256 durationSeconds;
        uint256 totalRevenueWei;
        bool    active;
        bool    soldOut;
    }

    address public immutable platformTreasury;
    uint256 public immutable platformFeeBps;
    uint256 public immutable revenueCapWei;
    uint256 private _nextId;

    mapping(uint256 => Campaign)                    public campaigns;
    mapping(address => bool)                        public hasCampaign;
    mapping(address => uint256)                     public creatorCampaignId;
    mapping(uint256 => mapping(address => uint256)) public accessExpiry;

    event CampaignCreated(uint256 indexed id, address indexed creator, string cid, uint256 price, uint256 duration);
    event AccessPurchased(uint256 indexed id, address indexed buyer, uint256 amount, uint256 expiresAt);
    event RevenueCapReached(uint256 indexed id, uint256 total);
    event CampaignDeactivated(uint256 indexed id);

    constructor(address _treasury, uint256 _feeBps, uint256 _revenueCapWei) {
        require(_treasury != address(0), "Bad treasury");
        require(_feeBps <= 5000, "Fee too high");
        platformTreasury = _treasury;
        platformFeeBps   = _feeBps;
        revenueCapWei    = _revenueCapWei;
        _nextId          = 1;
    }

    function createCampaign(
        string calldata metadataCID,
        uint256 priceWei,
        uint256 durationSeconds
    ) external returns (uint256 id) {
        require(!hasCampaign[msg.sender], "Already own a campaign");
        require(bytes(metadataCID).length > 0, "Empty CID");
        require(priceWei > 0, "Price must be > 0");
        require(durationSeconds > 0, "Duration must be > 0");

        id = _nextId++;
        campaigns[id] = Campaign(id, msg.sender, metadataCID, priceWei, durationSeconds, 0, true, false);
        hasCampaign[msg.sender]       = true;
        creatorCampaignId[msg.sender] = id;

        emit CampaignCreated(id, msg.sender, metadataCID, priceWei, durationSeconds);
    }

    function purchaseAccess(uint256 id) external payable {
        Campaign storage c = campaigns[id];
        require(c.id != 0,              "Not found");
        require(c.active,               "Not active");
        require(!c.soldOut,             "Sold out");
        require(msg.value >= c.priceWei,"Insufficient payment");

        uint256 payment = c.priceWei;
        if (msg.value > payment) payable(msg.sender).transfer(msg.value - payment);

        uint256 fee     = (payment * platformFeeBps) / 10000;
        uint256 creator = payment - fee;
        payable(c.creator).transfer(creator);
        payable(platformTreasury).transfer(fee);

        uint256 exp = block.timestamp + c.durationSeconds;
        if (accessExpiry[id][msg.sender] > block.timestamp)
            exp = accessExpiry[id][msg.sender] + c.durationSeconds;
        accessExpiry[id][msg.sender] = exp;

        c.totalRevenueWei += payment;
        emit AccessPurchased(id, msg.sender, payment, exp);

        if (c.totalRevenueWei >= revenueCapWei) {
            c.soldOut = true;
            c.active  = false;
            emit RevenueCapReached(id, c.totalRevenueWei);
        }
    }

    function getCampaign(uint256 id) external view returns (Campaign memory) {
        require(campaigns[id].id != 0, "Not found");
        return campaigns[id];
    }

    function hasAccess(uint256 id, address buyer) external view returns (bool valid, uint256 expiresAt) {
        expiresAt = accessExpiry[id][buyer];
        valid     = expiresAt > block.timestamp;
    }

    function getCampaignByCreator(address creator) external view returns (uint256) {
        return creatorCampaignId[creator];
    }

    function totalCampaigns() external view returns (uint256) {
        return _nextId - 1;
    }

    function deactivateCampaign(uint256 id) external {
        Campaign storage c = campaigns[id];
        require(c.creator == msg.sender, "Not owner");
        require(c.active, "Already inactive");
        c.active = false;
        emit CampaignDeactivated(id);
    }
}
