function MemberList({ members, totalCount }) {
  return (
    <div className="member-list">
      <h3>Registered Members ({totalCount})</h3>
      {members.length === 0 ? (
        <p className="empty-state">No members registered yet.</p>
      ) : (
        <ul className="member-list-items">
          {members.map((member) => (
            <li key={member.walletAddress} className="member-list-item">
              <span className="member-display-name">{member.displayName}</span>
              <span className="member-wallet">{member.walletAddress}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MemberList;