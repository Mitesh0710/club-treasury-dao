const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema({
  proposalId: {
    type: Number,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  attachmentUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  creatorWallet: {
    type: String,
  },
});

module.exports = mongoose.model("Proposal", proposalSchema);