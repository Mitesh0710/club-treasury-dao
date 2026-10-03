const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const memberRoutes = require("./routes/memberRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const treasuryRoutes = require("./routes/treasuryRoutes");

const app = express();

app.use(express.json());

// Mount routes
app.use("/api/members", memberRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/treasury", treasuryRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

module.exports = app;