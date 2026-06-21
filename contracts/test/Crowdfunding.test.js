import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const GOAL = ethers.parseEther("10");
const DURATION = 7 * 24 * 60 * 60;
const EARLY_BIRD_COUNT = 2;
const COOLING = 2 * 24 * 60 * 60;
const RATE = 10000n;

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("Crowdfunding", function () {
  async function deployFixture() {
    const [owner, alice, bob, carol] = await ethers.getSigners();

    const token = await ethers.deployContract("ProjectToken");
    const crowdfunding = await ethers.deployContract("Crowdfunding", [
      await token.getAddress(),
      GOAL,
      DURATION,
      EARLY_BIRD_COUNT,
      COOLING
    ]);

    await token.transferOwnership(await crowdfunding.getAddress());

    return { token, crowdfunding, owner, alice, bob, carol };
  }

  it("初始化参数正确，且代币所有权已移交给众筹合约", async function () {
    const { token, crowdfunding } = await deployFixture();

    expect(await crowdfunding.goal()).to.equal(GOAL);
    expect(await crowdfunding.earlyBirdCount()).to.equal(EARLY_BIRD_COUNT);
    expect(await token.owner()).to.equal(await crowdfunding.getAddress());
  });

  it("投资后按比例即时铸造代币", async function () {
    const { token, crowdfunding, carol } = await deployFixture();

    const [, , bob] = await ethers.getSigners();
    await crowdfunding.connect(carol).invest({ value: ethers.parseEther("1") });
    await crowdfunding.connect(bob).invest({ value: ethers.parseEther("1") });
    await crowdfunding.connect(carol).invest({ value: ethers.parseEther("1") });

    expect(await crowdfunding.contributions(carol.address)).to.equal(ethers.parseEther("2"));
    expect(await crowdfunding.investorsCount()).to.equal(2n);
  });

  it("前 N 名投资人享受 20% 早鸟奖励，其后恢复普通比例", async function () {
    const { token, crowdfunding, alice, bob, carol } = await deployFixture();

    const base = ethers.parseEther("1") * RATE;

    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("1") });
    await crowdfunding.connect(bob).invest({ value: ethers.parseEther("1") });
    await crowdfunding.connect(carol).invest({ value: ethers.parseEther("1") });

    expect(await token.balanceOf(alice.address)).to.equal((base * 120n) / 100n);
    expect(await token.balanceOf(bob.address)).to.equal((base * 120n) / 100n);
    expect(await token.balanceOf(carol.address)).to.equal(base);
  });

  it("截止后不能再投资", async function () {
    const { crowdfunding, alice } = await deployFixture();
    await increaseTime(DURATION + 1);
    await expect(
      crowdfunding.connect(alice).invest({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("crowdfunding ended");
  });

  it("投资金额为 0 时回退", async function () {
    const { crowdfunding, alice } = await deployFixture();
    await expect(crowdfunding.connect(alice).invest({ value: 0 })).to.be.revertedWith(
      "zero investment"
    );
  });

  it("众筹失败（未达标）时投资人可退款", async function () {
    const { crowdfunding, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("4") });
    await increaseTime(DURATION + 1);

    await expect(crowdfunding.connect(alice).refund())
      .to.emit(crowdfunding, "Refunded")
      .withArgs(alice.address, ethers.parseEther("4"));

    expect(await crowdfunding.contributions(alice.address)).to.equal(0);
  });

  it("众筹成功后不允许退款", async function () {
    const { crowdfunding, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });
    await increaseTime(DURATION + 1);
    await expect(crowdfunding.connect(alice).refund()).to.be.revertedWith(
      "goal reached, no refund"
    );
  });

  it("未达标时业主不能提款", async function () {
    const { crowdfunding, owner, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("4") });
    await increaseTime(DURATION + COOLING + 1);
    await expect(crowdfunding.connect(owner).withdraw()).to.be.revertedWith("goal not reached");
  });

  it("业主在成功且冷静期结束后可提款；非业主或冷静期内不可", async function () {
    const { crowdfunding, owner, alice, bob } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });

    await increaseTime(DURATION + 1);
    await expect(crowdfunding.connect(owner).withdraw()).to.be.revertedWith(
      "cooling period not over"
    );

    await increaseTime(COOLING + 1);
    await expect(crowdfunding.connect(bob).withdraw()).to.be.revertedWith("not owner");

    await expect(crowdfunding.connect(owner).withdraw()).to.emit(crowdfunding, "Withdrawn");
    expect(await crowdfunding.ownerWithdrawn()).to.equal(true);
  });

  it("提款后不能重复提款", async function () {
    const { crowdfunding, owner, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });
    await increaseTime(DURATION + COOLING + 1);
    await crowdfunding.connect(owner).withdraw();
    await expect(crowdfunding.connect(owner).withdraw()).to.be.revertedWith("already withdrawn");
  });
});
