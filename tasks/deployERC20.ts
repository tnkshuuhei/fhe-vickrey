import dotenv from "dotenv";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

dotenv.config();

const privateKey = process.env.PRIVATE_KEY as string;

task("task:deployERC20").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  // const signers = await ethers.getSigners();
  if (!privateKey) {
    throw new Error("Please set your PRIVATE_KEY in a .env file");
  }
  const provider = new ethers.JsonRpcProvider("https://devnet.zama.ai");
  const wallet = new ethers.Wallet(privateKey, provider);
  const signer = wallet.connect(provider);
  const erc20Factory = await ethers.getContractFactory("EncryptedERC20");
  const encryptedERC20 = await erc20Factory.connect(signer).deploy("Naraggara", "NARA"); // City of Zama's battle);
  await encryptedERC20.waitForDeployment();
  console.log("EncryptedERC20 deployed to: ", await encryptedERC20.getAddress());

  const tx = await encryptedERC20.connect(signer).mint(10000);
  await tx.wait();
  console.log("Minted 10000 NARA to: ", await signer.getAddress(), "hash: ", tx.hash);
});
