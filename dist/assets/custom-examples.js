export const ownershipExample = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Custom {
    address public owner;
    uint256 public value;

    error NotOwner(address caller);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    function setValue(uint256 newValue) external onlyOwner {
        value = newValue;
    }
}
`;
