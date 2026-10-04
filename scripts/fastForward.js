const { network } = require("hardhat");

async function main() {
  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  await network.provider.send("evm_increaseTime", [SEVEN_DAYS]);
  await network.provider.send("evm_mine");
  console.log("Fast-forwarded blockchain time by 7 days.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});