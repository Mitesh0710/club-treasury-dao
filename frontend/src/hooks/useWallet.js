import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const HARDHAT_CHAIN_ID = "0x7a69"; // 31337
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window.ethereum === "undefined") {
      setIsMetaMaskInstalled(false);
    }
  }, []);

  const isCorrectNetwork = chainId === HARDHAT_CHAIN_ID || chainId === SEPOLIA_CHAIN_ID;

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      setIsMetaMaskInstalled(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const connectedSigner = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(connectedSigner);
      setAccount(accounts[0]);
      setChainId("0x" + network.chainId.toString(16));
    } catch (err) {
      if (err.code === 4001 || (err.message && err.message.includes("user rejected"))) {
        setError("Connection request was rejected.");
      } else {
        setError("Failed to connect wallet. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (typeof window.ethereum === "undefined") return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        // Refresh signer to match the newly active account
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(newSigner);
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [disconnectWallet]);

  const truncatedAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return {
    account,
    truncatedAddress,
    provider,
    signer,
    chainId,
    isCorrectNetwork,
    isMetaMaskInstalled,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
  };
}