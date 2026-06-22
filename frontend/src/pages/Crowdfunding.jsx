import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  message
} from "antd";
import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWeb3 } from "../context/Web3Context.jsx";
import {
  crowdfundingAbi,
  crowdfundingAddress,
  hasCrowdfunding
} from "../contracts.js";
import FundingChart from "../components/FundingChart.jsx";

const RATE = 10000;

const formatRemaining = (seconds) => {
  if (seconds <= 0) return "已结束";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}天 ${h}时 ${m}分 ${s}秒`;
};

function Crowdfunding() {
  const { account, connect, getProvider, getSigner } = useWeb3();

  const [progress, setProgress] = useState(null);
  const [myContribution, setMyContribution] = useState("0");
  const [myClaimed, setMyClaimed] = useState(false);
  const [contractOwner, setContractOwner] = useState("");
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState("");
  const [chartPoints, setChartPoints] = useState([]);

  const readContractRef = useRef(null);

  const getReadContract = useCallback(() => {
    const provider = getProvider();
    if (!provider || !hasCrowdfunding) return null;
    return new ethers.Contract(crowdfundingAddress, crowdfundingAbi, provider);
  }, [getProvider]);

  const loadProgress = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;
    try {
      const [raised, goal, count, deadline, coolingEnd, success] =
        await contract.getProgress();
      setProgress({
        raised: Number(ethers.formatEther(raised)),
        goal: Number(ethers.formatEther(goal)),
        count: Number(count),
        deadline: Number(deadline),
        coolingEnd: Number(coolingEnd),
        success
      });
      const ownerAddr = await contract.owner();
      setContractOwner(ownerAddr);
      if (account) {
        const [contrib, claimedFlag] = await Promise.all([
          contract.contributions(account),
          contract.claimed(account)
        ]);
        setMyContribution(ethers.formatEther(contrib));
        setMyClaimed(claimedFlag);
      }
    } catch (error) {
      console.error(error);
    }
  }, [getReadContract, account]);

  const loadChart = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;
    try {
      const events = await contract.queryFilter(contract.filters.Invested());
      let cumulative = 0;
      const seen = new Set();
      const points = [{ raised: 0, count: 0 }];
      for (const ev of events) {
        cumulative += Number(ethers.formatEther(ev.args.ethAmount));
        seen.add(ev.args.investor.toLowerCase());
        points.push({ raised: cumulative, count: seen.size });
      }
      setChartPoints(points);
    } catch (error) {
      console.error(error);
    }
  }, [getReadContract]);

  useEffect(() => {
    loadProgress();
    loadChart();
  }, [loadProgress, loadChart]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const contract = getReadContract();
    if (!contract) return undefined;
    readContractRef.current = contract;
    const handler = () => {
      loadProgress();
      loadChart();
    };
    contract.on("Invested", handler);
    contract.on("Closed", handler);
    return () => {
      contract.off("Invested", handler);
      contract.off("Closed", handler);
    };
  }, [getReadContract, loadProgress, loadChart]);

  const sendTx = useCallback(
    async (label, run) => {
      if (!account) {
        await connect();
        return;
      }
      setBusy(label);
      try {
        const signer = await getSigner();
        const contract = new ethers.Contract(crowdfundingAddress, crowdfundingAbi, signer);
        const tx = await run(contract);
        await tx.wait();
        message.success("交易成功");
        await loadProgress();
        await loadChart();
      } catch (error) {
        message.error(error?.shortMessage || error?.reason || error?.message || "交易失败");
      } finally {
        setBusy("");
      }
    },
    [account, connect, getSigner, loadProgress, loadChart]
  );

  const handleInvest = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      message.warning("请输入有效的 ETH 数量");
      return;
    }
    sendTx("invest", (c) => c.invest({ value: ethers.parseEther(String(amount)) })).then(() =>
      setAmount("")
    );
  };

  const remaining = progress ? progress.deadline - now : 0;
  const ended = progress ? now >= progress.deadline : false;
  const coolingOver = progress ? now >= progress.coolingEnd : false;
  const percent = progress && progress.goal > 0
    ? Math.min(100, Math.round((progress.raised / progress.goal) * 100))
    : 0;

  const statusTag = useMemo(() => {
    if (!progress) return null;
    if (!ended) return <Tag color="processing">募集中</Tag>;
    if (progress.success && !coolingOver) return <Tag color="gold">冷静期</Tag>;
    if (progress.success) return <Tag color="success">众筹成功</Tag>;
    return <Tag color="error">众筹失败</Tag>;
  }, [progress, ended, coolingOver]);

  if (!hasCrowdfunding) {
    return (
      <section className="page-section">
        <Typography.Title level={2}>众筹</Typography.Title>
        <Alert
          type="warning"
          showIcon
          message="尚未配置众筹合约地址"
          description="请先部署合约，并把 VITE_CROWDFUNDING_ADDRESS 填入 frontend/.env 后重启前端。"
        />
      </section>
    );
  }

  const canClaim =
    progress && ended && coolingOver && progress.success && Number(myContribution) > 0 && !myClaimed;
  const canRefund =
    progress &&
    ended &&
    Number(myContribution) > 0 &&
    !myClaimed &&
    (!progress.success || !coolingOver);
  const isOwner =
    account && contractOwner && account.toLowerCase() === contractOwner.toLowerCase();

  return (
    <section className="page-section">
      <Space direction="vertical" size={18} className="full-width">
        <Space align="center">
          <Typography.Title level={2} style={{ margin: 0 }}>
            链筹 · 校园开源硬件众筹
          </Typography.Title>
          {statusTag}
        </Space>

        <Row gutter={[18, 18]}>
          <Col xs={24} md={14}>
            <Card title="项目信息">
              <Typography.Paragraph>
                本项目旨在为校园开源硬件社区筹集启动资金。投资者投入 ETH 参与众筹，
                <b>众筹成功后</b>可按 <b>1 ETH = {RATE} PT</b> 的比例领取项目代币（PT），
                代币可在项目商城兑换纪念商品。前 3 名投资者享 <b>20% 早鸟奖励</b>；
                众筹失败时投资人可全额退款。
              </Typography.Paragraph>

              <Space.Compact style={{ width: "100%" }}>
                <Input
                  addonAfter="ETH"
                  placeholder="输入投资金额"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={ended}
                />
                <Button
                  type="primary"
                  loading={busy === "invest"}
                  disabled={ended}
                  onClick={handleInvest}
                >
                  {account ? "投资" : "连接钱包"}
                </Button>
              </Space.Compact>
              {amount && Number(amount) > 0 && (
                <Typography.Text type="secondary">
                  众筹成功后约可领取 {(Number(amount) * RATE).toLocaleString()} PT（早鸟另加 20%）
                </Typography.Text>
              )}

              {isOwner && !ended && (
                <div style={{ marginTop: 16 }}>
                  <Button
                    danger
                    loading={busy === "close"}
                    onClick={() => sendTx("close", (c) => c.closeEarly())}
                  >
                    提前结束众筹（发起人）
                  </Button>
                </div>
              )}

              {Number(myContribution) > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Typography.Text>
                    我已投资 <b>{myContribution} ETH</b>
                    {myClaimed && "（已领取代币）"}
                  </Typography.Text>
                  {(canClaim || canRefund) && (
                    <Space style={{ marginTop: 10 }}>
                      {canClaim && (
                        <Button
                          type="primary"
                          loading={busy === "claim"}
                          onClick={() => sendTx("claim", (c) => c.claim())}
                        >
                          领取代币
                        </Button>
                      )}
                      {canRefund && (
                        <Button
                          danger
                          loading={busy === "refund"}
                          onClick={() => sendTx("refund", (c) => c.refund())}
                        >
                          退款
                        </Button>
                      )}
                    </Space>
                  )}
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} md={10}>
            <Card title="众筹进度">
              <Space direction="vertical" size={14} className="full-width">
                <Progress percent={percent} status={ended && !progress?.success ? "exception" : "active"} />
                <Row gutter={12}>
                  <Col span={12}>
                    <Statistic
                      title="已筹 / 目标 (ETH)"
                      value={progress ? progress.raised : 0}
                      precision={2}
                      suffix={`/ ${progress ? progress.goal : 0}`}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic title="参与人数" value={progress ? progress.count : 0} />
                  </Col>
                </Row>
                <Statistic title="剩余时间" value={formatRemaining(remaining)} />
              </Space>
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="数据看板 · 资金筹集与参与人数增长">
              <FundingChart points={chartPoints} />
            </Card>
          </Col>
        </Row>
      </Space>
    </section>
  );
}

export default Crowdfunding;
