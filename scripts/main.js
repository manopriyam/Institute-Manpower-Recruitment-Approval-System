// SPDX-License-Identifier: MIT
const hre = require("hardhat");
const readline = require("readline");
const Table = require("cli-table3");

const colors = {
    menu: "\x1b[33m",
    linebreak: "\x1b[32m",
    prompt: "\x1b[45m",
    reset: "\x1b[0m",
    logs: "\x1b[36m",
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const bl = colors.linebreak + "\n" + "=".repeat(200) + colors.reset;

let contract;
let activeUserIndex = 0;
let activeMember = null;

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

async function deployContract() {
    const Factory = await hre.ethers.getContractFactory("InstituteRecruitment");
    const instance = await Factory.deploy();
    console.log(
        `\n${colors.logs}Contract Deployed At: ${await instance.getAddress()}${
            colors.reset
        }`
    );
    return instance;
}

async function addMember(name, role, deptType, dept, isHead) {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    await contract
        .connect(signer)
        .addMember(name, role, deptType, dept, isHead);
    const table = createKeyValueTable("Member Added");
    table.push(
        ["Name", name],
        ["Role", role],
        ["DeptType", deptType],
        ["Dept", dept],
        ["isHead", isHead]
    );
    console.log("\n" + table.toString());

    activeMember = await contract.members(signer.address);
}

async function viewMember() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);
    activeMember = member;

    const table = createKeyValueTable("Active User");
    table.push(
        ["Address", signer.address],
        ["Name", member.Name],
        ["Role", member.Role],
        ["DeptType", member.DeptType],
        ["Dept", member.Dept],
        ["isHead", member.isHead]
    );
    console.log("\n" + table.toString());
    return member;
}

async function autoAssignMembers() {
    const signers = await hre.ethers.getSigners();
    const departments = [
        "Computer-Science",
        "Data-Science-and-Artificial-Intelligence",
        "Electrical",
        "Mechanical",
        "Mechatronics",
    ];

    console.log(
        `\n${colors.logs}Assigning Members Automatically${colors.reset}`
    );

    for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        let dept = departments[i % departments.length];
        let role, deptType, isHead;

        if (i < 5) {
            role = "Faculty";
            deptType = "Academics";
            isHead = false;
        } else if (i < 10) {
            role = "Staff";
            deptType = "Academics";
            isHead = false;
        } else if (i < 15) {
            role = "Faculty";
            deptType = "Academics";
            isHead = true;
        } else if (i < 18) {
            role = "Applicant";
            deptType = "Academics";
            isHead = false;
        } else if (i === 18) {
            role = "Staff";
            deptType = "Certifying-Authority";
            dept = "Null";
            isHead = false;
        } else {
            role = "Staff";
            deptType = "Human-Resources";
            dept = "Null";
            isHead = false;
        }

        await contract
            .connect(s)
            .addMember(`${role}_${i}`, role, deptType, dept, isHead);
        console.log(
            `\n${colors.logs}Assigned ${role}_${i} To ${dept}${colors.reset}`
        );
    }
    console.log(`\n${colors.logs}Auto-Assignment Completed${colors.reset}`);
}

async function changeActiveUser(idx) {
    const signers = await hre.ethers.getSigners();
    if (typeof idx === "number" && idx >= 0 && idx < signers.length) {
        activeUserIndex = idx;
        activeMember = await contract.members(signers[idx].address);
        console.log(
            `\n${colors.logs}Active User Set To Index ${activeUserIndex}${colors.reset}`
        );
        await viewMember();
        return;
    }

    const table = createTable(["Index", "Address"]);
    signers.forEach((s, i) => table.push([i, s.address]));
    console.log("\nAvailable Users:");
    console.log("\n" + table.toString());

    const choice = parseInt(
        await ask(`${colors.prompt}Select User Index: ${colors.reset}`)
    );
    if (!isNaN(choice) && choice >= 0 && choice < signers.length) {
        activeUserIndex = choice;
        activeMember = await contract.members(signers[choice].address);
    }
    console.log(
        `\n${colors.logs}Active User Set To Index ${activeUserIndex}${colors.reset}`
    );
    await viewMember();
}

