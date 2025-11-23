// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InstituteRecruitment {

    string[] public roleTypes = ["Faculty", "Staff", "Applicant"];
    string[] public deptTypes = ["Academics", "HumanResources"];
    string[] public departments = ["ComputerScience", "DataScienceandArtificialIntelligence", "Electrical", "Mechanical", "Mechatronics", "HumanResource"];
    string[] public vacancyStatuses = ["Requested", "DeptHeadApproved", "HRPosted", "Filled"];
    string[] public applicationStatuses = ["Applied", "Verified", "Selected", "Rejected"];

    // Arrays to make mappings iterable
    address[] public memberAddresses;
    uint[] public vacancyIDs;
    address[] public applicantAddresses;
    mapping(address => Member) public members;
    mapping(uint => Vacancy) public vacancies;
    mapping(address => Applicant[]) public applications;

    struct Member {
        address ID;
        string Name;
        string Role;
        string DeptType;
        string Dept;
        bool isHead;
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

    function checkMember(address _ID) public view returns (bool) {
        return members[_ID].ID != address(0);
    }

    function addMember(string memory _Name, string memory _Role, string memory _DeptType, string memory _Dept, bool _isHead) public {
        require(isValidRole(_Role), "Invalid Role");
        require(isValidDeptType(_DeptType), "Invalid DeptType");
        require(isValidDept(_Dept), "Invalid Dept");

        members[msg.sender] = Member({
            ID: msg.sender,
            Name: _Name,
            Role: _Role,
            DeptType: _DeptType,
            Dept: _Dept,
            isHead: _isHead
        });

        memberAddresses.push(msg.sender);  
    }

    function getAllMembers() public view returns (Member[] memory) {
        Member[] memory allMembers = new Member[](memberAddresses.length);
        for (uint i = 0; i < memberAddresses.length; i++) {
            allMembers[i] = members[memberAddresses[i]];
        }
        return allMembers;
    }

    function requestVacancy(uint _VacancyID, string memory _Role, string memory _DeptType, string memory _Dept, string memory _Description, string memory _Requirements) public {
        require(vacancies[_VacancyID].VacancyID == 0, "Vacancy Already Exists");
        require(checkMember(msg.sender), "Only Members Can Request Vacancies");
        require(
            keccak256(bytes(members[msg.sender].Role)) == keccak256(bytes("Staff")) ||
            keccak256(bytes(members[msg.sender].Role)) == keccak256(bytes("Faculty")),
            "Only Faculty or Staff Can Request Vacancies"
        );

        require(isValidRole(_Role), "Invalid Role");
        require(isValidDeptType(_DeptType), "Invalid DeptType");
        require(isValidDept(_Dept), "Invalid Dept");

        Vacancy storage v = vacancies[_VacancyID];
        v.VacancyID = _VacancyID;
        v.Role = _Role;
        v.DeptType = _DeptType;
        v.Dept = _Dept;
        v.Description = _Description;
        v.Requirements = _Requirements;
        v.requestedBy = msg.sender;
        v.status = "Requested";

        vacancyIDs.push(_VacancyID);
    }


    function getAllVacancies() public view returns (Vacancy[] memory) {
        Vacancy[] memory allVacancies = new Vacancy[](vacancyIDs.length);
        for (uint i = 0; i < vacancyIDs.length; i++) {
            allVacancies[i] = vacancies[vacancyIDs[i]];
        }
        return allVacancies;
    }

    // Department Head Approval
    function approveVacancybyDepartmentHead(uint _VacancyID) public {
        require(checkMember(msg.sender), "Only Members Allowed");
        require(members[msg.sender].isHead, "Only Department Head Can Approve");

        Vacancy storage v = vacancies[_VacancyID];
        require(v.VacancyID != 0, "Vacancy Does Not Exist");
        require(
            keccak256(bytes(v.status)) == keccak256(bytes("Requested")),
            "Vacancy Not In Requested Stage"
        );
        require(
            keccak256(bytes(v.DeptType)) == keccak256(bytes(members[msg.sender].DeptType)),
            "Dept Head Cannot Approve Other DeptType"
        );

        v.status = "DeptHeadApproved";
        v.deptHeadApprovedBy = msg.sender;
    }

    // HR Approval
    function approveAndPostVacancybyHR(uint _VacancyID) public {
        require(checkMember(msg.sender), "Only Members Allowed");
        require(keccak256(bytes(members[msg.sender].DeptType)) == keccak256(bytes("HumanResources")), "Only HR Can Approve");

        Vacancy storage v = vacancies[_VacancyID];
        require(v.VacancyID != 0, "Vacancy Does Not Exist");
        require(
            keccak256(bytes(v.status)) == keccak256(bytes("DeptHeadApproved")),
            "Vacancy Not Approved by Dept Head"
        );

        v.status = "HRPosted";
        v.postedBy = msg.sender;
    }

    // Applicants view vacancies
    function getVacanciesforApplicants() public view returns (uint[] memory) {
        uint count = 0;
        for (uint i = 0; i < vacancyIDs.length; i++) {
            if (keccak256(bytes(vacancies[vacancyIDs[i]].status)) == keccak256(bytes("HRPosted"))) {
                count++;
            }
        }

        uint[] memory result = new uint[](count);
        uint idx = 0;
        for (uint i = 0; i < vacancyIDs.length; i++) {
            if (keccak256(bytes(vacancies[vacancyIDs[i]].status)) == keccak256(bytes("HRPosted"))) {
                result[idx++] = vacancyIDs[i];
            }
        }

        return result;
    }

    // Apply for Vacancy
    function applyforVacancy(uint _VacancyID) public {
        require(checkMember(msg.sender), "Only Members Allowed");
        require(keccak256(bytes(members[msg.sender].Role)) == keccak256(bytes("Applicant")), "Only Applicants Can Apply");

        Vacancy storage v = vacancies[_VacancyID];
        require(v.VacancyID != 0, "Vacancy Does Not Exist");
        require(
            keccak256(bytes(v.status)) == keccak256(bytes("HRPosted")),
            "Vacancy Not Posted"
        );

        v.applicants.push(msg.sender);
        applications[msg.sender].push(Applicant(msg.sender, _VacancyID, "Applied"));
        applicantAddresses.push(msg.sender);
    }

    // HR selects applicant and fills vacancy
    function selectApplicantbyHR(uint _VacancyID, address _applicant) public {
        require(checkMember(msg.sender), "Only Members Allowed");
        require(keccak256(bytes(members[msg.sender].Role)) == keccak256(bytes("HumanResources")), "Only HR Can Select");

        Vacancy storage v = vacancies[_VacancyID];
        require(v.VacancyID != 0, "Vacancy Does Not Exist");
        require(keccak256(bytes(v.status)) == keccak256(bytes("HRPosted")), "Vacancy Not Posted");

        bool applicantFound = false;
        for (uint i = 0; i < v.applicants.length; i++) {
            if (v.applicants[i] == _applicant) {
                applicantFound = true;
                break;
            }
        }

        require(applicantFound, "Applicant did not apply for this vacancy");

        // Mark applicant as "Selected" and vacancy as "Filled"
        for (uint i = 0; i < applications[_applicant].length; i++) {
            if (applications[_applicant][i].vacancyID == _VacancyID) {
                applications[_applicant][i].status = "Selected";
            }
        }

        v.status = "Filled";
        v.filledBy = _applicant;
    }

    // Function to return the list of vacancies requiring department head approval
    function getVacanciesRequiringDepartmentHeadApproval() public view returns (uint[] memory) {
        uint[] memory pendingVacancies = new uint[](vacancyIDs.length);
        uint count = 0;

        for (uint i = 0; i < vacancyIDs.length; i++) {
            Vacancy storage v = vacancies[vacancyIDs[i]];
            if (keccak256(bytes(v.status)) == keccak256(bytes("Requested"))) {
                pendingVacancies[count] = v.VacancyID;
                count++;
            }
        }

        uint[] memory result = new uint[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = pendingVacancies[i];
        }

        return result;
    }

    // Function to return the list of vacancies requiring HR approval
    function getVacanciesRequiringHRApproval() public view returns (uint[] memory) {
        uint[] memory pendingVacancies = new uint[](vacancyIDs.length);
        uint count = 0;

        for (uint i = 0; i < vacancyIDs.length; i++) {
            Vacancy storage v = vacancies[vacancyIDs[i]];
            if (keccak256(bytes(v.status)) == keccak256(bytes("DeptHeadApproved"))) {
                pendingVacancies[count] = v.VacancyID;
                count++;
            }
        }

        uint[] memory result = new uint[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = pendingVacancies[i];
        }

        return result;
    }

    // Function to check the application status for an applicant for a specific vacancy
    function checkApplicationStatusbyApplicant(uint _VacancyID) public view returns (string memory) {
        require(checkMember(msg.sender), "Only Members Allowed");

        bool applicantFound = false;
        string memory status;

        // Loop through the applicant's applications to find the specific vacancy
        for (uint i = 0; i < applications[msg.sender].length; i++) {
            if (applications[msg.sender][i].vacancyID == _VacancyID) {
                applicantFound = true;
                status = applications[msg.sender][i].status;
                break;
            }
        }

        require(applicantFound, "You have not applied for this vacancy");

        return status;
    }

    // Validation helpers
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

    // CA ke functions
    function verifyCertificate(bytes32 fileHash) public view returns (bool valid, address issuer, string memory rollNo) {
        Certificate memory c = certificates[fileHash];
        if (c.issuer == address(0) || c.revoked) {
            return (false, address(0), "");
        }
        return (true, c.issuer, c.rollNo);
    }

    
}
