const hre = require("hardhat");

async function main() {
  const Contract = await hre.ethers.deployContract("blockCart");
  await Contract.waitForDeployment();

  console.log("Contract deployed at:", Contract.target);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
