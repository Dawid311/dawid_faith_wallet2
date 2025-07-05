// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract WeeklyTokenStaking is ReentrancyGuard, Pausable {
    IERC20 public stakingToken;   // 0 Decimals
    IERC20 public rewardToken;    // 2 Decimals

    uint256 public constant WEEK = 7 days;
    uint256 public totalStakedTokens;
    uint256 public userCount;
    uint256 public totalRewardsDistributed;

    struct StakeInfo {
        uint256 amount;
        uint256 lastClaimed;
        uint256 stakeTimestamp;
    }

    struct RewardStage {
        uint256 maxTotalDistributed;
        uint256 rewardRate;
    }

    RewardStage[] public stages;
    mapping(address => StakeInfo) public stakers;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardTokensReceived(address indexed sender, uint256 amount);

    constructor(address _stakingToken, address _rewardToken) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        require(_stakingToken != _rewardToken, "Tokens must be different");

        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);

        stages.push(RewardStage(10_000 ether, 10)); // 0.1
        stages.push(RewardStage(20_000 ether, 5));  // 0.05
        stages.push(RewardStage(40_000 ether, 3));  // 0.03
        stages.push(RewardStage(60_000 ether, 2));  // 0.02
        stages.push(RewardStage(80_000 ether, 1));  // 0.01
        stages.push(RewardStage(type(uint256).max, 1)); // stays at 0.01
    }

    function _getCurrentRewardRate() public view returns (uint256) {
        for (uint i = 0; i < stages.length; i++) {
            if (totalRewardsDistributed < stages[i].maxTotalDistributed) {
                return stages[i].rewardRate;
            }
        }
        // Wenn alle Stufen erreicht sind, verwende die letzte Rate (1%)
        return stages[stages.length - 1].rewardRate;
    }

    function getCurrentStage() public view returns (uint8) {
        for (uint8 i = 0; i < stages.length; i++) {
            if (totalRewardsDistributed < stages[i].maxTotalDistributed) {
                return i + 1;
            }
        }
        return uint8(stages.length);
    }

    function stake(uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        StakeInfo storage user = stakers[msg.sender];

        if (user.amount == 0) {
            userCount += 1;
            user.stakeTimestamp = block.timestamp;
        }

        // Claim existing rewards before updating stake
        if (user.lastClaimed > 0) {
            claimReward();
        } else {
            user.lastClaimed = block.timestamp;
        }

        user.amount += _amount;
        totalStakedTokens += _amount;

        emit Staked(msg.sender, _amount);
    }

    function unstake() external nonReentrant {
        StakeInfo storage user = stakers[msg.sender];
        require(user.amount > 0, "No tokens to unstake");
        require(block.timestamp >= user.stakeTimestamp + WEEK, "Minimum staking period not met");

        claimReward(); // claim rewards first

        uint256 amountToUnstake = user.amount;
        user.amount = 0;
        user.lastClaimed = 0;
        user.stakeTimestamp = 0;

        totalStakedTokens -= amountToUnstake;
        userCount--;

        require(stakingToken.transfer(msg.sender, amountToUnstake), "Unstake transfer failed");

        emit Unstaked(msg.sender, amountToUnstake);
    }

    function claimReward() public nonReentrant whenNotPaused {
        StakeInfo storage user = stakers[msg.sender];
        require(user.amount > 0, "Nothing staked");
        require(user.lastClaimed > 0, "No rewards to claim");
        
        uint256 weeksPassed = (block.timestamp - user.lastClaimed) / WEEK;
        if (weeksPassed == 0) {
            return;
        }

        uint256 rewardRate = _getCurrentRewardRate();
        uint256 reward = weeksPassed * user.amount * rewardRate / 10**2;

        if (reward > 0) {
            require(rewardToken.balanceOf(address(this)) >= reward, "Insufficient reward tokens");
            
            // Update erst nach erfolgreicher Berechnung
            user.lastClaimed += weeksPassed * WEEK; // Präziser als block.timestamp
            totalRewardsDistributed += reward;
            
            require(rewardToken.transfer(msg.sender, reward), "Reward transfer failed");
            emit RewardClaimed(msg.sender, reward);
        }
    }

    function notifyRewardDeposit() external {
        uint256 currentBalance = rewardToken.balanceOf(address(this));
        emit RewardTokensReceived(msg.sender, currentBalance);
    }

    function getClaimableReward(address _user) external view returns (uint256) {
        StakeInfo storage user = stakers[_user];
        if (user.amount == 0 || user.lastClaimed == 0) {
            return 0;
        }
        
        uint256 weeksPassed = (block.timestamp - user.lastClaimed) / WEEK;
        if (weeksPassed == 0) {
            return 0;
        }

        return user.amount * _getCurrentRewardRate() * weeksPassed / 10**2;
    }

    function getStakingStatus() external view returns (
        uint8 currentStage,
        uint256 currentRewardRate,
        uint256 totalDistributed
    ) {
        currentRewardRate = _getCurrentRewardRate();
        totalDistributed = totalRewardsDistributed;
        currentStage = getCurrentStage();
    }

    function getRewardTokenBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }
    
    function getContractInfo() external view returns (
        uint256 totalStaked,
        uint256 totalUsers,
        uint256 rewardBalance,
        uint8 currentStage,
        uint256 currentRate
    ) {
        totalStaked = totalStakedTokens;
        totalUsers = userCount;
        rewardBalance = rewardToken.balanceOf(address(this));
        currentStage = getCurrentStage();
        currentRate = _getCurrentRewardRate();
    }
}
