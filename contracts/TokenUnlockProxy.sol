pragma solidity ^0.5.16;
import "./TokenUnlockData.sol";

contract TokenUnlockProxy is TokenUnlockData {
    address public logic_contract;

    constructor(address _logicAddress,address _phxAddress,address multiSignature)
        multiSignatureClient(multiSignature)
        public
    {
        phxAddress = _phxAddress;
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
        // delegate all other functions to current implementation
        (bool success, ) = logic_contract.delegatecall(msg.data);
        assembly {
            let free_mem_ptr := mload(0x40)
            returndatacopy(free_mem_ptr, 0, returndatasize)

            switch success
            case 0 { revert(free_mem_ptr, returndatasize) }
            default { return(free_mem_ptr, returndatasize) }
        }
    }

}
