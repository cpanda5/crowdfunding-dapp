import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("ProjectToken", function () {
  async function deployProjectTokenFixture() {
    const [owner, user, recipient] = await ethers.getSigners();
    const token = await ethers.deployContract("ProjectToken");

    return { token, owner, user, recipient };
  }

  it("has the correct token name and symbol", async function () {
    const { token } = await deployProjectTokenFixture();

    expect(await token.name()).to.equal("Project Token");
    expect(await token.symbol()).to.equal("PT");
  });

  it("allows the owner to mint", async function () {
    const { token, user } = await deployProjectTokenFixture();
    const amount = ethers.parseUnits("100", 18);

    await expect(token.mint(user.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, user.address, amount);
  });

  it("prevents non-owners from minting", async function () {
    const { token, user } = await deployProjectTokenFixture();
    const amount = ethers.parseUnits("100", 18);

    await expect(token.connect(user).mint(user.address, amount))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
      .withArgs(user.address);
  });

  it("increases the recipient balance when minting", async function () {
    const { token, user } = await deployProjectTokenFixture();
    const amount = ethers.parseUnits("50", 18);

    await token.mint(user.address, amount);

    expect(await token.balanceOf(user.address)).to.equal(amount);
  });

  it("transfers tokens correctly", async function () {
    const { token, user, recipient } = await deployProjectTokenFixture();
    const mintedAmount = ethers.parseUnits("100", 18);
    const transferAmount = ethers.parseUnits("25", 18);

    await token.mint(user.address, mintedAmount);

    await expect(token.connect(user).transfer(recipient.address, transferAmount))
      .to.emit(token, "Transfer")
      .withArgs(user.address, recipient.address, transferAmount);

    expect(await token.balanceOf(user.address)).to.equal(mintedAmount - transferAmount);
    expect(await token.balanceOf(recipient.address)).to.equal(transferAmount);
  });
});
