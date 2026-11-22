export const solidity = body => `// SPDX-License-Identifier: MIT\npragma solidity >=0.8.24 <0.9.0;\n${body}\n`;

export const invalidUsing = solidity("contract Custom { using string for unit256; }");
export const invalidType = solidity(`
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
contract Custom { using Strings for unit256; }`);
export const fixedUsing = solidity(`
import {Strings} from "@openzeppelin/contracts@5.0.2/utils/Strings.sol";
contract Custom {
    using Strings for uint256;
    function label(uint256 id) external pure returns (string memory) { return id.toString(); }
}`);

export const nft = solidity(`
import {ERC721} from "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts@5.0.2/utils/Strings.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
contract Editions is ERC721Enumerable, AccessControl {
    using Strings for uint256;
    bytes32 public immutable root;
    uint256 public nextId;
    mapping(address => bool) public claimed;
    error ClaimUnavailable();
    constructor(bytes32 merkleRoot) ERC721("Edition", "ED") {
        root = merkleRoot;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    function claim(bytes32[] calldata proof) external {
        if (claimed[msg.sender] || !MerkleProof.verifyCalldata(proof, root, keccak256(abi.encode(msg.sender)))) {
            revert ClaimUnavailable();
        }
        claimed[msg.sender] = true;
        _safeMint(msg.sender, ++nextId);
    }
    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return string.concat("ipfs://metadata/", id.toString());
    }
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`);

export const uploadedProject = [
  { path: "project/src/Custom.sol", content: solidity(`
import {Entry} from "./records/Entry.sol";
import {RegistryProof} from "vendor/RegistryProof.sol";
import {AccessControl} from "@openzeppelin/contracts@5.0.2/access/AccessControl.sol";
contract Custom is AccessControl {
    using RegistryProof for Entry;
    bytes32 public constant REGISTRAR = keccak256("REGISTRAR");
    mapping(bytes32 => Entry) private records;
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR, admin);
    }
    function add(address owner, uint128 amount) external onlyRole(REGISTRAR) returns (bytes32 tag) {
        Entry memory entry = Entry(owner, amount);
        tag = entry.tag();
        records[tag] = entry;
    }
    function read(bytes32 tag) external view returns (Entry memory) { return records[tag]; }
}`) },
  { path: "project/src/records/Entry.sol", content: solidity("struct Entry { address owner; uint128 amount; }") },
  { path: "project/node_modules/vendor/RegistryProof.sol", content: solidity(`
import {Entry} from "../../src/records/Entry.sol";
import {Salt} from "./lib/Salt.sol";
library RegistryProof {
    function tag(Entry memory entry) internal pure returns (bytes32) {
        return Salt.digest(abi.encode(entry.owner, entry.amount));
    }
}`) },
  { path: "project/node_modules/vendor/lib/Salt.sol", content: solidity(`
library Salt {
    function digest(bytes memory message) internal pure returns (bytes32) { return keccak256(message); }
}`) },
];

export const upgradeable = solidity(`
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable@5.0.2/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "node_modules/@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
contract UpgradeableReserve is ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable {
    constructor() { _disableInitializers(); }
    function initialize(address owner, uint256 supply) external initializer {
        __ERC20_init("Reserve", "RSV");
        __Ownable_init(owner);
        __Pausable_init();
        _mint(owner, supply);
    }
    function pause(bool stopped) external onlyOwner { if (stopped) _pause(); else _unpause(); }
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        super._update(from, to, amount);
    }
}`);
