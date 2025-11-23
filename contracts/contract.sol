// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    struct Certificate {
        address issuer;       // who issued (CBSE)
        string rollNo;        // student roll number
        uint256 issueDate;    // timestamp
        bool revoked;         // revocation flag
    }

    mapping(bytes32 => Certificate) public certificates;  // fileHash => cert data

    event CertificateIssued(bytes32 indexed fileHash, string rollNo, address issuer);
    event CertificateRevoked(bytes32 indexed fileHash, address issuer);

    modifier onlyIssuer(bytes32 fileHash) {
        require(certificates[fileHash].issuer == msg.sender, "Not certificate issuer");
        _;
    }

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
