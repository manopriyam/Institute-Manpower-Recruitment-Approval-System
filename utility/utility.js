const hre = require("hardhat");
const readline = require("readline");
const Table = require("cli-table3");

const colors = {
    menu: "\x1b[33m",
    linebreak: "\x1b[32m",
    prompt: "\x1b[45m",
    reset: "\x1b[0m",
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const bl = colors.linebreak + "=".repeat(200) + colors.reset;

let activeUserIndex = 0;

async function ask(q) {
    return new Promise((r) => rl.question(q, r));
}

function createTable(headers, widths = null) {
    const config = {
        head: headers,
        style: { head: ["cyan"], border: ["gray"] },
    };
    if (widths) config.colWidths = widths;
    return new Table(config);
}

function createKeyValueTable(title = "Details") {
    return new Table({
        head: [title, "Value"],
        colWidths: [30, 80],
        style: { head: ["cyan"], border: ["gray"] },
    });
}

async function getNetworkDetails() {
    console.log("\nCurrent Blockchain Network Details:");

    try {
        const chainId = await hre.network.provider.send("eth_chainId");
        const blockNumber = await hre.network.provider.send("eth_blockNumber");
        const gasPrice = await hre.network.provider.send("eth_gasPrice");
        const accounts = await hre.network.provider.send("eth_accounts");

        const latestBlockNum = parseInt(blockNumber, 16);
        const numberOfBlocks = latestBlockNum + 1;

        let totalTransactions = 0;
        for (let i = 0; i <= latestBlockNum; i++) {
            const block = await hre.network.provider.send(
                "eth_getBlockByNumber",
                ["0x" + i.toString(16), false]
            );
            if (block) totalTransactions += block.transactions.length;
        }

        const table = createKeyValueTable("Network Property");
        table.push(
            ["Network Name", hre.network.name],
            ["Chain ID", parseInt(chainId, 16)],
            ["Total Number of Blocks", numberOfBlocks],
            ["Total Number of Transactions", totalTransactions],
            ["Current Gas Price (wei)", parseInt(gasPrice, 16)],
            ["Total Number of Accounts", accounts.length],
            [
                "Accounts",
                accounts
                    .map((a, i) => `${String(i + 1).padStart(4)}. ${a}`)
                    .join("\n") || "N/A",
            ]
        );

        console.log(table.toString());
    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function getLatestBlock() {
    console.log("\nLatest Block Details:");

    try {
        const latestBlock = await hre.network.provider.send(
            "eth_getBlockByNumber",
            ["latest", true]
        );

        const table = createKeyValueTable("Block Property");
        table.push(
            ["Block Number", parseInt(latestBlock.number, 16)],
            ["Block Hash", latestBlock.hash],
            ["Parent Hash", latestBlock.parentHash],
            ["Miner", latestBlock.miner],
            [
                "Timestamp",
                new Date(
                    parseInt(latestBlock.timestamp, 16) * 1000
                ).toISOString(),
            ],
            ["Gas Limit", parseInt(latestBlock.gasLimit, 16)],
            ["Gas Used", parseInt(latestBlock.gasUsed, 16)],
            ["Difficulty", parseInt(latestBlock.difficulty, 16)],
            ["Total Difficulty", latestBlock.totalDifficulty],
            ["Size (bytes)", parseInt(latestBlock.size, 16)],
            ["Nonce", latestBlock.nonce],
            ["Transactions Count", latestBlock.transactions.length],
            ["Extra Data", latestBlock.extraData]
        );

        console.log("\n" + table.toString());
    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function getLatestTransaction() {
    console.log("\nLatest Transaction Details:");

    try {
        const latestBlock = await hre.network.provider.send(
            "eth_getBlockByNumber",
            ["latest", true]
        );

        if (latestBlock.transactions.length === 0) {
            console.log("\nNo Transactions in the Latest Block.");
            return;
        }

        const latestTx = latestBlock.transactions[0];

        const table = createKeyValueTable("Transaction Property");
        table.push(
            ["Transaction Hash", latestTx.hash],
            ["From", latestTx.from],
            ["To", latestTx.to || "Contract Creation"],
            ["Value (wei)", parseInt(latestTx.value, 16)],
            ["Gas", parseInt(latestTx.gas, 16)],
            ["Gas Price (wei)", parseInt(latestTx.gasPrice, 16)],
            ["Nonce", parseInt(latestTx.nonce, 16)],
            ["Block Number", parseInt(latestTx.blockNumber, 16)],
            ["Block Hash", latestTx.blockHash],
            ["Transaction Index", parseInt(latestTx.transactionIndex, 16)],
            [
                "Input Data",
                latestTx.input.substring(0, 66) +
                    (latestTx.input.length > 66 ? "..." : ""),
            ],
            ["V", latestTx.v],
            ["R", latestTx.r],
            ["S", latestTx.s]
        );

        console.log(table.toString());
    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function getBlockDetails() {
    console.log("\nBlock Details:");

    try {
        const pageSize = parseInt(
            await ask(`${colors.prompt}Per Page Entry Limit: ${colors.reset}`)
        );
        let currentPage = 1;

        while (true) {
            const latestBlockNum = await hre.network.provider.send(
                "eth_blockNumber"
            );
            const latestNum = parseInt(latestBlockNum, 16);

            const startBlock = Math.max(
                0,
                latestNum - currentPage * pageSize + 1
            );
            const endBlock = Math.min(
                latestNum,
                latestNum - (currentPage - 1) * pageSize
            );

            console.log(`\nBlock Details (Page ${currentPage}):`);

            const table = createTable(
                [
                    "Number",
                    "Hash",
                    "Miner",
                    "Timestamp",
                    "Txs",
                    "Gas Used",
                    "Gas Limit",
                ],
                [8, 45, 45, 25, 6, 10, 12]
            );

            for (let i = endBlock; i >= startBlock; i--) {
                const block = await hre.network.provider.send(
                    "eth_getBlockByNumber",
                    ["0x" + i.toString(16), false]
                );

                table.push([
                    parseInt(block.number, 16),
                    block.hash,
                    block.miner,
                    new Date(
                        parseInt(block.timestamp, 16) * 1000
                    ).toLocaleString(),
                    block.transactions.length,
                    parseInt(block.gasUsed, 16),
                    parseInt(block.gasLimit, 16),
                ]);
            }

            console.log(table.toString());

            console.log("\nOptions: [n]ext page, [p]revious page, [e]xit");
            const choice = await ask(
                `${colors.prompt}Your Choice: ${colors.reset}`
            );

            if (choice.toLowerCase() === "n" && startBlock > 0) currentPage++;
            else if (choice.toLowerCase() === "p" && currentPage > 1)
                currentPage--;
            else if (choice.toLowerCase() === "e") break;
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function getTransactionDetails() {
    console.log("\nTransaction Details:");

    try {
        const pageSize = parseInt(
            await ask(`${colors.prompt}Per Page Entry Limit: ${colors.reset}`)
        );
        let currentPage = 1;

        const latestBlockNum = await hre.network.provider.send(
            "eth_blockNumber"
        );
        const latestNum = parseInt(latestBlockNum, 16);

        while (true) {
            console.log(`\nTransaction Details (Page ${currentPage}):`);

            const table = createTable(
                ["Hash", "From", "To", "Value (wei)", "Gas", "Block", "Index"],
                [45, 45, 45, 20, 10, 10, 8]
            );

            const transactions = [];
            let collected = 0;
            let blockOffset = (currentPage - 1) * Math.ceil(pageSize / 10);

            for (
                let i = latestNum - blockOffset;
                i >= 0 && collected < pageSize;
                i--
            ) {
                const block = await hre.network.provider.send(
                    "eth_getBlockByNumber",
                    ["0x" + i.toString(16), true]
                );

                if (!block || !block.transactions) break;

                for (const tx of block.transactions) {
                    if (collected >= pageSize) break;

                    table.push([
                        tx.hash,
                        tx.from,
                        tx.to ? tx.to : "Contract",
                        parseInt(tx.value, 16),
                        parseInt(tx.gas, 16),
                        parseInt(tx.blockNumber, 16),
                        parseInt(tx.transactionIndex, 16),
                    ]);

                    transactions.push(tx);
                    collected++;
                }
            }

            if (transactions.length === 0) {
                console.log("No More Transactions Found.");
                break;
            }

            console.log(table.toString());

            console.log("\nOptions: [n]ext page, [p]revious page, [e]xit");
            const choice = await ask(
                `${colors.prompt}Your Choice: ${colors.reset}`
            );

            if (choice.toLowerCase() === "n") currentPage++;
            else if (choice.toLowerCase() === "p" && currentPage > 1)
                currentPage--;
            else if (choice.toLowerCase() === "e") break;
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function changeActiveUser() {
    const signers = await hre.ethers.getSigners();

    const table = createTable(["Index", "Address"], [10, 65]);
    signers.forEach((s, i) => table.push([i, s.address]));

    console.log("\nAvailable EOAs:");
    console.log(table.toString());

    const idx = parseInt(await ask("Select User Index: "));
    if (idx >= 0 && idx < signers.length) activeUserIndex = idx;

    console.log(`\nActive EOA Switched to Index ${activeUserIndex}`);
}

async function getCurrentUserDetails() {
    console.log("\nCurrent User Details:");
    try {
        const accounts = await hre.ethers.getSigners();
        const user = accounts[activeUserIndex];

        const address = await user.getAddress();
        const balance = await hre.ethers.provider.getBalance(address);

        const table = createKeyValueTable("User Property");
        table.push(
            ["User Index", activeUserIndex],
            ["Address", address],
            ["Balance (wei)", balance.toString()],
            ["Balance (ETH)", hre.ethers.formatEther(balance)]
        );

        console.log(table.toString());
    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function main() {
    console.log(bl);
    console.log(bl);

    console.log(
        `${colors.menu}\nHardhat Blockchain Explorer Menu:${colors.reset}`
    );
    console.log(
        `${colors.menu}1. Get Current Blockchain Network Details${colors.reset}`
    );
    console.log(`${colors.menu}2. Get Latest Block${colors.reset}`);
    console.log(`${colors.menu}3. Get Latest Transaction${colors.reset}`);
    console.log(
        `${colors.menu}4. Get Block Details (with pagination)${colors.reset}`
    );
    console.log(
        `${colors.menu}5. Get Transaction Details (with pagination)${colors.reset}`
    );
    console.log(`${colors.menu}6. Change Active User${colors.reset}`);
    console.log(`${colors.menu}7. Get Current User Details${colors.reset}`);
    console.log(`${colors.menu}0. Exit${colors.reset}`);

    const choice = await ask(`${colors.prompt}Select Option: ${colors.reset}`);
    console.log(bl);

    try {
        switch (choice.trim()) {
            case "1":
                await getNetworkDetails();
                break;
            case "2":
                await getLatestBlock();
                break;
            case "3":
                await getLatestTransaction();
                break;
            case "4":
                await getBlockDetails();
                break;
            case "5":
                await getTransactionDetails();
                break;
            case "6":
                await changeActiveUser();
                break;
            case "7":
                await getCurrentUserDetails();
                break;
            default:
                console.log("\nExiting Application.");
                rl.close();
                return;
        }
    } catch (err) {
        console.error("Error:", err.message);
    }

    main();
}

main();
