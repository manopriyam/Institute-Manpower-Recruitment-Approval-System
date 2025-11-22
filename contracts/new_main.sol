// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
Institute Manpower Management with File Hash Verification
Roles:
- Authority: issues certificates, uploads verified PDF hashes
- Department Head: sets policy, approves vacancies
- DeptMember: requests vacancy
- Recruiter: posts vacancy, verifies applicant files, selects applicant
- Applicant: applies to vacancy using their verified certificate
*/

contract InstituteManpower {
    // ------------------------------------------------------------
    // Roles
    // ------------------------------------------------------------
    address public authority;
    address public deptHead;

    mapping(address => bool) public deptMembers;
    mapping(address => bool) public recruiters;

    modifier onlyAuthority() { require(msg.sender == authority, "Not authority"); _; }
    modifier onlyDeptHead() { require(msg.sender == deptHead, "Not dept head"); _; }
    modifier onlyDeptMember() { require(deptMembers[msg.sender], "Not dept member"); _; }
    modifier onlyRecruiter() { require(recruiters[msg.sender], "Not recruiter"); _; }

    constructor(address _auth, address _dept) {
        authority = _auth;
        deptHead = _dept;
        minMarksPolicy = 60;
        maxStipendPolicy = 50000;
    }

    // ------------------------------------------------------------
    // Certificates and file hashes
    // ------------------------------------------------------------
    struct RecruiterCert { bytes32 hash; bool valid; }
    struct ApplicantCert { bytes32 hash; uint16 marks; bool valid; }

    mapping(address => RecruiterCert) public recruiterCerts;
    mapping(address => ApplicantCert) public applicantCerts;

    // Mapping of verified student PDF hashes
    mapping(bytes32 => string) public studentCertMap; // pdfHash => studentId

    // Authority certificate hash for recruiters to verify signatures
    bytes32 public authorityCertHash;

    event FileVerified(address recruiter, address applicant, bytes32 pdfHash);

    function setAuthorityCert(bytes32 certHash) external onlyAuthority {
        authorityCertHash = certHash;
    }

    function uploadStudentCert(bytes32 pdfHash, string calldata studentId) external onlyAuthority {
        require(bytes(studentId).length > 0, "Invalid student ID");
        studentCertMap[pdfHash] = studentId;
    }

    function issueRecruiterCert(address r, bytes32 h) external onlyAuthority {
        recruiters[r] = true;
        recruiterCerts[r] = RecruiterCert(h, true);
    }

    function issueApplicantCert(address a, uint16 m, bytes32 h) external onlyAuthority {
        applicantCerts[a] = ApplicantCert(h, m, true);
    }

    // ------------------------------------------------------------
    // Department Policy
    // ------------------------------------------------------------
    uint16 public minMarksPolicy;
    uint256 public maxStipendPolicy;

    function setPolicy(uint16 minMarks, uint256 maxStipend) external onlyDeptHead {
        minMarksPolicy = minMarks;
        maxStipendPolicy = maxStipend;
    }

    function addDeptMember(address m) external onlyDeptHead {
        deptMembers[m] = true;
    }

    // ------------------------------------------------------------
    // Vacancy lifecycle
    // ------------------------------------------------------------
    enum VStatus { Requested, Approved, Open, Filled }

    struct Vacancy {
        uint id;
        address recruiter;
        address requestedBy;
        uint16 minMarks;
        uint256 stipend;
        string desc;
        VStatus status;
        address selected;
    }

    uint public nextVacancy;
    mapping(uint => Vacancy) public vacancies;
    mapping(uint => address[]) public applicants;

    function requestVacancy(address recruiter, uint16 minMarks, string calldata desc)
        external onlyDeptMember returns (uint)
    {
        require(recruiters[recruiter], "Recruiter not registered");
        uint id = nextVacancy++;
        vacancies[id] = Vacancy(id, recruiter, msg.sender, minMarks, 0, desc, VStatus.Requested, address(0));
        return id;
    }

    function approveVacancy(uint id, uint256 stipend) external onlyDeptHead {
        Vacancy storage v = vacancies[id];
        require(v.status == VStatus.Requested, "Not requested");
        require(stipend <= maxStipendPolicy, "Stipend > policy");
        require(v.minMarks >= minMarksPolicy, "Marks < policy");
        v.stipend = stipend;
        v.status = VStatus.Approved;
    }

    function openVacancy(uint id) external onlyRecruiter {
        Vacancy storage v = vacancies[id];
        require(v.recruiter == msg.sender, "Not your vacancy");
        require(v.status == VStatus.Approved, "Not approved");
        require(recruiterCerts[msg.sender].valid, "Recruiter cert invalid");
        v.status = VStatus.Open;
    }

    // ------------------------------------------------------------
    // Applications
    // ------------------------------------------------------------
    enum AppStatus { None, Applied, Rejected, Selected }

    struct Application {
        bytes32 certHash;
        AppStatus status;
    }

    mapping(uint => mapping(address => Application)) public applications;

    function applyForVacancy(uint id, bytes32 certHash) external {
        Vacancy storage v = vacancies[id];
        require(v.status == VStatus.Open, "Vacancy not open");
        ApplicantCert memory ac = applicantCerts[msg.sender];
        require(ac.valid && ac.hash == certHash, "Invalid cert");
        require(ac.marks >= v.minMarks, "Marks too low");
        require(applications[id][msg.sender].status == AppStatus.None, "Already applied");
        applications[id][msg.sender] = Application(certHash, AppStatus.Applied);
        applicants[id].push(msg.sender);
    }

    // ------------------------------------------------------------
    // Recruiter actions
    // ------------------------------------------------------------
    function confirmFileVerification(address applicant, bytes32 pdfHash) external onlyRecruiter {
        // Recruiter calls this after verifying PDF + signature locally
        require(bytes(studentCertMap[pdfHash]).length > 0, "Hash not uploaded by Authority");
        emit FileVerified(msg.sender, applicant, pdfHash);
    }

    function selectApplicant(uint id, address applicant) external onlyRecruiter {
        Vacancy storage v = vacancies[id];
        require(v.recruiter == msg.sender, "Not your vacancy");
        require(v.status == VStatus.Open, "Vacancy not open");
        require(applications[id][applicant].status == AppStatus.Applied, "Not applied");

        v.selected = applicant;
        v.status = VStatus.Filled;
        applications[id][applicant].status = AppStatus.Selected;

        for (uint i = 0; i < applicants[id].length; i++) {
            address other = applicants[id][i];
            if (other != applicant && applications[id][other].status == AppStatus.Applied) {
                applications[id][other].status = AppStatus.Rejected;
            }
        }
    }

    // ------------------------------------------------------------
    // View & Verification
    // ------------------------------------------------------------
    function verifyRecruiter(address r) external view returns (bool) {
        return recruiterCerts[r].valid;
    }

    function verifyApplicant(address a) external view returns (bool, uint16) {
        ApplicantCert memory ac = applicantCerts[a];
        return (ac.valid, ac.marks);
    }

    function getApplicants(uint id) external view returns (address[] memory) {
        return applicants[id];
    }

    function getApplicationStatus(uint id, address a) external view returns (AppStatus) {
        return applications[id][a].status;
    }
}
