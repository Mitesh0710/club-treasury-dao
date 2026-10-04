import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useContract, ROLES, parseContractError } from "../hooks/useContract";
import ProposalCard from "../components/ProposalCard";
import TransactionToast from "../components/TransactionToast";

function Proposals({ wallet }) {
  const { contract, readOnlyContract, role } = useContract(
    wallet.signer,
    wallet.provider,
    wallet.account
  );

  const [proposals, setProposals] = useState([]);
  const [votedMap, setVotedMap] = useState({});
  const [quorumMap, setQuorumMap] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [purpose, setPurpose] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [recipient, setRecipient] = useState("");
  const [durationHours, setDurationHours] = useState("");

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshProposals = useCallback(async () => {
    if (!readOnlyContract) return;

    try {
      const count = await readOnlyContract.proposalCount();
      const list = [];
      const voted = {};
      const quorum = {};

      for (let i = 0; i < Number(count); i++) {
        const p = await readOnlyContract.getProposal(i);
        list.push({
          proposalId: p.proposalId,
          purpose: p.purpose,
          amount: p.amount,
          amountEth: ethers.formatEther(p.amount),
          recipient: p.recipient,
          deadline: p.deadline,
          yesVotes: p.yesVotes,
          noVotes: p.noVotes,
          totalVotes: p.totalVotes,
          status: p.status,
          executed: p.executed,
          proposer: p.proposer,
        });

        if (wallet.account) {
          const hasVoted = await readOnlyContract.hasVoted(wallet.account, i);
          voted[i] = hasVoted;
        }

        const result = await readOnlyContract.getVotingResult(i);
        quorum[i] = result.quorumReached;
      }

      setProposals(list.reverse());
      setVotedMap(voted);
      setQuorumMap(quorum);
    } catch (err) {
      console.error("Failed to refresh proposals:", err);
    }
  }, [readOnlyContract, wallet.account]);

  useEffect(() => {
    refreshProposals();
  }, [refreshProposals]);

  const handleCreateProposal = async () => {
    if (!contract) return;

    if (!purpose || !amountEth || !ethers.isAddress(recipient) || !durationHours) {
      showToast("error", "Please fill in all fields with valid values.");
      return;
    }

    setIsSubmitting(true);
    try {
      const amountWei = ethers.parseEther(amountEth);
      const durationSeconds = Math.round(Number(durationHours) * 3600);

      const tx = await contract.createProposal(purpose, amountWei, recipient, durationSeconds);
      await tx.wait();
      showToast("success", "Proposal created successfully!");
      setPurpose("");
      setAmountEth("");
      setRecipient("");
      setDurationHours("");
      refreshProposals();
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (proposalId, voteYes) => {
    if (!contract) return;

    setIsSubmitting(true);
    try {
      const tx = await contract.voteOnProposal(proposalId, voteYes);
      await tx.wait();
      showToast("success", "Vote cast successfully!");
      refreshProposals();
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async (proposalId) => {
    if (!contract) return;

    setIsSubmitting(true);
    try {
      const tx = await contract.finalizeProposal(proposalId);
      await tx.wait();
      showToast("success", "Proposal finalized!");
      refreshProposals();
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecute = async (proposalId) => {
    if (!contract) return;

    setIsSubmitting(true);
    try {
      const tx = await contract.executeProposal(proposalId);
      await tx.wait();
      showToast("success", "Funds released successfully!");
      refreshProposals();
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page proposals-page">
      <TransactionToast toasts={toasts} onDismiss={dismissToast} />
      <h2>Proposals</h2>

      {(role === ROLES.PRESIDENT || role === ROLES.MEMBER) && (
        <div className="card">
          <h3>Create New Proposal</h3>
          <input
            type="text"
            placeholder="Purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="text-input"
          />
          <input
            type="number"
            placeholder="Amount in ETH"
            value={amountEth}
            onChange={(e) => setAmountEth(e.target.value)}
            className="text-input"
            min="0"
            step="any"
          />
          <input
            type="text"
            placeholder="Recipient wallet address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="text-input"
          />
          <input
            type="number"
            placeholder="Voting duration in hours (minimum 1)"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            className="text-input"
            min="1"
            step="any"
          />
          <button className="btn btn-primary" onClick={handleCreateProposal} disabled={isSubmitting}>
            Submit Proposal
          </button>
        </div>
      )}

      <div className="proposal-list">
        {proposals.length === 0 ? (
          <p className="empty-state">No proposals yet.</p>
        ) : (
          proposals.map((p) => (
            <ProposalCard
              key={p.proposalId.toString()}
              proposal={p}
              hasVoted={votedMap[p.proposalId] || false}
              quorumReached={quorumMap[p.proposalId] || false}
              onVoteYes={(id) => handleVote(id, true)}
              onVoteNo={(id) => handleVote(id, false)}
              onFinalize={handleFinalize}
              onExecute={handleExecute}
              isSubmitting={isSubmitting}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Proposals;