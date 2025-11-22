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

/* -------------------------------------------------------------------------- */
/*                          DEPLOY CONTRACT — ETHERS v6                        */
/* -------------------------------------------------------------------------- */
async function deployContract() {
    const Factory = await hre.ethers.getContractFactory("InstituteRecruitment");
    const instance = await Factory.deploy(); // auto-awaits deployment

    console.log("\nContract deployed at:", await instance.getAddress());
    return instance;
}

/* -------------------------------------------------------------------------- */
/*                          AUTO-ASSIGN MEMBERS                                */
/* -------------------------------------------------------------------------- */
async function autoAssignMembers() {
    const signers = await hre.ethers.getSigners();
    const departments = [
        "ComputerScience",
        "DataScienceandArtificialIntelligence",
        "Electrical",
        "Mechanical",
        "Mechatronics",
    ];

    console.log("\nAssigning members automatically...\n");

    for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        const dept = departments[i % departments.length];

        if (i < 5) {
            await contract
                .connect(s)
                .addMember(`Faculty_${i}`, "Faculty", "Academics", dept, false);
        } else if (i < 10) {
            await contract
                .connect(s)
                .addMember(`Staff_${i}`, "Staff", "Academics", dept, false);
        } else if (i < 15) {
            await contract
                .connect(s)
                .addMember(`Head_${i}`, "Faculty", "Academics", dept, true);
        } else if (i === 15) {
            await contract
                .connect(s)
                .addMember(
                    `HR_${i}`,
                    "Staff",
                    "HumanResources",
                    "HumanResource",
                    false
                );
        } else {
            await contract
                .connect(s)
                .addMember(
                    `Applicant_${i}`,
                    "Applicant",
                    "Academics",
                    dept,
                    false
                );
        }
    }

    console.log("Auto-assignment complete!\n");
}

/* -------------------------------------------------------------------------- */
/*                       VIEW CURRENT USER ROLE                                */
/* -------------------------------------------------------------------------- */
async function viewMember() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const m = await contract.members(signer.address);

    const t = createKeyValueTable("Active User");
    t.push(["Address", signer.address]);
    t.push(["Name", m.Name]);
    t.push(["Role", m.Role]);
    t.push(["DeptType", m.DeptType]);
    t.push(["Dept", m.Dept]);
    t.push(["isHead", m.isHead]);

    console.log("\n" + t.toString());
}

/* -------------------------------------------------------------------------- */
/*                           CHANGE ACTIVE USER                                */
/* -------------------------------------------------------------------------- */
async function changeActiveUser() {
    const signers = await hre.ethers.getSigners();
    const table = createTable(["Index", "Address"]);

    signers.forEach((s, i) => table.push([i, s.address]));
    console.log(table.toString());

    const idx = parseInt(await ask("Select User Index: "));
    if (idx >= 0 && idx < signers.length) {
        activeUserIndex = idx;
    }

    console.log(`\nActive User set to index ${activeUserIndex}`);
}

/* -------------------------------------------------------------------------- */
/*                     FACULTY/STAFF — REQUEST VACANCY                         */
/* -------------------------------------------------------------------------- */
async function requestVacancy() {
    const vacancyID = parseInt(await ask("Enter Vacancy ID: "));
    const role = await ask("Enter Role Needed: ");
    const deptType = await ask("Enter DeptType: ");
    const dept = await ask("Enter Dept: ");
    const desc = await ask("Enter Description: ");
    const req = await ask("Enter Requirements: ");

    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract
        .connect(signer)
        .requestVacancy(vacancyID, role, deptType, dept, desc, req);

    console.log("\nVacancy Requested!\n");
}

/* -------------------------------------------------------------------------- */
/*                           HEAD — PENDING VACANCIES                          */
/* -------------------------------------------------------------------------- */
async function headViewPending() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const list = await contract
        .connect(signer)
        .getVacanciesRequiringDepartmentHeadApproval();

    const table = createTable(["Pending Vacancy IDs"]);
    list.forEach((id) => table.push([id]));
    console.log("\n" + table.toString());
}

/* -------------------------------------------------------------------------- */
/*                           HEAD — APPROVE VACANCY                            */
/* -------------------------------------------------------------------------- */
async function headApproveVacancy() {
    const id = parseInt(await ask("Enter Vacancy ID to approve: "));
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract.connect(signer).approveVacancybyDepartmentHead(id);
    console.log("\nApproval Complete!");
}

/* -------------------------------------------------------------------------- */
/*                             DYNAMIC MENU                                    */
/* -------------------------------------------------------------------------- */
async function dynamicMenu() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const m = await contract.members(signer.address);

    console.log(bl);
    console.log(`Logged in as: ${m.Name} (${m.Role})`);

    if (m.Role === "Faculty" || m.Role === "Staff") {
        console.log("1. Request Vacancy");
    }

    if (m.isHead) {
        console.log("3. View Pending Vacancies");
        console.log("4. Approve Vacancy");
    }

    console.log("9. Change User");
    console.log("0. Exit");

    const c = await ask(`${colors.prompt}Select Option: ${colors.reset}`);

    if (c === "1") return requestVacancy();
    if (c === "3") return headViewPending();
    if (c === "4") return headApproveVacancy();
    if (c === "9") return changeActiveUser();

    console.log("\nExiting...");
    rl.close();
    process.exit(0);
}

/* -------------------------------------------------------------------------- */
/*                                   MAIN                                      */
/* -------------------------------------------------------------------------- */
async function main() {
    contract = await deployContract();
    await autoAssignMembers();

    while (true) {
        await dynamicMenu();
    }
}

main();
