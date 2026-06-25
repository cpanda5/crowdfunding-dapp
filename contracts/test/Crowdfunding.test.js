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

  it("投资只记录贡献，不立即铸币", async function () {
    const { token, crowdfunding, carol } = await deployFixture();

    const [, , bob] = await ethers.getSigners();
    await crowdfunding.connect(carol).invest({ value: ethers.parseEther("1") });
    await crowdfunding.connect(bob).invest({ value: ethers.parseEther("1") });
    await crowdfunding.connect(carol).invest({ value: ethers.parseEther("1") });

    expect(await crowdfunding.contributions(carol.address)).to.equal(ethers.parseEther("2"));
    expect(await crowdfunding.investorsCount()).to.equal(2n);
    expect(await token.balanceOf(carol.address)).to.equal(0);
  });

  it("业主结算后自动给所有投资人发币，前 N 名享 20% 早鸟", async function () {
    const { token, crowdfunding, owner, alice, bob, carol } = await deployFixture();

    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("5") });
    await crowdfunding.connect(bob).invest({ value: ethers.parseEther("5") });
    await crowdfunding.connect(carol).invest({ value: ethers.parseEther("1") });
    expect(await token.balanceOf(alice.address)).to.equal(0);

    await increaseTime(DURATION + COOLING + 1);
    await crowdfunding.connect(owner).finalize();

    const base5 = ethers.parseEther("5") * RATE;
    const base1 = ethers.parseEther("1") * RATE;
    expect(await token.balanceOf(alice.address)).to.equal((base5 * 120n) / 100n);
    expect(await token.balanceOf(bob.address)).to.equal((base5 * 120n) / 100n);
    expect(await token.balanceOf(carol.address)).to.equal(base1);
  });

  it("结算同时把募集款转给业主", async function () {
    const { crowdfunding, owner, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });
    await increaseTime(DURATION + COOLING + 1);

    await expect(crowdfunding.connect(owner).finalize())
      .to.emit(crowdfunding, "Finalized")
      .withArgs(ethers.parseEther("11"));
  });

  it("冷静期结束前不能结算", async function () {
    const { crowdfunding, owner, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });
    await increaseTime(DURATION + 1);
    await expect(crowdfunding.connect(owner).finalize()).to.be.revertedWith(
      "cooling period not over"
    );
  });

  it("未达标时不能结算", async function () {
    const { crowdfunding, owner, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("4") });
    await increaseTime(DURATION + COOLING + 1);
    await expect(crowdfunding.connect(owner).finalize()).to.be.revertedWith("goal not reached");
  });

  it("非业主不能结算", async function () {
    const { crowdfunding, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });
    await increaseTime(DURATION + COOLING + 1);
    await expect(crowdfunding.connect(alice).finalize()).to.be.revertedWith("not owner");
  });

  it("不能重复结算", async function () {
    const { crowdfunding, owner, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });
    await increaseTime(DURATION + COOLING + 1);
    await crowdfunding.connect(owner).finalize();
    await expect(crowdfunding.connect(owner).finalize()).to.be.revertedWith("already finalized");
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

  it("成功后冷静期内可退款（保险期）", async function () {
    const { crowdfunding, alice, bob } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("6") });
    await crowdfunding.connect(bob).invest({ value: ethers.parseEther("5") });
    await increaseTime(DURATION + 1);

    await expect(crowdfunding.connect(bob).refund()).to.emit(crowdfunding, "Refunded");
    expect(await crowdfunding.totalRaised()).to.equal(ethers.parseEther("6"));
    expect(await crowdfunding.refundedCount()).to.equal(1n);
  });

  it("冷静期内退款过多导致已筹低于目标时，众筹转为失败", async function () {
    const { crowdfunding, owner, alice, bob } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("6") });
    await crowdfunding.connect(bob).invest({ value: ethers.parseEther("5") });
    await increaseTime(DURATION + 1);

    expect(await crowdfunding.isSuccess()).to.equal(true);
    await crowdfunding.connect(bob).refund();

    expect(await crowdfunding.totalRaised()).to.equal(ethers.parseEther("6"));
    expect(await crowdfunding.isSuccess()).to.equal(false);

    await increaseTime(COOLING + 1);
    await expect(crowdfunding.connect(owner).finalize()).to.be.revertedWith("goal not reached");
    await expect(crowdfunding.connect(alice).refund()).to.emit(crowdfunding, "Refunded");
  });

  it("成功且冷静期结束后不允许退款", async function () {
    const { crowdfunding, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("11") });
    await increaseTime(DURATION + COOLING + 1);
    await expect(crowdfunding.connect(alice).refund()).to.be.revertedWith(
      "refund not available"
    );
  });

  it("结算后不允许退款", async function () {
    const { crowdfunding, owner, alice, bob } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("6") });
    await crowdfunding.connect(bob).invest({ value: ethers.parseEther("5") });
    await increaseTime(DURATION + COOLING + 1);
    await crowdfunding.connect(owner).finalize();
    await expect(crowdfunding.connect(bob).refund()).to.be.revertedWith("already finalized");
  });

  it("业主可提前结束众筹，结束后不能再投资", async function () {
    const { crowdfunding, owner, alice, bob } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("4") });

    await expect(crowdfunding.connect(owner).closeEarly()).to.emit(crowdfunding, "Closed");
    expect(await crowdfunding.closed()).to.equal(true);
    expect(await crowdfunding.ended()).to.equal(true);

    await expect(
      crowdfunding.connect(bob).invest({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("crowdfunding ended");
  });

  it("非业主不能提前结束众筹", async function () {
    const { crowdfunding, alice } = await deployFixture();
    await expect(crowdfunding.connect(alice).closeEarly()).to.be.revertedWith("not owner");
  });

  it("提前结束且未达标时投资人可退款", async function () {
    const { crowdfunding, owner, alice } = await deployFixture();
    await crowdfunding.connect(alice).invest({ value: ethers.parseEther("4") });
    await crowdfunding.connect(owner).closeEarly();

    await expect(crowdfunding.connect(alice).refund())
      .to.emit(crowdfunding, "Refunded")
      .withArgs(alice.address, ethers.parseEther("4"));
  });
});
