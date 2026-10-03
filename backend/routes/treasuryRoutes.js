const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
require("dotenv").config();

const contractABI = require("../../frontend/src/constants/contractABI.js");

// GET /api/treasury — Returns current ETH balance (calls contract view function)
router.get("/", async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI.CONTRACT_ABI,
      provider
    );

    const balanceWei = await contract.getTreasuryBalance();

    res.json({
      balanceWei: balanceWei.toString(),
      balanceEth: ethers.formatEther(balanceWei),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;