import { Card, Descriptions, Space, Table, Typography, message } from "antd";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

const tokenAddress = import.meta.env.VITE_PROJECT_TOKEN_ADDRESS;
const erc20Abi = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const shortHash = (value) =>
  value && value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;

const readRecords = () => {
  try {
    return JSON.parse(localStorage.getItem("redeem_records")) || [];
  } catch {
    return [];
  }
};

const columns = [
  { title: "Product", dataIndex: "productName", key: "productName" },
  {
    title: "Price",
    dataIndex: "price",
    key: "price",
    render: (price) => `${price} PT`
  },
  { title: "Time", dataIndex: "time", key: "time" },
  {
    title: "Tx Hash",
    dataIndex: "txHash",
    key: "txHash",
    render: (txHash) => <Typography.Text copyable>{shortHash(txHash)}</Typography.Text>
  }
];

function Profile() {
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [tokenBalance, setTokenBalance] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setRecords(readRecords());

      if (!window.ethereum) {
        setLoading(false);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);

        if (!accounts.length) {
          setLoading(false);
          return;
        }

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
          const mockBalance = localStorage.getItem("mock_pt_balance") || "2000";
          setTokenBalance(`${mockBalance} PT (mock)`);
        }
      } catch (error) {
        message.error(error?.shortMessage || error?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (!loading && !account) {
    return (
      <section className="page-section">
        <Typography.Title level={2}>Profile</Typography.Title>
        <Card>
          <Typography.Text>Please connect wallet</Typography.Text>
        </Card>
      </section>
    );
  }

  return (
    <section className="page-section">
      <Space direction="vertical" size={18} className="full-width">
        <Typography.Title level={2}>Profile</Typography.Title>

        <Card title="Wallet Info" loading={loading}>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Wallet Address">{account}</Descriptions.Item>
            <Descriptions.Item label="ETH Balance">{ethBalance}</Descriptions.Item>
            <Descriptions.Item label="ProjectToken Balance">
              {tokenBalance}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Redemption History">
          {records.length ? (
            <Table
              rowKey={(record) => `${record.txHash}-${record.time}`}
              columns={columns}
              dataSource={records}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 720 }}
            />
          ) : (
            <Typography.Text>No redemption history</Typography.Text>
          )}
        </Card>
      </Space>
    </section>
  );
}

export default Profile;
