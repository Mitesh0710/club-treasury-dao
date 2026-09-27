// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ClubDAO {

    struct Member {
        address walletAddress;
        bool isRegistered;
        bool presidentApproved;
        bool facultyApproved;
        uint256 registrationTimestamp;
    }

    enum ProposalStatus {
        CREATED,
        VOTING,
        APPROVED,
        REJECTED,
        EXECUTED
    }

    struct Proposal {
        uint256 proposalId;
        string purpose;
        uint256 amount;
        address payable recipient;
        uint256 deadline;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalVotes;
        ProposalStatus status;
        bool executed;
        address proposer;
        uint256 creationTimestamp;
    }

    mapping(address => Member) public members;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    mapping(address => bool) public presidentApprovedMember;

    address public president;
    address public facultyAdvisor;
    uint256 public registeredMemberCount;
    uint256 public proposalCount;
    uint256 public constant QUORUM_PERCENT = 50;
    uint256 public constant MAJORITY_PERCENT = 50;
    uint256 public constant VOTE_ELIGIBILITY_DELAY = 7 days;

    event MemberProposed(address indexed member, uint256 timestamp);
    event MemberRegistered(address indexed member, uint256 timestamp);
    event TreasuryFunded(address indexed sender, uint256 amount, uint256 timestamp);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string purpose,
        uint256 amount,
        uint256 deadline
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool voteYes);
    event ProposalFinalized(
        uint256 indexed proposalId,
        bool approved,
        uint256 yesVotes,
        uint256 noVotes,
        uint256 totalVotes
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    modifier onlyPresident() {
        require(msg.sender == president, "Only president");
        _;
    }

    modifier onlyFaculty() {
        require(msg.sender == facultyAdvisor, "Only faculty advisor");
        _;
    }

    modifier onlyMember() {
        require(members[msg.sender].isRegistered, "Not a registered member");
        _;
    }

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "Proposal does not exist");
        _;
    }

    constructor(address _facultyAdvisor) payable {
        require(_facultyAdvisor != msg.sender, "President and Faculty cannot be same");
        president = msg.sender;
        facultyAdvisor = _facultyAdvisor;

        members[msg.sender].walletAddress = msg.sender;
        members[msg.sender].isRegistered = true;
        members[msg.sender].presidentApproved = true;
        members[msg.sender].facultyApproved = true;
        members[msg.sender].registrationTimestamp = block.timestamp;
        registeredMemberCount = 1;

        emit MemberRegistered(msg.sender, block.timestamp);
    }

    receive() external payable {
        emit TreasuryFunded(msg.sender, msg.value, block.timestamp);
    }

    // FUNCTION 1
    function proposeMember(address _newMember) external onlyPresident {
        require(!members[_newMember].isRegistered, "Already registered");
        require(!presidentApprovedMember[_newMember], "Already proposed");

        presidentApprovedMember[_newMember] = true;

        emit MemberProposed(_newMember, block.timestamp);
    }

    // FUNCTION 2
    function approveMember(address _newMember) external onlyFaculty {
        require(presidentApprovedMember[_newMember], "Not proposed by president");
        require(!members[_newMember].isRegistered, "Already registered");

        members[_newMember].walletAddress = _newMember;
        members[_newMember].isRegistered = true;
        members[_newMember].presidentApproved = true;
        members[_newMember].facultyApproved = true;
        members[_newMember].registrationTimestamp = block.timestamp;

        registeredMemberCount += 1;

        emit MemberRegistered(_newMember, block.timestamp);
    }

    // FUNCTION 3
    function createProposal(
        string memory _purpose,
        uint256 _amount,
        address payable _recipient,
        uint256 _votingDurationSeconds
    ) external onlyMember {
        require(_amount > 0 && _amount <= address(this).balance, "Invalid amount");
        require(_recipient != address(0), "Invalid recipient");
        require(_votingDurationSeconds >= 3600, "Voting duration too short");

        uint256 newProposalId = proposalCount;
        uint256 deadline = block.timestamp + _votingDurationSeconds;

        Proposal storage p = proposals[newProposalId];
        p.proposalId = newProposalId;
        p.purpose = _purpose;
        p.amount = _amount;
        p.recipient = _recipient;
        p.deadline = deadline;
        p.yesVotes = 0;
        p.noVotes = 0;
        p.totalVotes = 0;
        p.status = ProposalStatus.VOTING;
        p.executed = false;
        p.proposer = msg.sender;
        p.creationTimestamp = block.timestamp;

        proposalCount += 1;

        emit ProposalCreated(newProposalId, msg.sender, _purpose, _amount, deadline);
    }

    // FUNCTION 4
    function voteOnProposal(uint256 _proposalId, bool _voteYes)
        external
        onlyMember
        proposalExists(_proposalId)
    {
        require(!hasVoted[msg.sender][_proposalId], "Already voted");

        Proposal storage p = proposals[_proposalId];

        require(p.status == ProposalStatus.VOTING, "Proposal not in voting state");
        require(block.timestamp < p.deadline, "Voting has ended");
        require(
            members[msg.sender].registrationTimestamp + VOTE_ELIGIBILITY_DELAY <= p.creationTimestamp
                || msg.sender == president,
            "Member registered too recently to vote on this proposal"
        );

        hasVoted[msg.sender][_proposalId] = true;

        if (_voteYes) {
            p.yesVotes += 1;
        } else {
            p.noVotes += 1;
        }
        p.totalVotes += 1;

        emit VoteCast(_proposalId, msg.sender, _voteYes);
    }

    // FUNCTION 5
    function finalizeProposal(uint256 _proposalId)
        external
        onlyMember
        proposalExists(_proposalId)
    {
        Proposal storage p = proposals[_proposalId];

        require(p.status == ProposalStatus.VOTING, "Proposal not in voting state");
        require(block.timestamp >= p.deadline, "Voting still active");

        bool quorumReached = (p.totalVotes * 100 >= registeredMemberCount * QUORUM_PERCENT);
        bool majorityYes = (p.yesVotes * 100 > p.totalVotes * MAJORITY_PERCENT);

        if (quorumReached && majorityYes) {
            p.status = ProposalStatus.APPROVED;
        } else {
            p.status = ProposalStatus.REJECTED;
        }

        emit ProposalFinalized(_proposalId, (quorumReached && majorityYes), p.yesVotes, p.noVotes, p.totalVotes);
    }

    // FUNCTION 6
    function executeProposal(uint256 _proposalId)
        external
        onlyMember
        proposalExists(_proposalId)
    {
        Proposal storage p = proposals[_proposalId];

        // CHECK
        require(p.status == ProposalStatus.APPROVED, "Proposal not approved");
        require(!p.executed, "Already executed");
        require(p.amount <= address(this).balance, "Insufficient treasury");

        // EFFECT
        p.executed = true;
        p.status = ProposalStatus.EXECUTED;

        // INTERACT
        (bool success, ) = p.recipient.call{value: p.amount}("");
        require(success, "Transfer failed");

        emit ProposalExecuted(_proposalId, p.recipient, p.amount, block.timestamp);
    }

    // FUNCTION 7
    function getProposal(uint256 _proposalId)
        public
        view
        proposalExists(_proposalId)
        returns (Proposal memory)
    {
        return proposals[_proposalId];
    }

    // FUNCTION 8
    function getTreasuryBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // FUNCTION 9
    function getVotingResult(uint256 _proposalId)
        public
        view
        proposalExists(_proposalId)
        returns (
            uint256 yesVotes,
            uint256 noVotes,
            uint256 totalVotes,
            bool quorumReached,
            ProposalStatus status
        )
    {
        Proposal storage p = proposals[_proposalId];
        bool reached = (p.totalVotes * 100 >= registeredMemberCount * QUORUM_PERCENT);

        return (p.yesVotes, p.noVotes, p.totalVotes, reached, p.status);
    }

    // FUNCTION 10
    function isMember(address _addr) public view returns (bool) {
        return members[_addr].isRegistered;
    }

    // FUNCTION 11
    function getMemberCount() public view returns (uint256) {
        return registeredMemberCount;
    }
}