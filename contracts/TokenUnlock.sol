pragma solidity =0.5.16;
import "./TokenUnlockData.sol";
import "./SafeMath.sol";
import "./IERC20.sol";


/**
 * @title FPTCoin is finnexus collateral Pool token, implement ERC20 interface.
 * @dev ERC20 token. Its inside value is collatral pool net worth.
 *
 */
contract TokenUnlock is TokenUnlockData {
    using SafeMath for uint256;
    modifier inited (){
    	  require(phxAddress !=address(0));
    	  _;
    }

    constructor(address _phxAddress,address multiSignature)
        multiSignatureClient(multiSignature)
        public
    {
        phxAddress = _phxAddress;
    }



    function update() validCall public{
    }

    /**
     * @dev getting back the left mine token
     * @param reciever the reciever for getting back mine token
     */
    function getbackLeftPhx(address reciever)  public onlyOperator(0) validCall {
        uint256 bal =  IERC20(phxAddress).balanceOf(address(this));
        IERC20(phxAddress).transfer(reciever,bal);
    }  

    function lockedBalanceOf(address user) public view returns (uint256) {
        lockedInfo storage lr = allLockedPhx[user];
        return lr.pendingAmount;
    }

    function getUserLockedItemInfo(address user,uint256 alloxidx) public view returns (uint256,uint256,uint256,bool) {
        lockedItem storage lralloc = allLockedPhx[user].alloc[alloxidx];
        return (lralloc.startTime,lralloc.endTime,lralloc.amount,allLockedPhx[user].disable);
    }

    function setMultiUsersPhxUnlockInfo( address[] memory users,
                                      uint256[] memory amounts,
                                      uint256[] memory startTimes,
                                      uint256[] memory timeIntervals,
                                      uint256[] memory allocTimes)
        public
        inited
        onlyOperator(0)
        validCall
    {
        require(users.length==amounts.length);
        require(users.length==startTimes.length);
        require(users.length==timeIntervals.length);
        require(users.length==allocTimes.length);
        uint256 i=0;
        for(;i<users.length;i++){
            _setUserPhxUnlockInfo(users[i],amounts[i],startTimes[i],timeIntervals[i],allocTimes[i]);
        }
    }


    function setUserPhxUnlockInfo(address user,uint256 amount,uint256 startTime,uint256 timeInterval,uint256 allocTimes)
        public
        inited
        onlyOperator(0)
        validCall
    {
        _setUserPhxUnlockInfo(user,amount,startTime,timeInterval,allocTimes);
    }

    function _setUserPhxUnlockInfo(address user,uint256 amount,uint256 startTime,uint256 timeInterval,uint256 allocTimes)
        internal
    {
        require(user!=address(0),"user address is 0");
        require(amount>0,"amount should be bigger than 0");
        require(timeInterval>0,"time interval is 0");
        require(allocTimes>0,"alloc times is 0");
        require(!allLockedPhx[user].disable,"user is diabled already");

        uint256 lastIndex = allLockedPhx[user].totalItem;
        if(lastIndex>0) {
            require(startTime>= allLockedPhx[user].alloc[lastIndex-1].endTime,"starttime is earlier than last set");
        }

        uint256 divAmount = amount.div(allocTimes);
        uint256 startIdx = allLockedPhx[user].totalItem;
        uint256 i;
        for (i=0;i<allocTimes;i++) {
            allLockedPhx[user].alloc[startIdx+i] = lockedItem( startTime.add(i*timeInterval),
                startTime.add((i+1)*timeInterval),
                divAmount);
        }

        allLockedPhx[user].wholeAmount = allLockedPhx[user].wholeAmount.add(amount);
        allLockedPhx[user].pendingAmount = allLockedPhx[user].pendingAmount.add(amount);
        allLockedPhx[user].totalItem = allLockedPhx[user].totalItem.add(allocTimes);

        emit SetUserPhxAlloc(user,amount,divAmount);
    }


    function resetUserPhxUnlockInfo(address user,uint256 roundidx,uint256 amount,uint256 startTime,uint256 endTime)
            public
            inited
            onlyOperator(0)
            validCall
    {
        require(startTime<endTime,"startTime is later than endTime");
        require(now< allLockedPhx[user].alloc[roundidx].endTime,"this alloc is expired already");
        //reset do not need to check because, possible enabled after reset
       // require(!allLockedPhx[user].disable,"user is diabled already");

        allLockedPhx[user].alloc[roundidx].startTime = startTime;
        allLockedPhx[user].alloc[roundidx].startTime = endTime;
        //sub alloc amount
        allLockedPhx[user].pendingAmount =  allLockedPhx[user].pendingAmount.sub(allLockedPhx[user].alloc[roundidx].amount);
        allLockedPhx[user].alloc[roundidx].amount = amount;
        allLockedPhx[user].pendingAmount =  allLockedPhx[user].pendingAmount.add(amount);
    }

    function claimExpiredPhx() public inited notHalted {
        require(!allLockedPhx[msg.sender].disable,"user is diabled already");
        uint256 i = 0;
        uint256 endIdx = allLockedPhx[msg.sender].totalItem ;
        uint256 totalRet=0;
        for(;i<endIdx;i++) {
           //only count the rewards over at least one timeSpan
           if (now >= allLockedPhx[msg.sender].alloc[i].endTime) {
               if (allLockedPhx[msg.sender].alloc[i].amount > 0) {
                   totalRet = totalRet.add(allLockedPhx[msg.sender].alloc[i].amount);
                   allLockedPhx[msg.sender].alloc[i].amount = 0;
               }
           }
        }
        allLockedPhx[msg.sender].pendingAmount = allLockedPhx[msg.sender].pendingAmount.sub(totalRet);

        //transfer back to user
        uint256 balbefore = IERC20(phxAddress).balanceOf(msg.sender);
        IERC20(phxAddress).transfer(msg.sender,totalRet);
        uint256 balafter = IERC20(phxAddress).balanceOf(msg.sender);
        require((balafter-balbefore)==totalRet,"error transfer phx,balance check failed");
        
        emit ClaimPhx(msg.sender,totalRet, allLockedPhx[msg.sender].pendingAmount);
    }
    
    function getClaimAbleBalance(address user) public view returns (uint256) {
        uint256 i = 0;
        uint256 endIdx = allLockedPhx[user].totalItem ;
        uint256 totalRet=0;
        for(;i<endIdx;i++) {
            //only count the rewards over at least one timeSpan
            if (now >= allLockedPhx[user].alloc[i].endTime) {
                if (allLockedPhx[user].alloc[i].amount > 0) {
                    totalRet = totalRet.add(allLockedPhx[user].alloc[i].amount);
                }
            }
        }
        return totalRet;
    }

    function setUserStatus(address user,bool disable)
        public
        inited
        validCall
        notHalted
    {
        require(user != address(0));
        allLockedPhx[user].disable = disable;
    }
    
}
