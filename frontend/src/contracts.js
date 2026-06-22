export const tokenAddress = import.meta.env.VITE_PROJECT_TOKEN_ADDRESS;
export const crowdfundingAddress = import.meta.env.VITE_CROWDFUNDING_ADDRESS;

const isConfigured = (addr) =>
  !!addr && addr !== "0x0000000000000000000000000000000000000000";

export const hasToken = isConfigured(tokenAddress);
export const hasCrowdfunding = isConfigured(crowdfundingAddress);

export const tokenAbi = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

export const crowdfundingAbi = [
  "function invest() payable",
  "function claim()",
  "function refund()",
  "function withdraw()",
  "function closeEarly()",
  "function owner() view returns (address)",
  "function closed() view returns (bool)",
  "function claimed(address) view returns (bool)",
  "function isSuccess() view returns (bool)",
  "function tokenAmountOf(address) view returns (uint256)",
  "function contributions(address) view returns (uint256)",
  "function totalRaised() view returns (uint256)",
  "function goal() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function coolingEnd() view returns (uint256)",
  "function earlyBirdCount() view returns (uint256)",
  "function investorsCount() view returns (uint256)",
  "function getProgress() view returns (uint256 raised, uint256 goalAmount, uint256 investorCount, uint256 deadlineTs, uint256 coolingEndTs, bool success)",
  "event Invested(address indexed investor, uint256 ethAmount, uint256 indexed order)",
  "event Claimed(address indexed investor, uint256 tokenAmount)",
  "event Refunded(address indexed investor, uint256 ethAmount)",
  "event Withdrawn(address indexed owner, uint256 ethAmount)",
  "event Closed(uint256 closedAt)"
];
