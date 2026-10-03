const { ethers } = require("ethers");
require("dotenv").config();
const mongoose = require("mongoose");

const contractABI = require("../frontend/src/constants/contractABI.js");
const Member = require("./models/Member");
const Proposal = require("./models/Proposal");

const MONGODB_URI = process.env.MONGODB_URI;
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Listener connected to MongoDB");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.CONTRACT_ABI, provider);

  console.log("Listening for ClubDAO events on", CONTRACT_ADDRESS);

  contract.on("MemberProposed", (member, timestamp) => {
    console.log(`[${new Date().toISOString()}] MemberProposed:`, member, timestamp.toString());
  });

  contract.on("MemberRegistered", async (member, timestamp) => {
    console.log(`[${new Date().toISOString()}] MemberRegistered:`, member, timestamp.toString());

    try {
      const existing = await Member.findOne({ walletAddress: member.toLowerCase() });
      if (!existing) {
        await Member.create({
          walletAddress: member.toLowerCase(),
          displayName: `Member ${member.slice(0, 6)}...${member.slice(-4)}`,
        });
        console.log("Created placeholder member profile for", member);
      }
    } catch (error) {
      console.error("Error creating placeholder member profile:", error.message);
    }
  });

  contract.on("TreasuryFunded", (sender, amount, timestamp) => {
    console.log(
      `[${new Date().toISOString()}] TreasuryFunded:`,
      sender,
      ethers.formatEther(amount),
      "ETH",
      timestamp.toString()
    );
  });

  contract.on("ProposalCreated", async (proposalId, proposer, purpose, amount, deadline) => {
    console.log(
      `[${new Date().toISOString()}] ProposalCreated:`,
      proposalId.toString(),
      proposer,
      purpose,
      ethers.formatEther(amount),
      "ETH",
      deadline.toString()
    );

    try {
      const existing = await Proposal.findOne({ proposalId: Number(proposalId) });
      if (!existing) {
        await Proposal.create({
          proposalId: Number(proposalId),
          title: purpose,
          creatorWallet: proposer.toLowerCase(),
        });
        console.log("Created placeholder proposal metadata for proposal", proposalId.toString());
      }
    } catch (error) {
      console.error("Error creating placeholder proposal metadata:", error.message);
    }
  });

  contract.on("VoteCast", (proposalId, voter, voteYes) => {
    console.log(
      `[${new Date().toISOString()}] VoteCast:`,
      proposalId.toString(),
      voter,
      voteYes ? "YES" : "NO"
    );
  });

  contract.on("ProposalFinalized", (proposalId, approved, yesVotes, noVotes, totalVotes) => {
    console.log(
      `[${new Date().toISOString()}] ProposalFinalized:`,
      proposalId.toString(),
      approved ? "APPROVED" : "REJECTED",
      "yes:",
      yesVotes.toString(),
      "no:",
      noVotes.toString(),
      "total:",
      totalVotes.toString()
    );
  });

  contract.on("ProposalExecuted", (proposalId, recipient, amount, timestamp) => {
    console.log(
      `[${new Date().toISOString()}] ProposalExecuted:`,
      proposalId.toString(),
      recipient,
      ethers.formatEther(amount),
      "ETH",
      timestamp.toString()
    );
  });
}

main().catch((error) => {
  console.error("Listener failed to start:", error);
  process.exit(1);
});