import { useState, useEffect, useCallback } from "react";
import { useContract, parseContractError } from "../hooks/useContract";
import TransactionToast from "../components/TransactionToast";

const SEPOLIA_CHAIN_ID = 11155111;

function Demo({ wallet }) {
  const { contract, readOnlyContract, role, treasuryBalance, refreshTreasuryBalance } = useContract(
    wallet.signer,
    wallet.provider,
    wallet.account
  );

  const [lastTxHash, setLastTxHash] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTreasuryBalance();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshTreasuryBalance]);

  const runDemoScenario = useCallback(async () => {
    if (!contract) {
      showToast("error", "Connect your wallet first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await contract.createProposal(
        "Technical Workshop Equipment",
        "16000000000000000", // 0.016 ETH in wei, per Section 13's demo scenario
        wallet.account,
        300 // 5 minutes, shortened for demo per Section 13
      );
      const receipt = await tx.wait();
      setLastTxHash(receipt.hash);
      showToast("success", "Demo proposal #0 created: Technical Workshop Equipment (0.016 ETH)");
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [contract, wallet.account]);

  const steps = [
    "Connect as President → show treasury balance",
    "Propose Wallet 3 as member (President calls proposeMember)",
    "Switch to Faculty Advisor → approve Wallet 3 (Faculty calls approveMember)",
    "Repeat steps 2-3 for Wallet 4",
    'Switch to President → create Proposal #0: "Technical Workshop Equipment", 0.016 ETH, Voting Duration 5 minutes',
    "Switch to Member A → vote YES",
    "Switch to Member B → vote YES",
    "Switch to President → vote YES",
    "Wait for deadline, then call finalizeProposal() → status becomes APPROVED",
    "Call executeProposal() → funds transferred to Wallet 5",
    "Show Wallet 5 balance increased",
  ];

  return (
    <div className="page demo-page">
      <TransactionToast toasts={toasts} onDismiss={dismissToast} />
      <h2>Demo Walkthrough</h2>

      <div className="card">
        <h3>Live Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Connected Wallet</span>
            <span className="info-value">{wallet.truncatedAddress || "Not connected"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Role</span>
            <span className="info-value">{role}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Treasury Balance (auto-refreshes every 10s)</span>
            <span className="info-value">
              {treasuryBalance !== null ? `${treasuryBalance} ETH` : "Loading..."}
            </span>
          </div>
        </div>
        {lastTxHash && (
          <div className="info-item">
            <span className="info-label">Last Transaction</span>
            {wallet.chainId === "0xaa36a7" ? (
              <a
                href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="info-value"
              >
                {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
              </a>
            ) : (
              <span className="info-value">
                {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-8)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Run Demo Scenario</h3>
        <p>
          Pre-fills Proposal #0 with the hardcoded demo values from Section 13: "Technical
          Workshop Equipment", 0.016 ETH, 5-minute voting duration.
        </p>
        <button className="btn btn-primary" onClick={runDemoScenario} disabled={isSubmitting}>
          Run Demo Scenario
        </button>
      </div>

      <div className="card">
        <h3>Full Lifecycle Walkthrough</h3>
        <ol className="demo-steps">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default Demo;