pragma solidity ^0.5.16;
import "./TokenUnlockData.sol";

contract TokenUnlockProxy is TokenUnlockData {
    address public logic_contract;

    constructor(address _logicAddress,address multiSignature)
        multiSignatureClient(multiSignature)
        public
    {
        logic_contract = _logicAddress;
    }

    // admin to set contract
    function setLogicContract(address _logicAddress)
        public
        validCall
        returns (bool success)
    {
        logic_contract = _logicAddress;
        require(true);
    }

    // fall back function
    function () payable external {
        address target = logic_contract;
        assembly {
        // Copy the data sent to the memory address starting free mem position
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize)

        // Proxy the call to the contract address with the provided gas and data
            let result := delegatecall(gas, target, ptr, calldatasize, 0, 0)

        // Copy the data returned by the proxied call to memory
            let size := returndatasize
            returndatacopy(ptr, 0, size)

        // Check what the result is, return and revert accordingly
            switch result
            case 0 { revert(ptr, size) }
            case 1 { return(ptr, size) }
        }
    }

}
