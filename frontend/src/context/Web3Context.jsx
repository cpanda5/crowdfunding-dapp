import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [ethBalance, setEthBalance] = useState("");
  const [connecting, setConnecting] = useState(false);

  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  const getProvider = useCallback(() => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const refreshEthBalance = useCallback(async (addr) => {
    if (!addr) return;
    try {
      const provider = getProvider();
      const balance = await provider.getBalance(addr);
      setEthBalance(`${Number(ethers.formatEther(balance)).toFixed(4)} ETH`);
    } catch {
      setEthBalance("读取失败");
    }
  }, [getProvider]);

  const getSigner = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return null;
    return provider.getSigner();
  }, [getProvider]);

  const connect = useCallback(async () => {
    if (!window.ethereum) return;
    setConnecting(true);
    try {
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const net = await provider.getNetwork();
      setAccount(accounts[0] || "");
      setChainId(Number(net.chainId));
      await refreshEthBalance(accounts[0]);
    } finally {
      setConnecting(false);
    }
  }, [getProvider, refreshEthBalance]);

  useEffect(() => {
    if (!window.ethereum) return;
    (async () => {
      try {
        const provider = getProvider();
        const accounts = await provider.send("eth_accounts", []);
        if (!accounts.length) return;
        const net = await provider.getNetwork();
        setAccount(accounts[0]);
        setChainId(Number(net.chainId));
        await refreshEthBalance(accounts[0]);
      } catch {
        // ignore
      }
    })();
  }, [getProvider, refreshEthBalance]);

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const onAccountsChanged = (accounts) => {
      const next = accounts[0] || "";
      setAccount(next);
      if (next) refreshEthBalance(next);
      else setEthBalance("");
    };
    const onChainChanged = (hexChainId) => {
      setChainId(Number(hexChainId));
      if (account) refreshEthBalance(account);
    };
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [account, refreshEthBalance]);

  const value = useMemo(
    () => ({
      account,
      chainId,
      ethBalance,
      connecting,
      hasMetaMask,
      connect,
      getProvider,
      getSigner,
      refreshEthBalance
    }),
    [account, chainId, ethBalance, connecting, hasMetaMask, connect, getProvider, getSigner, refreshEthBalance]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 必须在 <Web3Provider> 内使用");
  return ctx;
}
