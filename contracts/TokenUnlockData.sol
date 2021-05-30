pragma solidity =0.5.16;
import "./Halt.sol";
import "./Operator.sol";
import "./multiSignatureClient.sol";
contract TokenUnlockData is multiSignatureClient,Halt {
    //the locjed reward info

    struct lockedItem {
        uint256 startTime; //this tx startTime for locking
        uint256 endTime;   //record input amount in each lock tx
        uint256 amount;
    }

    struct lockedInfo {
        uint256 wholeAmount;
        uint256 pendingAmount;     //record input amount in each lock tx
        uint256 totalItem;
        bool    disable;
        mapping (uint256 => lockedItem) alloc;//the allocation table
    }

    address public phxAddress;  //fnx token address

    mapping (address => lockedInfo) public allLockedPhx;//converting tx record for each user

    event SetUserPhxAlloc(address indexed owner, uint256 indexed amount,uint256 indexed worth);

    event ClaimPhx(address indexed owner, uint256 indexed amount,uint256 indexed worth);

}