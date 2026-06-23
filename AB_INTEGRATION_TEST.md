# A/B 模块联调测试方案

> **标注说明**：涉及模块 B（代币 / 商城 / 钱包）的步骤用 `[B]` 标出。

---

## 一、环境准备

### 1.1 启动本地链

```powershell
cd contracts
npx hardhat node
```

记录输出中任意 3 个测试账户的**地址**和**私钥**，分别命名：
- `OWNER`（部署者 / 众筹发起人）
- `INVESTOR_A`（早鸟投资人）
- `INVESTOR_B`（普通投资人）

### 1.2 部署合约

新开终端：

```powershell
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

输出示例：
```
ProjectToken 部署到:   0xAAA...   [B]
Crowdfunding 部署到:   0xBBB...
已将 ProjectToken 所有权移交给众筹合约
```

### 1.3 配置前端环境变量

将上一步输出填入 `frontend/.env`：

```env
VITE_PROJECT_TOKEN_ADDRESS=0xAAA...      # [B]
VITE_CROWDFUNDING_ADDRESS=0xBBB...
```

### 1.4 启动前端

```powershell
cd frontend
npm run dev
```

浏览器打开 `http://localhost:5173`

### 1.5 MetaMask 配置

在 MetaMask 中添加本地网络：

| 字段 | 值 |
|------|-----|
| 网络名称 | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| 链 ID | `31337` |
| 货币符号 | ETH |

分别导入 `OWNER`、`INVESTOR_A`、`INVESTOR_B` 三个账户私钥。

---

## 二、测试场景一：众筹成功完整流程

> 覆盖：投资 → 达标 → 冷静期 → 领取代币 → 发起人提款 → 商城兑换

### 2.1 页面与导航基础验证

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 访问 `/` | 众筹页正常加载，显示"募集中"标签 |
| 2 | 访问 `/shop` | 商城页显示贴纸、T恤、帆布包 3 件商品 `[B]` |
| 3 | 访问 `/wallet` | 显示"连接钱包"按钮 `[B]` |
| 4 | 访问 `/profile` | 显示空状态兑换记录 `[B]` |
| 5 | 点击顶部导航 4 个菜单 | 路由正常跳转，无 404 |

### 2.2 INVESTOR_A 早鸟投资

1. MetaMask 切换到 `INVESTOR_A`
2. 访问 `/`，点击"连接钱包"
3. 输入 `0.5` ETH，点击"投资"，MetaMask 确认

| 验证点 | 预期 |
|--------|------|
| 进度条数值 | 已筹 0.5 / 目标 10 ETH |
| 参与人数 | 1 |
| 页面下方 | 显示"我已投资 0.5 ETH" |

### 2.3 INVESTOR_A 追加投资

输入 `0.5` ETH 再次投资（同账户二次投资）

| 验证点 | 预期 |
|--------|------|
| 已筹 | 1 ETH |
| 我已投资 | 1.0 ETH（合并显示） |
| 参与人数 | 仍为 1（同一地址不重复计数） |

### 2.4 INVESTOR_B 投资至达标

1. MetaMask 切换到 `INVESTOR_B`
2. 连接钱包，输入 `9` ETH，点击"投资"

| 验证点 | 预期 |
|--------|------|
| 已筹 | 10 ETH（100%） |
| 参与人数 | 2 |
| 状态标签 | "冷静期"（如 deploy 时 coolingPeriod > 0）或"众筹成功" |

> **注意**：默认 `deploy.js` 中 `COOLING_SECONDS=0`，冷静期为 0，众筹结束后立即显示"众筹成功"。若需测试冷静期，修改为 `60`（秒）后重新部署。

### 2.5 `[B]` 钱包页余额展示

1. 访问 `/wallet`
2. 点击连接，MetaMask 选择 `INVESTOR_A`

| 验证点 | 预期 |
|--------|------|
| ETH 余额 | 显示约 9.x ETH（精度 4 位小数） |
| PT 余额 | 0 PT（未领取时） `[B]` |

### 2.6 `[B]` INVESTOR_A 领取代币（早鸟奖励）

1. 确认众筹已结束且冷静期已过
2. 访问 `/`，`INVESTOR_A` 账户下点击"领取代币"，MetaMask 确认

| 验证点 | 预期 |
|--------|------|
| 早鸟加成 | INVESTOR_A 投入 1 ETH → 1×10000×1.2 = **12000 PT** `[B]` |
| 页面提示 | 交易成功 |
| 按钮状态 | "领取代币"按钮消失，显示"（已领取代币）" |

### 2.7 `[B]` 钱包页验证代币余额

访问 `/wallet`，切换到 `INVESTOR_A`

| 验证点 | 预期 |
|--------|------|
| PT 余额 | **12000 PT** `[B]` |

### 2.8 INVESTOR_B 领取代币（非早鸟）

切换到 `INVESTOR_B`，访问 `/`，点击"领取代币"

| 验证点 | 预期 |
|--------|------|
| 获得代币 | 9×10000 = **90000 PT**（无早鸟加成）`[B]` |

### 2.9 OWNER 提款

1. MetaMask 切换到 `OWNER`
2. 访问 `/`，点击"提前结束众筹"若众筹尚未结束（或等待截止）
3. 冷静期结束后，合约中应出现"提取资金"按钮（当前前端未显示 owner withdraw 按钮，需直接调用合约或通过 Hardhat console）