async function requestVacancy(vacancyID, role, deptType, dept, desc, req) {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);
    activeMember = member;

    console.log(
        `\n${colors.logs}${member.Dept} ${member.Role} (${member.Name}) Requesting Vacancy${colors.reset}`
    );

    await contract
        .connect(signer)
        .requestVacancy(vacancyID, role, deptType, dept, desc, req);

    const table = createKeyValueTable("Vacancy Requested");
    table.push(
        ["Vacancy ID", vacancyID],
        ["Role", role],
        ["DeptType", deptType],
        ["Dept", dept],
        ["Description", desc],
        ["Requirements", req],
        ["Requested By", `${member.Dept} ${member.Role} (${member.Name})`]
    );
    console.log("\n" + table.toString());

    console.log(
        `\n${colors.logs}Vacancy ${vacancyID} Requested By ${member.Dept} ${member.Role} (${member.Name})${colors.reset}`
    );
}

async function getVacanciesRequiringDeptHeadApproval() {
    const vacancies =
        await contract.getVacanciesRequiringDepartmentHeadApproval();
    const table = createTable(["Vacancy IDs Requiring Dept Head Approval"]);
    vacancies.forEach((id) => table.push([id]));
    console.log("\n" + table.toString());
}

async function approveVacancyByDeptHead(vacancyID) {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);
    activeMember = member;

    console.log(
        `\n${colors.logs}${member.Dept} ${member.Role} (${member.Name}) Approving Vacancy${colors.reset}`
    );

    await contract.connect(signer).approveVacancybyDepartmentHead(vacancyID);

    console.log(
        `\n${colors.logs}Vacancy ${vacancyID} Approved By ${member.Dept} ${member.Role} (${member.Name})${colors.reset}`
    );
}

async function getVacanciesRequiringHRApproval() {
    const vacancies = await contract.getVacanciesRequiringHRApproval();
    const table = createTable(["Vacancy IDs Requiring HR Approval"]);
    vacancies.forEach((id) => table.push([id]));
    console.log("\n" + table.toString());
}

async function approveAndPostVacancyByHR(vacancyID) {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);
    activeMember = member;

    console.log(
        `\n${colors.logs}${member.DeptType} ${member.Role} (${member.Name}) Approving And Posting Vacancy${colors.reset}`
    );

    await contract.connect(signer).approveAndPostVacancybyHR(vacancyID);

    console.log(
        `\n${colors.logs}Vacancy ${vacancyID} Approved And Posted By ${member.DeptType} ${member.Role} (${member.Name})${colors.reset}`
    );
}

async function selectApplicantAndFillVacancy(vacancyID, applicantAddress) {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);
    activeMember = member;

    await contract
        .connect(signer)
        .selectApplicantbyHR(vacancyID, applicantAddress);

    console.log(
        `\n${colors.logs}Applicant ${applicantAddress} Selected For Vacancy ${vacancyID} By ${member.DeptType} ${member.Role} (${member.Name})${colors.reset}`
    );
}

async function viewVacanciesForApplicants() {
    const vacancies = await contract.getVacanciesforApplicants();
    const table = createTable(["Vacancy IDs Available For Application"]);
    vacancies.forEach((id) => table.push([id]));
    console.log("\n" + table.toString());
}

async function applyForVacancy(vacancyID) {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);
    activeMember = member;

    console.log(
        `\n${colors.logs}${member.Dept} ${member.Role} (${member.Name}) Applying For Vacancy${colors.reset}`
    );

    await contract.connect(signer).applyforVacancy(vacancyID);

    console.log(
        `\n${colors.logs}Application Submitted For Vacancy ${vacancyID} By ${member.Dept} ${member.Role} (${member.Name})${colors.reset}`
    );
}

async function checkApplicationStatus(vacancyID) {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);
    activeMember = member;

    const status = await contract
        .connect(signer)
        .checkApplicationStatusbyApplicant(vacancyID);

    console.log(
        `\n${colors.logs}Application Status For ${member.Dept} ${member.Role} (${member.Name}) - Vacancy ${vacancyID}: ${status}${colors.reset}`
    );
}

async function requestCertificateIssuanceFromCA() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);

    console.log(
        `\n${colors.logs}${member.Name} Requesting Certificate${colors.reset}`
    );
    await contract.connect(signer).requestCertificateIssuance();

    const tbl = createKeyValueTable("Certificate Request");
    tbl.push(["Requested By", member.Name], ["Dept", member.Dept]);
    console.log("\n" + tbl.toString());
}

