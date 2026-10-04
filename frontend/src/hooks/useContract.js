import { useState, useEffect, useMemo, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "../constants/contractAddress";
import { CONTRACT_ABI } from "../constants/contractABI";

export const ROLES = {
  PRESIDENT: "President",
  FACULTY: "Faculty Advisor",
  MEMBER: "Member",
  NOT_REGISTERED: "Not Registered",
};

export function useContract(signer, provider, account) {
  const [role, setRole] = useState(ROLES.NOT_REGISTERED);
  const [treasuryBalance, setTreasuryBalance] = useState(null);

  const contract = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    } catch (err) {
      return null;
    }
  }, [signer]);

  const readOnlyContract = useMemo(() => {
    if (!provider) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch (err) {
      return null;
    }
  }, [provider]);

  const refreshRole = useCallback(async () => {
    if (!readOnlyContract || !account) {
      setRole(ROLES.NOT_REGISTERED);
      return;
    }

    try {
      const presidentAddr = await readOnlyContract.president();
      const facultyAddr = await readOnlyContract.facultyAdvisor();

      if (account.toLowerCase() === presidentAddr.toLowerCase()) {
        setRole(ROLES.PRESIDENT);
        return;
      }

      if (account.toLowerCase() === facultyAddr.toLowerCase()) {
        setRole(ROLES.FACULTY);
        return;
      }

      const memberStatus = await readOnlyContract.isMember(account);
      setRole(memberStatus ? ROLES.MEMBER : ROLES.NOT_REGISTERED);
    } catch (err) {
      setRole(ROLES.NOT_REGISTERED);
    }
  }, [readOnlyContract, account]);

  const refreshTreasuryBalance = useCallback(async () => {
    if (!readOnlyContract) {
      setTreasuryBalance(null);
      return;
    }

    try {
      const balance = await readOnlyContract.getTreasuryBalance();
      setTreasuryBalance(ethers.formatEther(balance));
    } catch (err) {
      setTreasuryBalance(null);
    }
  }, [readOnlyContract]);

  useEffect(() => {
    refreshRole();
    refreshTreasuryBalance();
  }, [refreshRole, refreshTreasuryBalance]);

  return {
    contract,
    readOnlyContract,
    role,
    treasuryBalance,
    refreshRole,
    refreshTreasuryBalance,
  };
}

// Parses a Solidity revert reason out of a thrown error into a
// readable UI message, per Section 6's required error-handling pattern.
export function parseContractError(error) {
  if (error.reason) {
    return error.reason;
  }
  if (error.message && error.message.includes("user rejected")) {
    return "Transaction cancelled.";
  }
  if (error.shortMessage) {
    return error.shortMessage;
  }
  return "Transaction failed. Check console for details.";
}