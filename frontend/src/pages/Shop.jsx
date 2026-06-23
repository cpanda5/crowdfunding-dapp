import { Button, Card, Col, Row, Space, Tag, Typography, message } from "antd";
import { ethers } from "ethers";
import { useState } from "react";

const tokenAddress = import.meta.env.VITE_PROJECT_TOKEN_ADDRESS;
const treasuryAddress =
  import.meta.env.VITE_REDEEM_TREASURY_ADDRESS ||
  "0x000000000000000000000000000000000000dEaD";

const erc20Abi = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "贴纸",
    price: 100,
    stock: 120,
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    name: "T恤",
    price: 500,
    stock: 36,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3,
    name: "茶包",
    price: 800,
    stock: 48,
    image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80"
  }
];

const STOCK_KEY = "shop_stock";

const loadProducts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STOCK_KEY));
    if (!saved) return DEFAULT_PRODUCTS;
    return DEFAULT_PRODUCTS.map((p) => {
      const s = saved[p.id];
      return s !== undefined ? { ...p, stock: s } : p;
    });
  } catch {
    return DEFAULT_PRODUCTS;
  }
};

const saveStock = (products) => {
  const map = {};
  products.forEach((p) => { map[p.id] = p.stock; });
  localStorage.setItem(STOCK_KEY, JSON.stringify(map));
};

const recordsKey = (account) => `redeem_records_${account.toLowerCase()}`;

const readRecords = (account) => {
  try {
    return JSON.parse(localStorage.getItem(recordsKey(account))) || [];
  } catch {
    return [];
  }
};

const createMockTxHash = () =>
  `mock-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

function Shop() {
  const [products, setProducts] = useState(loadProducts);
  const [redeemingId, setRedeemingId] = useState(null);

  const handleRedeem = async (product) => {
    if (!window.ethereum) {
      message.error("当前浏览器未安装 MetaMask");
      return;
    }

    if (product.stock <= 0) {
      message.warning("该商品已售罄");
      return;
    }

    setRedeemingId(product.id);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);

      if (!accounts.length) {
        message.warning("请先连接钱包");
        return;
      }

      const account = accounts[0];
      let txHash = "";

      if (tokenAddress) {
        const tokenReader = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const decimals = await tokenReader.decimals();
        const priceAmount = ethers.parseUnits(String(product.price), decimals);
        const balance = await tokenReader.balanceOf(account);

        if (balance < priceAmount) {
          window.alert("余额不足");
          return;
        }

        const signer = await provider.getSigner();
        const tokenWriter = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const tx = await tokenWriter.transfer(treasuryAddress, priceAmount);
        txHash = tx.hash;
        await tx.wait();
      } else {
        const mockDecimals = 18;
        const priceAmount = ethers.parseUnits(String(product.price), mockDecimals);
        const storedMockBalance = localStorage.getItem("mock_pt_balance") || "2000";
        const mockBalance = ethers.parseUnits(storedMockBalance, mockDecimals);

        if (mockBalance < priceAmount) {
          window.alert("余额不足");
          return;
        }

        const nextMockBalance = ethers.formatUnits(mockBalance - priceAmount, mockDecimals);
        localStorage.setItem("mock_pt_balance", nextMockBalance);
        txHash = createMockTxHash();
      }

      const record = {
        productName: product.name,
        price: product.price,
        time: new Date().toLocaleString(),
        txHash
      };

      localStorage.setItem(
        recordsKey(account),
        JSON.stringify([record, ...readRecords(account)])
      );

      setProducts((currentProducts) => {
        const updated = currentProducts.map((item) =>
          item.id === product.id ? { ...item, stock: item.stock - 1 } : item
        );
        saveStock(updated);
        return updated;
      });

      message.success(`${product.name} 兑换成功`);
    } catch (error) {
      message.error(error?.shortMessage || error?.message || "兑换失败");
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <section className="page-section">
      <Space direction="vertical" size={18} className="full-width">
        <Typography.Title level={2}>商城</Typography.Title>
        <Row gutter={[20, 20]}>
          {products.map((product) => (
            <Col xs={24} md={8} key={product.id}>
              <Card
                className="product-card"
                cover={<img alt={product.name} src={product.image} />}
                actions={[
                  <Button
                    type="primary"
                    loading={redeemingId === product.id}
                    disabled={product.stock <= 0}
                    onClick={() => handleRedeem(product)}
                  >
                    兑换
                  </Button>
                ]}
              >
                <Space direction="vertical" size={10} className="full-width">
                  <Typography.Title level={4}>{product.name}</Typography.Title>
                  <Space wrap>
                    <Tag color="green">{product.price} PT</Tag>
                    <Tag>库存 {product.stock}</Tag>
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    </section>
  );
}

export default Shop;
