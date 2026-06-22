// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IProjectToken {
    function mint(address to, uint256 amount) external;
}

contract Crowdfunding {
    uint256 public constant RATE = 10000; // 1 ETH = 10000 PT
    uint256 public constant EARLY_BIRD_BONUS_PERCENT = 20;

    IProjectToken public immutable token;
    address public immutable owner;
    uint256 public immutable goal;
    uint256 public immutable deadline;
    uint256 public immutable coolingPeriod;
    uint256 public immutable earlyBirdCount;

    uint256 public totalRaised;
    bool public ownerWithdrawn;
    bool public closed;
    uint256 public closedAt;

    address[] public investors;
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public investorIndex; // 1-based; 0 = 未投资
    mapping(address => bool) public claimed;

    event Invested(address indexed investor, uint256 ethAmount, uint256 indexed order);
    event Claimed(address indexed investor, uint256 tokenAmount);
    event Refunded(address indexed investor, uint256 ethAmount);
    event Withdrawn(address indexed owner, uint256 ethAmount);
    event Closed(uint256 closedAt);

    constructor(
        address tokenAddr,
        uint256 _goal,
        uint256 _durationSeconds,
        uint256 _earlyBirdCount,
        uint256 _coolingSeconds
    ) {
        require(tokenAddr != address(0), "token is zero");
        require(_goal > 0, "goal must be > 0");
        require(_durationSeconds > 0, "duration must be > 0");

        token = IProjectToken(tokenAddr);
        owner = msg.sender;
        goal = _goal;
        deadline = block.timestamp + _durationSeconds;
        coolingPeriod = _coolingSeconds;
        earlyBirdCount = _earlyBirdCount;
    }

    function endTime() public view returns (uint256) {
        return closed ? closedAt : deadline;
    }

    function ended() public view returns (bool) {
        return block.timestamp >= endTime();
    }

    function coolingEnd() public view returns (uint256) {
        return endTime() + coolingPeriod;
    }

    function isSuccess() public view returns (bool) {
        return totalRaised >= goal;
    }

    function tokenAmountOf(address user) public view returns (uint256) {
        uint256 base = contributions[user] * RATE;
        uint256 idx = investorIndex[user];
        if (idx != 0 && idx <= earlyBirdCount) {
            base += (base * EARLY_BIRD_BONUS_PERCENT) / 100;
        }
        return base;
    }

    function invest() external payable {
        require(!ended(), "crowdfunding ended");
        require(msg.value > 0, "zero investment");

        if (investorIndex[msg.sender] == 0) {
            investors.push(msg.sender);
            investorIndex[msg.sender] = investors.length;
        }

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Invested(msg.sender, msg.value, investorIndex[msg.sender]);
    }

    function closeEarly() external {
        require(msg.sender == owner, "not owner");
        require(!closed, "already closed");
        require(block.timestamp < deadline, "already ended");

        closed = true;
        closedAt = block.timestamp;

        emit Closed(closedAt);
    }

    function claim() external {
        require(block.timestamp >= coolingEnd(), "cooling period not over");
        require(isSuccess(), "goal not reached");
        require(contributions[msg.sender] > 0, "no contribution");
        require(!claimed[msg.sender], "already claimed");

        claimed[msg.sender] = true;
        uint256 amount = tokenAmountOf(msg.sender);
        token.mint(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    function refund() external {
        require(ended(), "not ended yet");
        require(!claimed[msg.sender], "already claimed");
        require(!isSuccess() || block.timestamp < coolingEnd(), "refund not available");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "nothing to refund");

        contributions[msg.sender] = 0;
        totalRaised -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "refund transfer failed");

        emit Refunded(msg.sender, amount);
    }

    function withdraw() external {
        require(msg.sender == owner, "not owner");
        require(block.timestamp >= coolingEnd(), "cooling period not over");
        require(isSuccess(), "goal not reached");
        require(!ownerWithdrawn, "already withdrawn");

        ownerWithdrawn = true;
        uint256 amount = address(this).balance;

        (bool ok, ) = payable(owner).call{value: amount}("");
        require(ok, "withdraw transfer failed");

        emit Withdrawn(owner, amount);
    }

    function getProgress()
        external
        view
        returns (
            uint256 raised,
            uint256 goalAmount,
            uint256 investorCount,
            uint256 deadlineTs,
            uint256 coolingEndTs,
            bool success
        )
    {
        return (totalRaised, goal, investors.length, endTime(), coolingEnd(), isSuccess());
    }

    function investorsCount() external view returns (uint256) {
        return investors.length;
    }
}
