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

    uint256 public totalRaised; // 当前合约托管的 ETH（退款会减少）
    uint256 public refundedCount; // 已退款人数
    bool public finalized;
    bool public closed;
    uint256 public closedAt;

    address[] public investors;
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public investorIndex; // 1-based; 0 = 未投资

    event Invested(address indexed investor, uint256 ethAmount, uint256 indexed order);
    event Distributed(address indexed investor, uint256 tokenAmount);
    event Refunded(address indexed investor, uint256 ethAmount);
    event Finalized(uint256 ethToOwner);
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

    // 业主结算：众筹成功且冷静期结束后，自动给所有投资人按比例铸币（含早鸟），并把募集款转给业主
    function finalize() external {
        require(msg.sender == owner, "not owner");
        require(block.timestamp >= coolingEnd(), "cooling period not over");
        require(isSuccess(), "goal not reached");
        require(!finalized, "already finalized");

        finalized = true;

        uint256 len = investors.length;
        for (uint256 i = 0; i < len; i++) {
            address investor = investors[i];
            uint256 amount = tokenAmountOf(investor);
            if (amount > 0) {
                token.mint(investor, amount);
                emit Distributed(investor, amount);
            }
        }

        uint256 bal = address(this).balance;
        (bool ok, ) = payable(owner).call{value: bal}("");
        require(ok, "withdraw transfer failed");

        emit Finalized(bal);
    }

    // 退款（pull）：众筹失败、或成功后的冷静期内（保险期），投资人手动取回 ETH
    function refund() external {
        require(ended(), "not ended yet");
        require(!finalized, "already finalized");
        require(!isSuccess() || block.timestamp < coolingEnd(), "refund not available");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "nothing to refund");

        contributions[msg.sender] = 0;
        totalRaised -= amount;
        refundedCount += 1;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "refund transfer failed");

        emit Refunded(msg.sender, amount);
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
