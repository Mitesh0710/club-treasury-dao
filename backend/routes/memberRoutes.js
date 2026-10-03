const express = require("express");
const router = express.Router();
const Member = require("../models/Member");

// POST /api/members — Save member profile (called after on-chain registration)
router.post("/", async (req, res) => {
  try {
    const { walletAddress, displayName, studentId, email, department } = req.body;

    if (!walletAddress || !displayName) {
      return res.status(400).json({ error: "walletAddress and displayName are required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    const member = new Member({
      walletAddress: walletAddress.toLowerCase(),
      displayName,
      studentId,
      email,
      department,
    });

    const savedMember = await member.save();
    res.status(201).json(savedMember);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Member profile already exists for this wallet" });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/members/:wallet — Get member display info by wallet address
router.get("/:wallet", async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    const member = await Member.findOne({ walletAddress: wallet });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/members — Get all member profiles
router.get("/", async (req, res) => {
  try {
    const members = await Member.find();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;