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
    uint256 public immutable coolingEnd;
    uint256 public immutable earlyBirdCount;

    uint256 public totalRaised;
    bool public ownerWithdrawn;

    address[] public investors;
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public investorIndex; // 1-based; 0 = 未投资

    event Invested(address indexed investor, uint256 ethAmount, uint256 tokenMinted, uint256 indexed order);
    event Refunded(address indexed investor, uint256 ethAmount);
    event Withdrawn(address indexed owner, uint256 ethAmount);

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
        coolingEnd = block.timestamp + _durationSeconds + _coolingSeconds;
        earlyBirdCount = _earlyBirdCount;
    }

    function invest() external payable {
        require(block.timestamp < deadline, "crowdfunding ended");
        require(msg.value > 0, "zero investment");

        if (investorIndex[msg.sender] == 0) {
            investors.push(msg.sender);
            investorIndex[msg.sender] = investors.length;
        }

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        uint256 minted = msg.value * RATE;
        if (investorIndex[msg.sender] <= earlyBirdCount) {
            minted += (minted * EARLY_BIRD_BONUS_PERCENT) / 100;
        }
        token.mint(msg.sender, minted);

        emit Invested(msg.sender, msg.value, minted, investorIndex[msg.sender]);
    }

    function isSuccess() public view returns (bool) {
        return totalRaised >= goal;
    }

    function refund() external {
        require(block.timestamp >= deadline, "not ended yet");
        require(!isSuccess(), "goal reached, no refund");

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
        require(block.timestamp >= coolingEnd, "cooling period not over");
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
        return (totalRaised, goal, investors.length, deadline, coolingEnd, isSuccess());
    }

    function investorsCount() external view returns (uint256) {
        return investors.length;
    }
}
