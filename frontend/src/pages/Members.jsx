import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useContract, ROLES, parseContractError } from "../hooks/useContract";
import MemberList from "../components/MemberList";
import TransactionToast from "../components/TransactionToast";

function Members({ wallet }) {
  const { contract, readOnlyContract, role } = useContract(
    wallet.signer,
    wallet.provider,
    wallet.account
  );

  const [proposeAddress, setProposeAddress] = useState("");
  const [pendingMembers, setPendingMembers] = useState([]);
  const [registeredMembers, setRegisteredMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshMembers = useCallback(async () => {
    if (!readOnlyContract) return;

    try {
      const count = await readOnlyContract.getMemberCount();
      setMemberCount(Number(count));

      // Build registered member list from MemberRegistered events, since
      // the contract has no array-returning getter for all members.
      const filter = readOnlyContract.filters.MemberRegistered();
      const events = await readOnlyContract.queryFilter(filter, 0, "latest");

      const members = [];
      for (const event of events) {
        const addr = event.args.member;
        const isStillMember = await readOnlyContract.isMember(addr);
        if (isStillMember) {
          members.push({
            walletAddress: addr,
            displayName: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          });
        }
      }
      setRegisteredMembers(members);

      const proposedFilter = readOnlyContract.filters.MemberProposed();
      const proposedEvents = await readOnlyContract.queryFilter(proposedFilter, 0, "latest");

      const pending = [];
      for (const event of proposedEvents) {
        const addr = event.args.member;
        const alreadyRegistered = await readOnlyContract.isMember(addr);
        if (!alreadyRegistered) {
          pending.push(addr);
        }
      }
      setPendingMembers(pending);
    } catch (err) {
      console.error("Failed to refresh members:", err);
    }
  }, [readOnlyContract]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  const handleProposeMember = async () => {
    if (!contract || !ethers.isAddress(proposeAddress)) {
      showToast("error", "Please enter a valid wallet address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await contract.proposeMember(proposeAddress);
      await tx.wait();
      showToast("success", "Member proposed successfully!");
      setProposeAddress("");
      refreshMembers();
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveMember = async (address) => {
    if (!contract) return;

    setIsSubmitting(true);
    try {
      const tx = await contract.approveMember(address);
      await tx.wait();
      showToast("success", "Member approved successfully!");
      refreshMembers();
    } catch (error) {
      showToast("error", parseContractError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page members-page">
      <TransactionToast toasts={toasts} onDismiss={dismissToast} />
      <h2>Members</h2>

      {role === ROLES.PRESIDENT && (
        <div className="card">
          <h3>Propose a New Member</h3>
          <input
            type="text"
            placeholder="Wallet address (0x...)"
            value={proposeAddress}
            onChange={(e) => setProposeAddress(e.target.value)}
            className="text-input"
          />
          <button
            className="btn btn-primary"
            onClick={handleProposeMember}
            disabled={isSubmitting}
          >
            Propose Member
          </button>

          <h4>Pending Approval</h4>
          {pendingMembers.length === 0 ? (
            <p className="empty-state">No members awaiting faculty approval.</p>
          ) : (
            <ul className="pending-list">
              {pendingMembers.map((addr) => (
                <li key={addr}>{addr}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {role === ROLES.FACULTY && (
        <div className="card">
          <h3>Members Awaiting Your Approval</h3>
          {pendingMembers.length === 0 ? (
            <p className="empty-state">No members awaiting approval.</p>
          ) : (
            <ul className="pending-list">
              {pendingMembers.map((addr) => (
                <li key={addr} className="pending-list-item">
                  <span>{addr}</span>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApproveMember(addr)}
                    disabled={isSubmitting}
                  >
                    Approve Member
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card">
        <MemberList members={registeredMembers} totalCount={memberCount} />
      </div>
    </div>
  );
}

export default Members;