async function issueCertificateByCA() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);

    console.log(
        `\n${colors.logs}${member.Name} Issuing Certificate${colors.reset}`
    );
    await contract.connect(signer).issueCertificate();

    const tbl = createKeyValueTable("Certificate Issued");
    tbl.push(["Issued By", member.Name], ["DeptType", member.DeptType]);
    console.log("\n" + tbl.toString());
}

async function requestVerificationFromCA() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);

    console.log(
        `\n${colors.logs}${member.Name} Requesting Verification${colors.reset}`
    );
    await contract.connect(signer).requestVerification();

    const tbl = createKeyValueTable("Verification Request");
    tbl.push(["Requested By", member.Name], ["DeptType", member.DeptType]);
    console.log("\n" + tbl.toString());
}

async function verifyRequestsByCA() {
    const signer = (await hre.ethers.getSigners())[activeUserIndex];
    const member = await contract.members(signer.address);

    console.log(
        `\n${colors.logs}${member.Name} Verifying Certificates${colors.reset}`
    );
    await contract.connect(signer).verifyPendingCertificates();

    const tbl = createKeyValueTable("Verification Completed");
    tbl.push(["Verified By", member.Name], ["DeptType", member.DeptType]);
    console.log("\n" + tbl.toString());
}

async function simulate(contract) {
    const signers = await hre.ethers.getSigners();
    const requestedVacancy = {
        vacancyID: 12,
        role: await contract.roleTypes(1),
        deptType: "Academics",
        dept: "Computer-Science",
        description: "Some-Random-Description",
        requirements: "Some-Random-Requirements",
    };

    console.log(`\n${colors.logs}Simulation${colors.reset}`);

    await changeActiveUser(0);
    await requestVacancy(
        requestedVacancy.vacancyID,
        requestedVacancy.role,
        requestedVacancy.deptType,
        requestedVacancy.dept,
        requestedVacancy.description,
        requestedVacancy.requirements
    );

    await changeActiveUser(10);
    await approveVacancyByDeptHead(requestedVacancy.vacancyID);

    await changeActiveUser(19);
    await approveAndPostVacancyByHR(requestedVacancy.vacancyID);

    await changeActiveUser(15);
    await applyForVacancy(requestedVacancy.vacancyID);
    await checkApplicationStatus(requestedVacancy.vacancyID);

    await changeActiveUser(15);
    await requestCertificateIssuanceFromCA();

    await changeActiveUser(18);
    await issueCertificateByCA();

    await changeActiveUser(19);
    await requestVerificationFromCA();

    await changeActiveUser(18);
    await verifyRequestsByCA();

    await changeActiveUser(19);
    await selectApplicantAndFillVacancy(
        requestedVacancy.vacancyID,
        signers[15].address
    );

    await changeActiveUser(15);
    await checkApplicationStatus(requestedVacancy.vacancyID);

    console.log(`\n${colors.logs}Simulation Completed${colors.reset}`);
}

