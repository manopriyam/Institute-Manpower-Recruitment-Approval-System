require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // ensure env vars load

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.28",
    networks: {
        iitbhilaiBlockchain: {
            url: "http://10.10.0.61:8550",
            chainId: 491002,
            accounts: process.env.PRIVATE_KEY_IITBHBLOCKCHAIN
                ? [process.env.PRIVATE_KEY_IITBHBLOCKCHAIN]
                : [],
        },
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
            accounts: process.env.PRIVATE_KEY_SEPOLIA
                ? [process.env.PRIVATE_KEY_SEPOLIA]
                : [],
            chainId: 11155111,
            gas: "auto",
            gasMultiplier: 1.2,
        },
        hardhat: { mining: { auto: true, interval: 1000 } },
        localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    },
    etherscan: { apiKey: { sepolia: process.env.ETHERSCAN_API_KEY || "" } },
};
