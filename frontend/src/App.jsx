import { Button, Layout, Menu, Space, Tag, Typography } from "antd";
import { Link, useLocation } from "react-router-dom";
import AppRouter from "./router/AppRouter.jsx";
import { useWeb3 } from "./context/Web3Context.jsx";

const { Header, Content } = Layout;

const navItems = [
  { key: "/", label: <Link to="/">众筹</Link> },
  { key: "/shop", label: <Link to="/shop">商城</Link> },
  { key: "/wallet", label: <Link to="/wallet">钱包</Link> },
  { key: "/profile", label: <Link to="/profile">个人中心</Link> }
];

const shortAddr = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

function App() {
  const location = useLocation();
  const { account, connecting, hasMetaMask, connect } = useWeb3();

  return (
    <Layout className="app-shell">
      <Header className="top-nav">
        <Typography.Title level={4} className="brand">
          链筹
        </Typography.Title>
        <Menu
          className="nav-menu"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navItems}
        />
        <Space className="nav-wallet">
          {account ? (
            <Tag color="green" style={{ margin: 0, padding: "4px 10px" }}>
              {shortAddr(account)}
            </Tag>
          ) : (
            <Button
              type="primary"
              loading={connecting}
              disabled={!hasMetaMask}
              onClick={connect}
            >
              {hasMetaMask ? "连接钱包" : "未安装 MetaMask"}
            </Button>
          )}
        </Space>
      </Header>
      <Content className="page-content">
        <AppRouter />
      </Content>
    </Layout>
  );
}

export default App;
