// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InstituteRecruitment {

    string[] public roleTypes = ["Faculty", "Staff", "Applicant"];
    string[] public deptTypes = ["Academics", "HumanResources"];
    string[] public departments = ["ComputerScience", "DataScienceandArtificialIntelligence", "Electrical", "Mechanical", "Mechatronics", "HumanResource"];
    string[] public vacancyStatuses = ["Requested", "DeptHeadApproved", "HRApproved", "Posted", "Filled"];
    string[] public applicationStatuses = ["Applied", "Verified", "Selected", "Rejected"];

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

    mapping(address => Member) public members;
    mapping(uint => Vacancy) public vacancies;
    mapping(address => Applicant[]) public applications;

    // -----------------------------------------------------------------------
    // MEMBER CHECK
    // -----------------------------------------------------------------------
    function checkMember(address _ID) public view returns (bool) {
        return bytes(members[_ID].Name).length > 0;
    }

    function addMember(
        string memory _Name,
        string memory _Role,
        string memory _DeptType,
        string memory _Dept,
        bool _isHead
    ) public {
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
    }

    // -----------------------------------------------------------------------
    // VACANCY REQUEST
    // -----------------------------------------------------------------------
    function requestVacancy(
        uint _VacancyID,
        string memory _Role,
        string memory _DeptType,
        string memory _Dept,
        string memory _Description,
        string memory _Requirements
    ) public {
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
    }

    // -----------------------------------------------------------------------
    // STATUS VIEW
    // -----------------------------------------------------------------------
    function getVacancyStatus(uint _VacancyID) public view returns (string memory) {
        require(checkMember(msg.sender), "Only Members Allowed");
        require(
            keccak256(bytes(members[msg.sender].Role)) == keccak256(bytes("Staff")) ||
            keccak256(bytes(members[msg.sender].Role)) == keccak256(bytes("Faculty")),
            "Only Faculty Or Staff Allowed"
        );

        return vacancies[_VacancyID].status;
    }

    // -----------------------------------------------------------------------
    // DEPT HEAD APPROVAL
    // -----------------------------------------------------------------------
    function getVacanciesRequiringDepartmentHeadApproval()
        public
        view
        returns (uint[] memory)
    {
        require(checkMember(msg.sender), "Only Members Allowed");
        require(members[msg.sender].isHead, "Only Department Heads Allowed");

        uint count = 0;
        for (uint i = 0; i < 10000; i++) {
            if (
                vacancies[i].VacancyID != 0 &&
                keccak256(bytes(vacancies[i].status)) == keccak256(bytes("Requested")) &&
                keccak256(bytes(vacancies[i].DeptType)) == keccak256(bytes(members[msg.sender].DeptType))
            ) count++;
        }

        uint[] memory results = new uint[](count);
        uint idx = 0;

        for (uint i = 0; i < 10000; i++) {
            if (
                vacancies[i].VacancyID != 0 &&
                keccak256(bytes(vacancies[i].status)) == keccak256(bytes("Requested")) &&
                keccak256(bytes(vacancies[i].DeptType)) == keccak256(bytes(members[msg.sender].DeptType))
            ) {
                results[idx++] = i;
            }
        }

        return results;
    }

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

    // -----------------------------------------------------------------------
    // UNIMPLEMENTED FUNCTIONS FIXED TO REVERT SAFELY
    // -----------------------------------------------------------------------
    // HR approval
    function getVacanciesRequiringHRApproval() 
        public 
        view 
        returns (uint[] memory) 
    {
        /*
            INPUT:
                none

            OUTPUT:
                uint[] -> list of vacancy IDs where:
                    status == "DeptHeadApproved"
        */
        revert("Not implemented");
    }

    function approveVacancybyHR(uint _VacancyID) public {
        /*
            INPUT:
                _VacancyID -> must exist, must be in "DeptHeadApproved" stage

            OUTPUT:
                none
                (side-effect) vacancy.status = "HRApproved"
                (side-effect) vacancy.hrApprovedBy = msg.sender
        */
        revert("Not implemented");
    }

    // Applicants view vacancies and apply
    function getVacanciesforApplicants() 
        public 
        view 
        returns (uint[] memory) 
    {
        /*
            INPUT:
                none

            OUTPUT:
                uint[] -> list of vacancy IDs where:
                    status == "Posted"
        */
        revert("Not implemented");
    }

    function applyforVacancyasApplicant(uint _VacancyID) public {
        /*
            INPUT:
                _VacancyID -> must exist, must be "Posted"
                msg.sender -> must be a registered Applicant

            OUTPUT:
                none
                (side-effect) adds msg.sender to vacancy.applicants
                (side-effect) adds Applicant struct {id, vacancyID, "Applied"}
        */
        revert("Not implemented");
    }

    function checkApplicationStatusbyApplicant(uint _VacancyID) 
        public 
        view 
        returns (string memory) 
    {
        /*
            INPUT:
                _VacancyID
                msg.sender -> applicant

            OUTPUT:
                string -> "Applied" / "Verified" / "Selected" / "Rejected"
        */
        revert("Not implemented");
    }

    // HR → CA verification
    function requestforApplicantVerificationbyHR(
        uint _VacancyID,
        address _applicant
    ) public {
        /*
            INPUT:
                _VacancyID -> must exist, must be "HRApproved"
                _applicant -> must have applied for this vacancy
                msg.sender -> must be HR

            OUTPUT:
                none
                (side-effect) marks applicant as "Applied" but awaiting CA verification
        */
        revert("Not implemented");
    }

    function verifyApplicantbyCA(
        uint _VacancyID, 
        address _applicant
    ) public {
        /*
            INPUT:
                _VacancyID
                _applicant -> must be requested by HR for verification
                msg.sender -> must be CA

            OUTPUT:
                none
                (side-effect) updates applicant.status = "Verified"
        */
        revert("Not implemented");
    }

    // HR selects → Vacancy filled
    function selectApplicantbyHRandFillVacancy(
        uint _VacancyID,
        address _applicant
    ) public {
        /*
            INPUT:
                _VacancyID
                _applicant -> must be Verified
                msg.sender -> must be HR

            OUTPUT:
                none
                (side-effect) applicant.status = "Selected"
                (side-effect) vacancy.status = "Filled"
                (side-effect) vacancy.filledBy = msg.sender
        */
        revert("Not implemented");
    }

    // -----------------------------------------------------------------------
    // VALIDATION HELPERS
    // -----------------------------------------------------------------------
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
}
