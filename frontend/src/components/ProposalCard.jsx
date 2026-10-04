import StatusBadge from "./StatusBadge";
import VoteBar from "./VoteBar";

const STATUS_VOTING = 1;
const STATUS_APPROVED = 2;

function formatTimeRemaining(deadline) {
  const now = Math.floor(Date.now() / 1000);
  const deadlineNum = Number(deadline);

  if (now >= deadlineNum) {
    return "Voting Ended";
  }

  const secondsLeft = deadlineNum - now;
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

function ProposalCard({
  proposal,
  hasVoted,
  quorumReached,
  onVoteYes,
  onVoteNo,
  onFinalize,
  onExecute,
  isSubmitting,
}) {
  const now = Math.floor(Date.now() / 1000);
  const deadlinePassed = now >= Number(proposal.deadline);
  const status = Number(proposal.status);

  return (
    <div className="proposal-card">
      <div className="proposal-card-header">
        <span className="proposal-id">#{proposal.proposalId.toString()}</span>
        <StatusBadge status={status} />
      </div>

      <h3 className="proposal-purpose">{proposal.purpose}</h3>
      <p className="proposal-amount">{proposal.amountEth} ETH</p>

      <VoteBar yesVotes={proposal.yesVotes} noVotes={proposal.noVotes} />

      <div className="proposal-meta">
        <span>{formatTimeRemaining(proposal.deadline)}</span>
        <span className={quorumReached ? "quorum-met" : "quorum-not-met"}>
          {quorumReached ? "Quorum reached" : "Quorum not yet reached"}
        </span>
      </div>

      <div className="proposal-actions">
        {status === STATUS_VOTING && !deadlinePassed && (
          <>
            <button
              className="btn btn-success"
              onClick={() => onVoteYes(proposal.proposalId)}
              disabled={hasVoted || isSubmitting}
            >
              Vote YES
            </button>
            <button
              className="btn btn-danger"
              onClick={() => onVoteNo(proposal.proposalId)}
              disabled={hasVoted || isSubmitting}
            >
              Vote NO
            </button>
          </>
        )}

        {status === STATUS_VOTING && deadlinePassed && (
          <button
            className="btn btn-secondary"
            onClick={() => onFinalize(proposal.proposalId)}
            disabled={isSubmitting}
          >
            Finalize Proposal
          </button>
        )}

        {status === STATUS_APPROVED && (
          <button
            className="btn btn-primary"
            onClick={() => onExecute(proposal.proposalId)}
            disabled={isSubmitting}
          >
            Execute & Release Funds
          </button>
        )}
      </div>
    </div>
  );
}

export default ProposalCard;