async function showMenu() {
    const options = [
        {
            title: "Add Member",
            action: addMember,
            prompts: [
                {
                    q: `${colors.prompt}Member Name: ${colors.reset}`,
                    type: "string",
                },
                {
                    q: `${colors.prompt}Member Role (Faculty/Staff/Applicant): ${colors.reset}`,
                    type: "string",
                },
                {
                    q: `${colors.prompt}Department Type (Academics/HumanResources): ${colors.reset}`,
                    type: "string",
                },
                {
                    q: `${colors.prompt}Department: ${colors.reset}`,
                    type: "string",
                },
                {
                    q: `${colors.prompt}Is The Member A Department Head? (yes/no): ${colors.reset}`,
                    type: "bool",
                },
            ],
        },
        {
            title: "Change Active User",
            action: changeActiveUser,
            prompts: [
                {
                    q: `${colors.prompt}Select User Index: ${colors.reset}`,
                    type: "int",
                },
            ],
        },
        { title: "View Member Details", action: viewMember, prompts: [] },
        {
            title: "Request Vacancy",
            action: requestVacancy,
            prompts: [
                {
                    q: `${colors.prompt}Vacancy ID: ${colors.reset}`,
                    type: "int",
                },
                {
                    q: `${colors.prompt}Role Needed: ${colors.reset}`,
                    type: "string",
                },
                {
                    q: `${colors.prompt}DeptType: ${colors.reset}`,
                    type: "string",
                },
                { q: `${colors.prompt}Dept: ${colors.reset}`, type: "string" },
                {
                    q: `${colors.prompt}Description: ${colors.reset}`,
                    type: "string",
                },
                {
                    q: `${colors.prompt}Requirements: ${colors.reset}`,
                    type: "string",
                },
            ],
        },
        {
            title: "View Vacancies Requiring Department Head Approval",
            action: getVacanciesRequiringDeptHeadApproval,
            prompts: [],
        },
        {
            title: "Approve Vacancy By Department Head",
            action: approveVacancyByDeptHead,
            prompts: [
                {
                    q: `${colors.prompt}Vacancy ID To Approve: ${colors.reset}`,
                    type: "int",
                },
            ],
        },
        {
            title: "View Vacancies Requiring Human Resources Approval",
            action: getVacanciesRequiringHRApproval,
            prompts: [],
        },
        {
            title: "Approve And Post Vacancy By Human Resources",
            action: approveAndPostVacancyByHR,
            prompts: [
                {
                    q: `${colors.prompt}Vacancy ID To Approve And Post: ${colors.reset}`,
                    type: "int",
                },
            ],
        },
        {
            title: "Request Verification By Human-Resources From Certifying Authority ",
            action: requestVerificationFromCA,
            prompts: [],
        },
        {
            title: "Select Applicant And Fill Vacancy",
            action: selectApplicantAndFillVacancy,
            prompts: [
                {
                    q: `${colors.prompt}Vacancy ID To Fill: ${colors.reset}`,
                    type: "int",
                },
                {
                    q: `${colors.prompt}Applicant Address: ${colors.reset}`,
                    type: "string",
                },
            ],
        },
        {
            title: "View Vacancies For Applicants",
            action: viewVacanciesForApplicants,
            prompts: [],
        },
        {
            title: "Apply For Vacancy",
            action: applyForVacancy,
            prompts: [
                {
                    q: `${colors.prompt}Vacancy ID To Apply For: ${colors.reset}`,
                    type: "int",
                },
            ],
        },
        {
            title: "Request Certificate Issuance By Applicant From Certifying Authority",
            action: requestCertificateIssuanceFromCA,
            prompts: [],
        },
        {
            title: "Check Application Status",
            action: checkApplicationStatus,
            prompts: [
                {
                    q: `${colors.prompt}Vacancy ID To Check Application Status: ${colors.reset}`,
                    type: "int",
                },
            ],
        },
        {
            title: "Issue Certificate By Certifying Authority ",
            action: issueCertificateByCA,
            prompts: [],
        },
        {
            title: "Verify Requests By Certifying Authority",
            action: verifyRequestsByCA,
            prompts: [],
        },
    ];

    console.log(bl);
    console.log(bl);
    console.log(`\n${colors.logs}Menu Options${colors.reset}`);
    const table = createTable(["Sl.", "Option"]);
    options.forEach((option, idx) => table.push([idx + 1, option.title]));
    console.log("\n" + table.toString());

    const choice = parseInt(
        await ask(`${colors.prompt}\nUser Choice: ${colors.reset}`)
    );
    console.log(bl);

    if (choice < 1 || choice > options.length) {
        console.log(
            `\n${colors.logs}Invalid Choice. Please Select A Valid Option${colors.reset}`
        );
        return;
    }

    const opt = options[choice - 1];
    const values = [];
    if (opt.prompts && opt.prompts.length > 0) {
        for (const p of opt.prompts) {
            const ans = await ask(p.q);
            if (p.type === "int") values.push(parseInt(ans));
            else if (p.type === "bool")
                values.push((ans || "").toLowerCase() === "yes");
            else values.push(ans);
        }
    }

    await opt.action(...values);
}

async function main() {
    console.log(bl);
    contract = await deployContract();
    console.log(bl);
    await autoAssignMembers();
    console.log(bl);
    await simulate(contract);
    while (true) await showMenu();
}

main();
