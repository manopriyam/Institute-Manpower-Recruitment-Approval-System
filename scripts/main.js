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
/*                          ADD MEMBER                                         */
/* -------------------------------------------------------------------------- */
async function addMember() {
    const name = await ask("Enter member name: ");
    const role = await ask("Enter member role (Faculty/Staff/Applicant): ");
    const deptType = await ask("Enter department type (Academics/HumanResources): ");
    const dept = await ask("Enter department: ");
    const isHead = (await ask("Is the member a department head? (yes/no): ")) === "yes";

    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract
        .connect(signer)
        .addMember(name, role, deptType, dept, isHead);

    console.log("\nMember added!");
}

/* -------------------------------------------------------------------------- */
/*                          VIEW MEMBER DETAILS                               */
/* -------------------------------------------------------------------------- */
async function viewMember() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);

    const t = createKeyValueTable("Active User");
    t.push(["Address", signer.address]);
    t.push(["Name", member.Name]);
    t.push(["Role", member.Role]);
    t.push(["DeptType", member.DeptType]);
    t.push(["Dept", member.Dept]);
    t.push(["isHead", member.isHead]);

    console.log("\n" + t.toString());
}

/* -------------------------------------------------------------------------- */
/*                          AUTO ASSIGN MEMBERS                               */
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
        } else if (i < 19) {
            await contract
                .connect(s)
                .addMember(
                    `Applicant_${i}`,
                    "Applicant",
                    "Academics",
                    dept,
                    false
                );
        } else {
            await contract
                .connect(s)
                .addMember(
                    `HR_${i}`,
                    "Staff",
                    "HumanResources",
                    "HumanResource",
                    false
                );
        } 
    }

    console.log("Auto-assignment complete!\n");
}


/* -------------------------------------------------------------------------- */
/*                          REQUEST VACANCY                                   */
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

    console.log("\nVacancy Requested!");
}

/* -------------------------------------------------------------------------- */
/*                          APPROVE VACANCY BY DEPT HEAD                      */
/* -------------------------------------------------------------------------- */
async function approveVacancyByDeptHead() {
    const vacancyID = parseInt(await ask("Enter Vacancy ID to approve: "));
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract.connect(signer).approveVacancybyDepartmentHead(vacancyID);
    console.log("\nApproval Complete!");
}

/* -------------------------------------------------------------------------- */
/*                          APPROVE AND POST VACANCY BY HR                    */
/* -------------------------------------------------------------------------- */
async function approveAndPostVacancyByHR() {
    const vacancyID = parseInt(await ask("Enter Vacancy ID to approve and post: "));
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract.connect(signer).approveAndPostVacancybyHR(vacancyID);
    console.log("\nVacancy Approved and Posted by HR!");
}

/* -------------------------------------------------------------------------- */
/*                          VIEW VACANCIES FOR APPLICANTS                     */
/* -------------------------------------------------------------------------- */
async function viewVacanciesForApplicants() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const vacancies = await contract.getVacanciesforApplicants();

    const table = createTable(["Vacancy IDs Available for Application"]);
    vacancies.forEach((id) => table.push([id]));
    console.log("\n" + table.toString());
}

/* -------------------------------------------------------------------------- */
/*                          APPLY FOR VACANCY                                 */
/* -------------------------------------------------------------------------- */
async function applyForVacancy() {
    const vacancyID = parseInt(await ask("Enter Vacancy ID to apply for: "));
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract.connect(signer).applyforVacancy(vacancyID);
    console.log("\nApplication Submitted!");
}

/* -------------------------------------------------------------------------- */
/*                          CHECK APPLICATION STATUS                         */
/* -------------------------------------------------------------------------- */
async function checkApplicationStatus() {
    const vacancyID = parseInt(await ask("Enter Vacancy ID to check application status: "));
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    const status = await contract.checkApplicationStatusbyApplicant(vacancyID);
    console.log(`\nYour application status: ${status}`);
}

/* -------------------------------------------------------------------------- */
/*                          SELECT APPLICANT AND FILL VACANCY                 */
/* -------------------------------------------------------------------------- */
async function selectApplicantAndFillVacancy() {
    const vacancyID = parseInt(await ask("Enter Vacancy ID to fill: "));
    const applicantAddress = await ask("Enter Applicant Address: ");
    const signer = (await hre.ethers.getSigners())[activeUserIndex];

    await contract.connect(signer).selectApplicantbyHR(vacancyID, applicantAddress);
    console.log("\nApplicant Selected and Vacancy Filled!");
}

/* -------------------------------------------------------------------------- */
/*                          VIEW VACANCIES REQUIRING DEPT HEAD APPROVAL       */
/* -------------------------------------------------------------------------- */
async function getVacanciesRequiringDeptHeadApproval() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const vacancies = await contract.getVacanciesRequiringDepartmentHeadApproval();

    const table = createTable(["Vacancy IDs Requiring Dept Head Approval"]);
    vacancies.forEach((id) => table.push([id]));
    console.log("\n" + table.toString());
}

/* -------------------------------------------------------------------------- */
/*                          VIEW VACANCIES REQUIRING HR APPROVAL             */
/* -------------------------------------------------------------------------- */
async function getVacanciesRequiringHRApproval() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const vacancies = await contract.getVacanciesRequiringHRApproval();

    const table = createTable(["Vacancy IDs Requiring HR Approval"]);
    vacancies.forEach((id) => table.push([id]));
    console.log("\n" + table.toString());
}

/* -------------------------------------------------------------------------- */
/*                          CHANGE ACTIVE USER                                */
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
/*                             DYNAMIC MENU                                    */
/* -------------------------------------------------------------------------- */
async function showMenu() {
    const options = [
        { title: "1. Add Member", action: addMember },
        { title: "2. Request Vacancy", action: requestVacancy },
        { title: "3. Approve Vacancy (Dept Head)", action: approveVacancyByDeptHead },
        { title: "4. Approve and Post Vacancy (HR)", action: approveAndPostVacancyByHR },
        { title: "5. View Vacancies for Applicants", action: viewVacanciesForApplicants },
        { title: "6. Apply for Vacancy", action: applyForVacancy },
        { title: "7. Check Application Status", action: checkApplicationStatus },
        { title: "8. Select Applicant and Fill Vacancy", action: selectApplicantAndFillVacancy },
        { title: "9. View Vacancies Requiring Dept Head Approval", action: getVacanciesRequiringDeptHeadApproval },
        { title: "10. View Vacancies Requiring HR Approval", action: getVacanciesRequiringHRApproval },
        { title: "11. Change Active User", action: changeActiveUser },
        { title: "12. View Member Details", action: viewMember }
    ];

    console.log("\nSelect an option from the menu:");

    options.forEach(option => {
        console.log(option.title);
    });

    const choice = parseInt(await ask("Enter your choice: "));

    // Ensure the choice is valid
    if (choice >= 1 && choice <= options.length) {
        await options[choice - 1].action();
    } else {
        console.log("Invalid choice. Please select a valid option.");
    }
}

/* -------------------------------------------------------------------------- */
/*                         START PROGRAM                                       */
/* -------------------------------------------------------------------------- */
async function main() {
    contract = await deployContract();  // Deploy contract
    autoAssignMembers();
    while (true) {
        await showMenu();  // Show the dynamic menu
    }
}

main();
