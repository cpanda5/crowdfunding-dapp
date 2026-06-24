# 模块 B 测试指南

## 实现状态：全部完成

| 任务 | 文件 | 状态 |
|------|------|------|
| 代币合约 (ERC-20) | `contracts/contracts/ProjectToken.sol` | 完成 |
| 代币合约单元测试 | `contracts/test/ProjectToken.test.js` | 完成（5 个测试全部通过） |
| 商城页面 | `frontend/src/pages/Shop.jsx` | 完成 |
| 商品设计（3 种 + 图片） | Shop.jsx 内置数据 + Unsplash 图片 | 完成 |
| 代币余额展示（钱包页） | `frontend/src/pages/Wallet.jsx` | 完成 |
| React 脚手架 + 路由 + 布局 | `frontend/src/` | 完成 |

---

## 一、代币合约单元测试

### 环境要求
- Node.js >= 16
- 已安装依赖（首次运行需执行）

```powershell
cd contracts
npm install
```

### 运行测试

```powershell
cd contracts
npm test
```

### 预期输出

```
  ProjectToken
    √ has the correct token name and symbol
    √ allows the owner to mint
    √ prevents non-owners from minting
    √ increases the recipient balance when minting
    √ transfers tokens correctly

  5 passing
```

### 测试覆盖点说明

| 测试用例 | 验证内容 |
|----------|----------|
| 名称和符号 | Token Name = "Project Token"，Symbol = "PT" |
| Owner 可铸造 | 合约 owner 调用 `mint()` 成功 |
| 非 Owner 不可铸造 | 其他地址调用 `mint()` 被 revert |
| 铸造后余额正确 | `balanceOf` 返回值与铸造量一致 |
| 转账功能 | `transfer` 后双方余额正确变化 |

---

## 二、前端功能测试

### 环境要求
- Node.js >= 16
- MetaMask 浏览器扩展（已安装并解锁）
- 本地 Hardhat 节点或 Sepolia 测试网

### 启动前端

```powershell
cd frontend
npm install   # 首次运行
npm run dev
```

浏览器访问：`http://localhost:5173`

---

### 2.1 React 脚手架 + 路由测试

访问以下路由，确认页面正常加载：

| 路由 | 页面 |
|------|------|
| `http://localhost:5173/` | 众筹页（A 模块占位或实现） |
| `http://localhost:5173/shop` | 商城页 |
| `http://localhost:5173/wallet` | 钱包页 |
| `http://localhost:5173/profile` | 个人中心页 |

顶部导航栏应显示 Home / Shop / Wallet / Profile 四个菜单项，点击可跳转。

---

### 2.2 商城页面测试

访问 `http://localhost:5173/shop`

**检查项：**
- [ ] 页面显示 3 种商品：贴纸（100 PT）、T恤（500 PT）、帆布包（800 PT）
- [ ] 每个商品卡片显示名称、图片、价格、库存数量
- [ ] 点击"兑换"按钮

**兑换流程（Mock 模式，无需合约）：**
1. 页面无合约地址时自动使用 localStorage 模拟余额
2. 打开浏览器控制台（F12），执行以下命令设置余额：
   ```javascript
   localStorage.setItem('mockTokenBalance', '1000')
   location.reload()
   ```
3. 再次点击"兑换"，余额 >= 商品价格时兑换成功
4. 成功后库存 -1，在 `/profile` 页可查看兑换记录

**余额不足测试：**
```javascript
localStorage.setItem('mockTokenBalance', '50')
location.reload()
```
点击任意商品的"兑换"按钮，应弹出"余额不足"提示。

---

### 2.3 钱包页代币余额展示测试

访问 `http://localhost:5173/wallet`

**未连接 MetaMask：**
- [ ] 页面显示"连接钱包"按钮

**连接 MetaMask（Hardhat 本地网络）：**

1. 启动本地节点：
   ```powershell
   cd contracts
   npx hardhat node
   ```
2. 在 MetaMask 中添加本地网络：
   - 网络名称：Hardhat Local
   - RPC URL：`http://127.0.0.1:8545`
   - 链 ID：`31337`
   - 货币符号：ETH
3. 导入 Hardhat 测试账户（私钥从 `npx hardhat node` 输出中复制）
4. 部署代币合约：
   ```powershell
   cd contracts
   npx hardhat run scripts/deploy.js --network localhost
   ```
5. 将输出的合约地址填入 `frontend/.env`：
   ```
   VITE_TOKEN_ADDRESS=0x...
   ```
6. 重启前端（`npm run dev`），连接钱包
7. 钱包页应显示：
   - [ ] ETH 余额（精度 4 位小数）
   - [ ] PT 代币余额（初始为 0 PT）

---

### 2.4 个人中心页测试

访问 `http://localhost:5173/profile`（先完成 2.2 的兑换操作）

- [ ] 显示历史兑换记录表格（商品名、价格、时间、交易哈希）
- [ ] 无记录时显示空状态提示

---

## 三、合约接口（供 A 模块对接）

众筹合约调用代币铸造时使用以下接口：

```solidity
// 代币合约地址部署后，众筹合约需设为 owner 或改为 minter 权限
function mint(address to, uint256 amount) external onlyOwner
```

**对接步骤：**
1. 先部署代币合约，获取地址
2. 部署众筹合约时传入代币合约地址
3. 调用代币合约的 `transferOwnership(crowdfundingAddress)` 将铸造权转移给众筹合约

---

## 四、快速验收清单

```
合约层
  [ ] npm test 在 contracts/ 目录下 5 个测试全部通过

前端层
  [ ] npm run dev 启动无报错
  [ ] /shop 显示 3 种商品，兑换流程可走通（Mock 模式）
  [ ] /wallet 连接 MetaMask 后显示 ETH + PT 余额
  [ ] /profile 显示兑换历史记录
  [ ] 顶部导航四个路由可正常跳转
```
