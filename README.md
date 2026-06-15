# Crowdfunding DApp - Token + Shop Module

This project contains a Hardhat ERC20 token contract and a Vite React demo for a token shop.

## Contracts

```bash
cd contracts
npm install
npm test
npm run deploy
```

`ProjectToken` uses OpenZeppelin ERC20 and Ownable. The deploy script prints the token contract address.

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `VITE_PROJECT_TOKEN_ADDRESS` in `frontend/.env` to the deployed `ProjectToken` address so the Wallet page can read `balanceOf()` through MetaMask.

Routes:

- `/` Crowdfunding placeholder
- `/shop` product redemption demo
- `/wallet` MetaMask wallet and token balance
- `/profile` mock redemption history
