pragma solidity =0.5.16;
import "./Halt.sol";
import "./Operator.sol";

contract TokenUnlockData is Operator,Halt {
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

    address public fnxAddress;  //fnx token address

    mapping (address => lockedInfo) public lockedAllLockedFnx;//converting tx record for each user

    event SetUserFnxAlloc(address indexed owner, uint256 indexed amount,uint256 indexed worth);

    event ClaimFnx(address indexed owner, uint256 indexed amount,uint256 indexed worth);

}