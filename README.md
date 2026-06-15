# 众筹 DApp

基于以太坊的众筹平台，支持 ERC-20 代币发行与商品兑换。

## 项目结构

```
crowdfunding-dapp/
├── contracts/   Hardhat 合约项目（代币合约 + 众筹合约）
└── frontend/    Vite + React 前端
```

## 模块说明

| 模块 | 负责内容 |
|------|----------|
| A — 众筹模块 | 众筹合约、众筹页面、Web3 基础设施、MetaMask 连接 |
| B — 代币与商城模块 | ERC-20 代币合约、商城页面、商品兑换、React 脚手架 |

---

## 快速启动

### 1. 安装依赖

```bash
cd contracts && npm install
cd frontend && npm install
```

### 2. 启动本地节点

```bash
cd contracts
npx hardhat node
```

### 3. 部署合约（新终端）

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

将输出的合约地址填入 `frontend/.env`：

```
VITE_PROJECT_TOKEN_ADDRESS=0x...
VITE_CROWDFUNDING_ADDRESS=0x...
```

### 4. 启动前端

```bash
cd frontend
npm run dev
```

浏览器访问 `http://localhost:5173`

---

## 合约测试

```bash
cd contracts
npm test
```

预期：代币合约 5 个测试全部通过。

---

## 页面路由

| 路由 | 页面 |
|------|------|
| `/` | 众筹页 |
| `/shop` | 商城页 |
| `/wallet` | 钱包页 |
| `/profile` | 个人中心 |

---

## MetaMask 配置（本地网络）

| 字段 | 值 |
|------|----|
| 网络名称 | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| 链 ID | `31337` |
| 货币符号 | ETH |

测试账户私钥从 `npx hardhat node` 的输出中获取。

---

## 部署到 Sepolia

在 `contracts/.env` 中配置：

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your-key>
PRIVATE_KEY=<your-private-key>
```

```bash
cd contracts
npx hardhat run scripts/deploy.js --network sepolia
```
