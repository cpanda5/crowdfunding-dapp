import { Button, Card, Descriptions, Space, Typography, message } from "antd";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

const tokenAddress = import.meta.env.VITE_PROJECT_TOKEN_ADDRESS;
const erc20Abi = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

function Wallet() {
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [tokenBalance, setTokenBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const loadBalances = async (provider, addr) => {
    // ETH 余额
    try {
      const balance = await provider.getBalance(addr);
      setEthBalance(`${Number(ethers.formatEther(balance)).toFixed(4)} ETH`);
    } catch {
      setEthBalance("读取失败");
    }

    // 代币余额
    try {
      if (tokenAddress) {
        const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const [raw, decimals, symbol] = await Promise.all([
          token.balanceOf(addr),
          token.decimals(),
          token.symbol()
        ]);
        setTokenBalance(`${ethers.formatUnits(raw, decimals)} ${symbol}`);
      } else {
        const mock = localStorage.getItem("mock_pt_balance") || "2000";
        setTokenBalance(`${mock} PT (模拟)`);
      }
    } catch {
      setTokenBalance("读取失败");
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (!accounts.length) return;
        setAccount(accounts[0]);
        await loadBalances(provider, accounts[0]);
      } catch {
        // 未授权，静默跳过
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      message.error("当前浏览器未安装 MetaMask");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      await loadBalances(provider, accounts[0]);
    } catch (error) {
      message.error(error?.shortMessage || error?.message || "连接钱包失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-section">
      <Space direction="vertical" size={18} className="full-width">
        <Typography.Title level={2}>钱包</Typography.Title>
        {!initializing && !account && (
          <Button type="primary" size="large" loading={loading} onClick={connectWallet}>
            连接 MetaMask
          </Button>
        )}
        <Card>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="钱包地址">
              {account || "未连接"}
            </Descriptions.Item>
            <Descriptions.Item label="ETH 余额">
              {ethBalance || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="代币余额">
              {tokenBalance || "—"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </section>
  );
}

export default Wallet;
