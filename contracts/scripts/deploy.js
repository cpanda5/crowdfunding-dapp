import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();
  const token = await ethers.deployContract("ProjectToken");
  await token.waitForDeployment();

  console.log(`ProjectToken deployed to: ${await token.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