```powershell
# 通过 hardhat console 验证
cd contracts
npx hardhat console --network localhost
```
```js
const cf = await ethers.getContractAt("Crowdfunding", "0xBBB...")
await cf.withdraw()
```

| 验证点 | 预期 |
|--------|------|
| 调用成功 | OWNER ETH 余额增加 ~10 ETH |
| ownerWithdrawn | true |

### 2.10 `[B]` 商城兑换

1. MetaMask 切换到 `INVESTOR_A`（有 12000 PT）
2. 访问 `/shop`

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 点击"贴纸"的兑换（100 PT） | MetaMask 弹出 transfer 确认 `[B]` |
| 2 | 确认交易 | 成功提示，贴纸库存 -1 `[B]` |
| 3 | 访问 `/profile` | 显示兑换记录：商品名、价格、时间、交易哈希 `[B]` |
| 4 | 返回 `/wallet` | PT 余额变为 **11900 PT** `[B]` |

---

## 三、测试场景二：众筹失败 → 退款

> 需重新部署一个目标较高、持续时间较短的合约

修改 `deploy.js`：
```js
const GOAL_ETH = "100";       // 目标 100 ETH（难以达到）
const DURATION_SECONDS = 10;  // 10 秒后截止
const COOLING_SECONDS = 0;
```

重新部署并更新 `.env` 后重启前端。

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | INVESTOR_A 投入 1 ETH | 成功，进度 1/100 |
| 2 | 等待 10 秒 | 状态标签变为"众筹失败" |
| 3 | INVESTOR_A 点击"退款" | MetaMask 确认 |
| 4 | 退款后 | INVESTOR_A ETH 恢复，"我已投资"区域消失 |
| 5 | `[B]` 访问 `/wallet` | PT 余额仍为 0，未铸造 `[B]` |
| 6 | INVESTOR_A 再次点击"退款" | 提示"nothing to refund"（已退款，防重入）|

---

## 四、测试场景三：发起人提前关闭

> 使用正常目标的合约，但在达标前由 OWNER 手动关闭

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | INVESTOR_A 投入 1 ETH（未达标）| 成功 |
| 2 | MetaMask 切换到 OWNER | — |
| 3 | 点击"提前结束众筹（发起人）"| MetaMask 确认，状态变为"众筹失败" |
| 4 | INVESTOR_B 尝试投资 | 提示"crowdfunding ended"，交易失败 |
| 5 | INVESTOR_A 点击"退款" | 成功退回 1 ETH |
| 6 | 非 OWNER 账户调用 closeEarly（Hardhat console）| revert "not owner" |

---

## 五、测试场景四：`[B]` 余额不足无法兑换

在商城页直接用浏览器控制台模拟低余额（无需重新部署）：

```js
// 临时覆盖：断开 MetaMask 或使用无代币账户
// 访问 /shop，连接一个 PT 余额为 0 的新账户
```

| 步骤 | 操作 | 预期 `[B]` |
|------|------|------|
| 1 | 用未领代币的账户连接 | — |
| 2 | 点击任意商品"兑换" | 提示"余额不足" |
| 3 | 点击 800 PT 帆布包（余额 100 PT 时）| 提示"余额不足" |

---

## 六、测试场景五：冷静期退款窗口（可选）

修改 `deploy.js`：
```js
const COOLING_SECONDS = 300;  // 5 分钟冷静期
```

重新部署，完成达标后验证冷静期行为：

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 众筹达标，进入冷静期 | 状态显示"冷静期"标签 |
| 2 | 冷静期内 INVESTOR_A 尝试"领取代币" | 按钮不显示（冷静期未过）|
| 3 | 冷静期内 INVESTOR_A 点击"退款" | 成功（冷静期内即使成功也可退款）|
| 4 | 冷静期结束后尝试退款 | 提示"refund not available" |

---

## 七、`[B]` 模块 B 单元测试（独立验证）

```powershell
cd contracts
npm test
```

预期全部通过：

```
ProjectToken
  √ has the correct token name and symbol
  √ allows the owner to mint
  √ prevents non-owners from minting
  √ increases the recipient balance when minting
  √ transfers tokens correctly

5 passing
```

---

## 八、快速验收清单

```
合约层
  [ ] npm test 在 contracts/ 目录下 5 个测试全部通过          [B]
  [ ] 部署脚本成功输出两个合约地址，所有权移交无报错           [B]

众筹流程
  [ ] 投资成功，进度条实时更新
  [ ] 同账户追加投资正确合并，参与人数不重复计数
  [ ] 众筹成功后领取代币：早鸟 +20%，普通无加成              [B]
  [ ] 发起人冷静期后提款成功
  [ ] 众筹失败后投资人可全额退款
  [ ] 发起人提前关闭后，新投资被拒绝，已投资者可退款
  [ ] 冷静期内可退款，冷静期结束后无法退款（可选）

模块 B 前端
  [ ] /wallet 显示 ETH + PT 余额，领取代币后 PT 正确增加     [B]
  [ ] /shop 显示 3 种商品，连接真实代币合约后兑换扣减余额     [B]
  [ ] 余额不足时兑换被阻止并提示                            [B]
  [ ] /profile 显示兑换记录，多账户记录按钱包地址隔离         [B]
  [ ] 顶部导航 4 个路由均可正常跳转
```
