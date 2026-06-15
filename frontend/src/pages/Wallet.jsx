import { Button, Card, Descriptions, Space, Typography, message } from "antd";
import { ethers } from "ethers";
import { useState } from "react";

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

  const connectWallet = async () => {
    if (!window.ethereum) {
      message.error("MetaMask is not available in this browser.");
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const selectedAccount = accounts[0];
      const balance = await provider.getBalance(selectedAccount);

      setAccount(selectedAccount);
      setEthBalance(`${Number(ethers.formatEther(balance)).toFixed(4)} ETH`);

      if (tokenAddress) {
        const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const [rawTokenBalance, decimals, symbol] = await Promise.all([
          token.balanceOf(selectedAccount),
          token.decimals(),
          token.symbol()
        ]);
        setTokenBalance(`${ethers.formatUnits(rawTokenBalance, decimals)} ${symbol}`);
      } else {
        setTokenBalance("Set VITE_PROJECT_TOKEN_ADDRESS to read PT balance");
      }
    } catch (error) {
      message.error(error?.shortMessage || error?.message || "Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-section">
      <Space direction="vertical" size={18} className="full-width">
        <Typography.Title level={2}>Wallet</Typography.Title>
        <Button type="primary" size="large" loading={loading} onClick={connectWallet}>
          Connect MetaMask
        </Button>
        <Card>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Wallet Address">
              {account || "Not connected"}
            </Descriptions.Item>
            <Descriptions.Item label="ETH Balance">
              {ethBalance || "Not connected"}
            </Descriptions.Item>
            <Descriptions.Item label="Project Token Balance">
              {tokenBalance || "Not connected"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </section>
  );
}

export default Wallet;
