import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useContract, parseContractError } from "../hooks/useContract";
import StatusBadge from "../components/StatusBadge";
import TransactionToast from "../components/TransactionToast";

function Treasury({ wallet }) {
  const { contract, readOnlyContract, treasuryBalance, refreshTreasuryBalance } = useContract(
    wallet.signer,
    wallet.provider,
    wallet.account
  );

  const [fundAmount, setFundAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executedProposals, setExecutedProposals] = useState([]);
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshExecutedProposals = useCallback(async () => {
    if (!readOnlyContract) return;

    try {
      const filter = readOnlyContract.filters.ProposalExecuted();
      const events = await readOnlyContract.queryFilter(filter, 0, "latest");

      const rows = await Promise.all(
        events.map(async (event) => {
          const proposalId = event.args.proposalId;
          const p = await readOnlyContract.getProposal(proposalId);
          return {
            proposalId: proposalId.toString(),
            purpose: p.purpose,
            amountEth: ethers.formatEther(p.amount),
            recipient: p.recipient,
            status: Number(p.status),
          };
        })
      );

      setExecutedProposals(rows);
    } catch (err) {
      console.error("Failed to load transaction history:", err);
    }
  }, [readOnlyContract]);

  useEffect(() => {
    refreshExecutedProposals();
  }, [refreshExecutedProposals]);

  const handleFundTreasury = async () => {
    if (!contract || !fundAmount) {
      showToast("error", "Please enter an amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await wallet.signer.sendTransaction({
        to: contract.target,
        value: ethers.parseEther(fundAmount),
      });
      await tx.wait();
      showToast("success", "Treasury funded successfully!");
      setFundAmount("");
      refreshTreasuryBalance();
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page treasury-page">
      <TransactionToast toasts={toasts} onDismiss={dismissToast} />
      <h2>Treasury</h2>

      <div className="card">
        <h3>Current Balance</h3>
        <p className="treasury-balance">
          {treasuryBalance !== null ? `${treasuryBalance} ETH` : "Loading..."}
        </p>
      </div>

      <div className="card">
        <h3>Fund Treasury</h3>
        <input
          type="number"
          placeholder="Amount in ETH"
          value={fundAmount}
          onChange={(e) => setFundAmount(e.target.value)}
          className="text-input"
          min="0"
          step="any"
        />
        <button className="btn btn-primary" onClick={handleFundTreasury} disabled={isSubmitting}>
          Send to Treasury
        </button>
      </div>

      <div className="card">
        <h3>Transaction History</h3>
        {executedProposals.length === 0 ? (
          <p className="empty-state">No executed proposals yet.</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Proposal ID</th>
                <th>Purpose</th>
                <th>Amount</th>
                <th>Recipient</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {executedProposals.map((row) => (
                <tr key={row.proposalId}>
                  <td>{row.proposalId}</td>
                  <td>{row.purpose}</td>
                  <td>{row.amountEth} ETH</td>
                  <td>{row.recipient}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Treasury;