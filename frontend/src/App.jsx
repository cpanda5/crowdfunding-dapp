import { Layout, Menu, Typography } from "antd";
import { Link, useLocation } from "react-router-dom";
import AppRouter from "./router/AppRouter.jsx";

const { Header, Content } = Layout;

const navItems = [
  { key: "/", label: <Link to="/">众筹</Link> },
  { key: "/shop", label: <Link to="/shop">商城</Link> },
  { key: "/wallet", label: <Link to="/wallet">钱包</Link> },
  { key: "/profile", label: <Link to="/profile">个人中心</Link> }
];

function App() {
  const location = useLocation();

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
      </Header>
      <Content className="page-content">
        <AppRouter />
      </Content>
    </Layout>
  );
}

export default App;
