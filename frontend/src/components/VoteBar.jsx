function VoteBar({ yesVotes, noVotes }) {
  const yes = Number(yesVotes);
  const no = Number(noVotes);
  const total = yes + no;

  const yesPercent = total === 0 ? 0 : Math.round((yes / total) * 100);
  const noPercent = total === 0 ? 0 : 100 - yesPercent;

  return (
    <div className="vote-bar-container">
      <div className="vote-bar">
        <div className="vote-bar-yes" style={{ width: `${yesPercent}%` }} />
        <div className="vote-bar-no" style={{ width: `${noPercent}%` }} />
      </div>
      <div className="vote-bar-labels">
        <span className="vote-label-yes">YES: {yes}</span>
        <span className="vote-label-no">NO: {no}</span>
      </div>
    </div>
  );
}

export default VoteBar;