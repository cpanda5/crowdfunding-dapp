import { network } from "hardhat";

const GOAL_ETH = "1";
const DURATION_SECONDS = 24 * 60 * 60;
const EARLY_BIRD_COUNT = 3;
const COOLING_SECONDS = 120;

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  const token = await ethers.deployContract("ProjectToken");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("ProjectToken 部署到:", tokenAddress);

  const crowdfunding = await ethers.deployContract("Crowdfunding", [
    tokenAddress,
    ethers.parseEther(GOAL_ETH),
    DURATION_SECONDS,
    EARLY_BIRD_COUNT,
    COOLING_SECONDS
  ]);
  await crowdfunding.waitForDeployment();
  const crowdfundingAddress = await crowdfunding.getAddress();
  console.log("Crowdfunding 部署到:", crowdfundingAddress);

  // 移交代币所有权给众筹合约，使其获得铸造权
  const tx = await token.transferOwnership(crowdfundingAddress);
  await tx.wait();
  console.log("已将 ProjectToken 所有权移交给众筹合约");

  console.log("\n========== 复制到 frontend/.env ==========");
  console.log(`VITE_PROJECT_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_CROWDFUNDING_ADDRESS=${crowdfundingAddress}`);
  console.log("==========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
