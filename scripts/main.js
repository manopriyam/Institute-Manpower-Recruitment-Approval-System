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

let contract;
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

// deploy contract
async function deployContract() {
    const Factory = await hre.ethers.getContractFactory("InstituteRecruitment");
    const instance = await Factory.deploy();
    await instance.deployed();
    console.log("\nContract deployed at:", instance.address);
    return instance;
}

// add a member
async function addMember() {
    const name = await ask("Enter Name: ");
    const role = await ask("Enter Role (Faculty/Staff/Applicant): ");
    const deptType = await ask("Enter DeptType (Academics/HumanResource): ");
    const dept = await ask("Enter Dept: ");
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract.connect(signer).addMember(name, role, deptType, dept);
    console.log("\nMember added successfully!");
}

// request a vacancy
async function requestVacancy() {
    const vacancyID = parseInt(await ask("Enter Vacancy ID to request: "));
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract.connect(signer).requestVacancy(vacancyID);
    console.log("\nVacancy requested successfully!");
}

// view member info
async function viewMember() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const exists = await contract.checkMember(signer.address);
    console.log(`\nMember Exists: ${exists}`);
}

// switch active user
async function changeActiveUser() {
    const signers = await hre.ethers.getSigners();
    const table = createTable(["Index", "Address"]);
    signers.forEach((s, i) => table.push([i, s.address]));
    console.log(table.toString());

    const idx = parseInt(await ask("Select User Index: "));
    if (idx >= 0 && idx < signers.length) activeUserIndex = idx;
    console.log(`\nActive User Index set to ${activeUserIndex}`);
}

// main menu
async function mainMenu() {
    console.log(bl);
    console.log(`${colors.menu}Institute Recruitment Menu:${colors.reset}`);
    console.log(`${colors.menu}1. Add Member${colors.reset}`);
    console.log(`${colors.menu}2. Request Vacancy${colors.reset}`);
    console.log(`${colors.menu}3. View Member Status${colors.reset}`);
    console.log(`${colors.menu}4. Change Active User${colors.reset}`);
    console.log(`${colors.menu}0. Exit${colors.reset}`);

    const choice = await ask(`${colors.prompt}Select Option: ${colors.reset}`);

    switch (choice.trim()) {
        case "1":
            await addMember();
            break;
        case "2":
            await requestVacancy();
            break;
        case "3":
            await viewMember();
            break;
        case "4":
            await changeActiveUser();
            break;
        default:
            console.log("\nExiting...");
            rl.close();
            process.exit(0);
    }

    mainMenu();
}

// run deployment and menu
async function main() {
    contract = await deployContract();
    mainMenu();
}

main();
