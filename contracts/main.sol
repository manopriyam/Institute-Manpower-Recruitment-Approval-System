// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InstituteRecruitment {

    string[] public roleTypes = ["Faculty", "Staff", "Applicant"];
    string[] public deptTypes = ["Academics", "HumanResource"];
    string[] public departments = ["ComputerScience", "DataScienceandArtificialIntelligence", "Electrical", "Mechanical", "Mechatronics"];
    string[] public vacancyStatuses = ["Requested", "DeptHeadApproved", "HRApproved", "Posted", "Filled"];
    string[] public applicationStatuses = ["Applied", "UnderReview", "Selected", "Rejected"];

    struct Member {
        address ID;
        string Name;
        string Role;
        string DeptType;
        string Dept;
    }

    struct Vacancy {
        uint VacancyID;
        string Role;
        string DeptType;
        string Dept;
        string Description;
        string Requirements;
        address[] applicants;
        string status;
        address requestedBy;
        address deptHeadApprovedBy;
        address hrApprovedBy;
        address postedBy;
        address filledBy; 
    }

    struct Applicant {
        address applicantID;
        uint vacancyID;
        string status;
    }    
    
    struct Certificate {
        address issuer;       // who issued (CBSE)
        string rollNo;        // student roll number
        uint256 issueDate;    // timestamp
        bool revoked;         // revocation flag
    }

    // mappings instead of arrays
    mapping(address => Member) public members;
    mapping(uint => Vacancy) public vacancies;
    mapping(address => Applicant[]) public applications;
    mapping(bytes32 => Certificate) public certificates;  // fileHash => cert data

    // events and modifiers
    event CertificateIssued(bytes32 indexed fileHash, string rollNo, address issuer);
    event CertificateRevoked(bytes32 indexed fileHash, address issuer);

    modifier onlyIssuer(bytes32 fileHash) {
        require(certificates[fileHash].issuer == msg.sender, "Not certificate issuer");
        _;
    }

    // check if a member exists
    function checkMember(address _ID) public view returns (bool) {
        return bytes(members[_ID].Name).length > 0;
    }

    // add member
    function addMember(
        string memory _Name,
        string memory _Role,
        string memory _DeptType,
        string memory _Dept
    ) public {
        require(isValidRole(_Role), "Invalid Role");
        require(isValidDeptType(_DeptType), "Invalid DeptType");
        require(isValidDept(_Dept), "Invalid Dept");

        members[msg.sender] = Member({
            ID: msg.sender,
            Name: _Name,
            Role: _Role,
            DeptType: _DeptType,
            Dept: _Dept
        });
    }

    // member requests vacancy
    function requestVacancy(uint _VacancyID) public {
        require(checkMember(msg.sender), "Only members can request vacancies");
        vacancies[_VacancyID].status = "Requested";
        vacancies[_VacancyID].requestedBy = msg.sender;
    }

    // empty placeholder functions
    function postVacancy(uint _VacancyID, string memory _Role, string memory _DeptType, string memory _Dept, string memory _Description, string memory _Requirements) public {}
    function approveByDeptHead(uint _VacancyID) public {}
    function approveByHR(uint _VacancyID) public {}
    function applyForVacancy(uint _VacancyID) public {}
    function fillVacancy(uint _VacancyID, address _applicant) public {}
    function modifyMember(address _ID, Member memory updated) public {}
    function modifyVacancy(uint _VacancyID, Vacancy memory updated) public {}
    function removeMember(address _ID) public {}
    function removeVacancy(uint _VacancyID) public {}
    function checkVacancyStatus() public view returns (Vacancy memory) {}

    // validation helpers
    function isValidRole(string memory _role) internal view returns (bool) {
        for (uint i = 0; i < roleTypes.length; i++) {
            if (keccak256(bytes(_role)) == keccak256(bytes(roleTypes[i]))) return true;
        }
        return false;
    }

    function isValidDeptType(string memory _type) internal view returns (bool) {
        for (uint i = 0; i < deptTypes.length; i++) {
            if (keccak256(bytes(_type)) == keccak256(bytes(deptTypes[i]))) return true;
        }
        return false;
    }

    function isValidDept(string memory _dept) internal view returns (bool) {
        for (uint i = 0; i < departments.length; i++) {
            if (keccak256(bytes(_dept)) == keccak256(bytes(departments[i]))) return true;
        }
        return false;
    }

    // validate applicant
    // Issue new certificate
    function issueCertificate(bytes32 fileHash, string memory rollNo) public {
        require(certificates[fileHash].issuer == address(0), "Already issued");
        certificates[fileHash] = Certificate(msg.sender, rollNo, block.timestamp, false);
        emit CertificateIssued(fileHash, rollNo, msg.sender);
    }

    // Revoke an existing certificate
    function revokeCertificate(bytes32 fileHash) public onlyIssuer(fileHash) {
        certificates[fileHash].revoked = true;
        emit CertificateRevoked(fileHash, msg.sender);
    }

    // Verify certificate validity (✅ ON-CHAIN verification)
    function verifyCertificate(bytes32 fileHash) public view returns (bool valid, address issuer, string memory rollNo) {
        Certificate memory c = certificates[fileHash];
        if (c.issuer == address(0) || c.revoked) {
            return (false, address(0), "");
        }
        return (true, c.issuer, c.rollNo);
    }
}
