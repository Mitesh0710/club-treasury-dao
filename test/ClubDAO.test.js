const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("ClubDAO", function () {
  let ClubDAO, clubDAO;
  let president, faculty, memberA, memberB, vendor, outsider;

  const ONE_HOUR = 3600;
  const SEVEN_DAYS = 7 * 24 * 3600;
  const INITIAL_TREASURY = ethers.parseEther("0.1");

  beforeEach(async function () {
    [president, faculty, memberA, memberB, vendor, outsider] = await ethers.getSigners();

    ClubDAO = await ethers.getContractFactory("ClubDAO");
    clubDAO = await ClubDAO.connect(president).deploy(faculty.address, {
      value: INITIAL_TREASURY,
    });
    await clubDAO.waitForDeployment();
  });

  async function increaseTime(seconds) {
    await network.provider.send("evm_increaseTime", [seconds]);
    await network.provider.send("evm_mine");
  }

  async function registerMember(memberSigner) {
    await clubDAO.connect(president).proposeMember(memberSigner.address);
    await clubDAO.connect(faculty).approveMember(memberSigner.address);
  }

  // ────────────────────────────────────────────────
  // DEPLOYMENT TESTS
  // ────────────────────────────────────────────────
  describe("Deployment", function () {
    it("Should deploy with president set correctly", async function () {
      expect(await clubDAO.president()).to.equal(president.address);
    });

    it("Should deploy with faculty advisor set correctly", async function () {
      expect(await clubDAO.facultyAdvisor()).to.equal(faculty.address);
    });

    it("Should auto-register president as first member", async function () {
      expect(await clubDAO.isMember(president.address)).to.equal(true);
      expect(await clubDAO.getMemberCount()).to.equal(1);
    });

    it("Should reject deployment if president and faculty are same address", async function () {
      await expect(
        ClubDAO.connect(president).deploy(president.address)
      ).to.be.revertedWith("President and Faculty cannot be same");
    });

    it("Should accept ETH on deployment", async function () {
      const balance = await ethers.provider.getBalance(await clubDAO.getAddress());
      expect(balance).to.equal(INITIAL_TREASURY);
    });
  });

  // ────────────────────────────────────────────────
  // MEMBER REGISTRATION TESTS
  // ────────────────────────────────────────────────
  describe("Member Registration", function () {
    it("President can propose a member", async function () {
      await clubDAO.connect(president).proposeMember(memberA.address);
      expect(await clubDAO.presidentApprovedMember(memberA.address)).to.equal(true);
    });

    it("Non-president cannot propose a member (expect revert)", async function () {
      await expect(
        clubDAO.connect(memberA).proposeMember(memberB.address)
      ).to.be.revertedWith("Only president");
    });

    it("Faculty advisor can approve a proposed member", async function () {
      await clubDAO.connect(president).proposeMember(memberA.address);
      await clubDAO.connect(faculty).approveMember(memberA.address);
      expect(await clubDAO.isMember(memberA.address)).to.equal(true);
    });

    it("Faculty advisor cannot approve a non-proposed member (expect revert)", async function () {
      await expect(
        clubDAO.connect(faculty).approveMember(memberA.address)
      ).to.be.revertedWith("Not proposed by president");
    });

    it("Cannot register an already-registered member (expect revert)", async function () {
      await registerMember(memberA);
      await expect(
        clubDAO.connect(president).proposeMember(memberA.address)
      ).to.be.revertedWith("Already registered");
    });

    it("Registered member count increments correctly", async function () {
      expect(await clubDAO.getMemberCount()).to.equal(1);
      await registerMember(memberA);
      expect(await clubDAO.getMemberCount()).to.equal(2);
      await registerMember(memberB);
      expect(await clubDAO.getMemberCount()).to.equal(3);
    });
  });

  // ────────────────────────────────────────────────
  // PROPOSAL TESTS
  // ────────────────────────────────────────────────
  describe("Proposals", function () {
    beforeEach(async function () {
      await registerMember(memberA);
    });

    it("Registered member can create a proposal", async function () {
      await clubDAO
        .connect(memberA)
        .createProposal("Workshop", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      expect(await clubDAO.proposalCount()).to.equal(1);
    });

    it("Non-member cannot create a proposal (expect revert)", async function () {
      await expect(
        clubDAO
          .connect(outsider)
          .createProposal("Workshop", ethers.parseEther("0.01"), vendor.address, ONE_HOUR)
      ).to.be.revertedWith("Not a registered member");
    });

    it("Proposal amount cannot exceed treasury balance (expect revert)", async function () {
      await expect(
        clubDAO
          .connect(memberA)
          .createProposal("Too much", ethers.parseEther("999"), vendor.address, ONE_HOUR)
      ).to.be.revertedWith("Invalid amount");
    });

    it("Proposal with zero amount is rejected (expect revert)", async function () {
      await expect(
        clubDAO.connect(memberA).createProposal("Zero", 0, vendor.address, ONE_HOUR)
      ).to.be.revertedWith("Invalid amount");
    });

    it("Proposal count increments after creation", async function () {
      await clubDAO
        .connect(memberA)
        .createProposal("First", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      expect(await clubDAO.proposalCount()).to.equal(1);
      await clubDAO
        .connect(memberA)
        .createProposal("Second", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      expect(await clubDAO.proposalCount()).to.equal(2);
    });
  });

  // ────────────────────────────────────────────────
  // VOTING TESTS
  // ────────────────────────────────────────────────
  describe("Voting", function () {
    beforeEach(async function () {
      await registerMember(memberA);
      // clear the 7-day vote-eligibility delay so memberA can vote on
      // proposals created after this point
      await increaseTime(SEVEN_DAYS);
      await clubDAO
        .connect(president)
        .createProposal("Vote test", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
    });

    it("Registered member can vote YES", async function () {
      await clubDAO.connect(memberA).voteOnProposal(0, true);
      const proposal = await clubDAO.getProposal(0);
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.totalVotes).to.equal(1);
    });

    it("Registered member can vote NO", async function () {
      await clubDAO.connect(memberA).voteOnProposal(0, false);
      const proposal = await clubDAO.getProposal(0);
      expect(proposal.noVotes).to.equal(1);
      expect(proposal.totalVotes).to.equal(1);
    });

    it("Member cannot vote twice on same proposal (expect revert)", async function () {
      await clubDAO.connect(memberA).voteOnProposal(0, true);
      await expect(
        clubDAO.connect(memberA).voteOnProposal(0, true)
      ).to.be.revertedWith("Already voted");
    });

    it("Cannot vote after deadline (expect revert)", async function () {
      await increaseTime(ONE_HOUR + 1);
      await expect(
        clubDAO.connect(memberA).voteOnProposal(0, true)
      ).to.be.revertedWith("Voting has ended");
    });

    it("Non-member cannot vote (expect revert)", async function () {
      await expect(
        clubDAO.connect(outsider).voteOnProposal(0, true)
      ).to.be.revertedWith("Not a registered member");
    });
  });

  // ────────────────────────────────────────────────
  // FINALIZATION TESTS
  // ────────────────────────────────────────────────
  describe("Finalization", function () {
    beforeEach(async function () {
      await registerMember(memberA);
      await registerMember(memberB);
      await increaseTime(SEVEN_DAYS);
    });

    it("Cannot finalize before deadline (expect revert)", async function () {
      await clubDAO
        .connect(president)
        .createProposal("F1", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      await expect(
        clubDAO.connect(memberA).finalizeProposal(0)
      ).to.be.revertedWith("Voting still active");
    });

    it("Proposal approved when quorum and majority both met", async function () {
      await clubDAO
        .connect(president)
        .createProposal("F2", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      // 3 of 3 members vote YES -> 100% quorum, 100% majority
      await clubDAO.connect(president).voteOnProposal(0, true);
      await clubDAO.connect(memberA).voteOnProposal(0, true);
      await clubDAO.connect(memberB).voteOnProposal(0, true);
      await increaseTime(ONE_HOUR + 1);
      await clubDAO.connect(memberA).finalizeProposal(0);
      const proposal = await clubDAO.getProposal(0);
      expect(proposal.status).to.equal(2); // APPROVED
    });

    it("Proposal rejected when quorum not met", async function () {
      await clubDAO
        .connect(president)
        .createProposal("F3", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      // only 1 of 3 members votes -> ~33% turnout, quorum requires >= 50%
      await clubDAO.connect(president).voteOnProposal(0, true);
      await increaseTime(ONE_HOUR + 1);
      await clubDAO.connect(memberA).finalizeProposal(0);
      const proposal = await clubDAO.getProposal(0);
      expect(proposal.status).to.equal(3); // REJECTED
    });

    it("Proposal rejected when quorum met but majority not met", async function () {
      await clubDAO
        .connect(president)
        .createProposal("F4", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      // all 3 vote (100% quorum), but only 1 YES / 2 NO -> majority fails
      await clubDAO.connect(president).voteOnProposal(0, true);
      await clubDAO.connect(memberA).voteOnProposal(0, false);
      await clubDAO.connect(memberB).voteOnProposal(0, false);
      await increaseTime(ONE_HOUR + 1);
      await clubDAO.connect(memberA).finalizeProposal(0);
      const proposal = await clubDAO.getProposal(0);
      expect(proposal.status).to.equal(3); // REJECTED
    });

    it("Cannot finalize an already-finalized proposal (expect revert)", async function () {
      await clubDAO
        .connect(president)
        .createProposal("F5", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      await clubDAO.connect(president).voteOnProposal(0, true);
      await clubDAO.connect(memberA).voteOnProposal(0, true);
      await increaseTime(ONE_HOUR + 1);
      await clubDAO.connect(memberA).finalizeProposal(0);
      await expect(
        clubDAO.connect(memberA).finalizeProposal(0)
      ).to.be.revertedWith("Proposal not in voting state");
    });
  });

  // ────────────────────────────────────────────────
  // EXECUTION TESTS
  // ────────────────────────────────────────────────
  describe("Execution", function () {
    beforeEach(async function () {
      await registerMember(memberA);
      await increaseTime(SEVEN_DAYS);
      await clubDAO
        .connect(president)
        .createProposal("Exec test", ethers.parseEther("0.02"), vendor.address, ONE_HOUR);
      await clubDAO.connect(president).voteOnProposal(0, true);
      await clubDAO.connect(memberA).voteOnProposal(0, true);
      await increaseTime(ONE_HOUR + 1);
      await clubDAO.connect(memberA).finalizeProposal(0);
    });

    it("Approved proposal can be executed", async function () {
      await clubDAO.connect(memberA).executeProposal(0);
      const proposal = await clubDAO.getProposal(0);
      expect(proposal.status).to.equal(4); // EXECUTED
      expect(proposal.executed).to.equal(true);
    });

    it("Funds transferred to correct recipient", async function () {
      const balanceBefore = await ethers.provider.getBalance(vendor.address);
      await clubDAO.connect(memberA).executeProposal(0);
      const balanceAfter = await ethers.provider.getBalance(vendor.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.02"));
    });

    it("Cannot execute a rejected proposal (expect revert)", async function () {
      // create a second proposal that nobody votes on -> quorum fails -> rejected
      await clubDAO
        .connect(president)
        .createProposal("Reject test", ethers.parseEther("0.01"), vendor.address, ONE_HOUR);
      await increaseTime(ONE_HOUR + 1);
      await clubDAO.connect(memberA).finalizeProposal(1);
      await expect(
        clubDAO.connect(memberA).executeProposal(1)
      ).to.be.revertedWith("Proposal not approved");
    });

    it("Cannot execute same proposal twice (expect revert)", async function () {
      await clubDAO.connect(memberA).executeProposal(0);
      await expect(
        clubDAO.connect(memberA).executeProposal(0)
      ).to.be.revertedWith("Proposal not approved");
    });

    it("Treasury balance decreases after execution", async function () {
      const treasuryBefore = await clubDAO.getTreasuryBalance();
      await clubDAO.connect(memberA).executeProposal(0);
      const treasuryAfter = await clubDAO.getTreasuryBalance();
      expect(treasuryBefore - treasuryAfter).to.equal(ethers.parseEther("0.02"));
    });
  });
});