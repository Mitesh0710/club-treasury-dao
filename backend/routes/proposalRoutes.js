const express = require("express");
const router = express.Router();
const Proposal = require("../models/Proposal");

// POST /api/proposals — Save proposal metadata (called after on-chain creation)
router.post("/", async (req, res) => {
  try {
    const { proposalId, title, description, attachmentUrl, creatorWallet } = req.body;

    if (proposalId === undefined || proposalId === null || !title) {
      return res.status(400).json({ error: "proposalId and title are required" });
    }

    if (creatorWallet && !/^0x[a-fA-F0-9]{40}$/.test(creatorWallet)) {
      return res.status(400).json({ error: "Invalid creatorWallet address format" });
    }

    const proposal = new Proposal({
      proposalId,
      title,
      description,
      attachmentUrl,
      creatorWallet: creatorWallet ? creatorWallet.toLowerCase() : undefined,
    });

    const savedProposal = await proposal.save();
    res.status(201).json(savedProposal);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Metadata already exists for this proposal ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/proposals/:id — Get proposal metadata by on-chain ID
router.get("/:id", async (req, res) => {
  try {
    const proposalId = Number(req.params.id);

    if (Number.isNaN(proposalId)) {
      return res.status(400).json({ error: "Invalid proposal ID" });
    }

    const proposal = await Proposal.findOne({ proposalId });

    if (!proposal) {
      return res.status(404).json({ error: "Proposal metadata not found" });
    }

    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/proposals — Get all proposal metadata
router.get("/", async (req, res) => {
  try {
    const proposals = await Proposal.find();
    res.json(proposals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;