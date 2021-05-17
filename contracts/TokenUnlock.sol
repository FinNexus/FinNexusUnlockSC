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
    	  require(fnxAddress!=address(0));
    	  _;
    } 

    function initialize() onlyOwner public {
    }
    
    function update() onlyOwner public{
    }
    
    /**
     * @dev constructor function. set FNX minePool contract address. 
     */ 
    function setParameter(address _fnxAddress) onlyOwner public{
        if (_fnxAddress != address(0))
            fnxAddress = _fnxAddress;
    }
    
    /**
     * @dev getting back the left mine token
     * @param reciever the reciever for getting back mine token
     */
    function getbackLeftFnx(address reciever)  public onlyOperator(0) {
        uint256 bal =  IERC20(fnxAddress).balanceOf(address(this));
        IERC20(fnxAddress).transfer(reciever,bal);
    }  

    function lockedBalanceOf(address user) public view returns (uint256) {
        lockedInfo storage lr = lockedAllLockedFnx[user];
        return lr.pendingAmount;
    }

    function getUserLockedItemInfo(address user,uint256 alloxidx) public view returns (uint256,uint256,uint256) {
        lockedItem storage lralloc = lockedAllLockedFnx[user].alloc[alloxidx];
        return (lralloc.startTime,lralloc.endTime,lralloc.amount);
    }

    function setUserFnxUnlockInfo(address user,uint256 amount,uint256 startTime,uint256 timeInterval,uint256 allocTimes)
        public
        inited
        onlyOperator(1)
    {
        require(user!=address(0),"user address is 0");
        require(amount>0,"amount should be bigger than 0");
        require(timeInterval>0,"time interval is 0");
        require(allocTimes>0,"alloc times is 0");
        require(!lockedAllLockedFnx[user].disable,"user is diabled already");

        uint256 lastIndex = lockedAllLockedFnx[user].totalItem;
        if(lastIndex>0) {
            require(startTime> lockedAllLockedFnx[user].alloc[lastIndex-1].endTime,"starttime is earlier than last set");
        }

        uint256 divAmount = amount.div(allocTimes);
        uint256 startIdx = lockedAllLockedFnx[user].totalItem;
        uint256 i;
        for (i=0;i<allocTimes;i++) {
             lockedAllLockedFnx[user].alloc[startIdx+i] = lockedItem( startTime.add(i*timeInterval),
                                                                    startTime.add((i+1)*timeInterval),
                                                                    divAmount);
        }

        lockedAllLockedFnx[user].wholeAmount = lockedAllLockedFnx[user].wholeAmount.add(amount);
        lockedAllLockedFnx[user].pendingAmount = lockedAllLockedFnx[user].pendingAmount.add(amount);
        lockedAllLockedFnx[user].totalItem = lockedAllLockedFnx[user].totalItem.add(allocTimes);

        emit SetUserFnxAlloc(user,amount,divAmount);
    }

    function resetUserFnxUnlockInfo(address user,uint256 roundidx,uint256 amount,uint256 startTime,uint256 endTime)
            public
            inited
            onlyOperator(1)
    {
        require(startTime<endTime,"startTime is later than endTime");
        require(now< lockedAllLockedFnx[user].alloc[roundidx].endTime,"this alloc is expired already");
        require(!lockedAllLockedFnx[user].disable,"user is diabled already");

        lockedAllLockedFnx[user].alloc[roundidx].startTime = startTime;
        lockedAllLockedFnx[user].alloc[roundidx].startTime = endTime;
        //sub alloc amount
        lockedAllLockedFnx[user].pendingAmount =  lockedAllLockedFnx[user].pendingAmount.sub(lockedAllLockedFnx[user].alloc[roundidx].amount);
        lockedAllLockedFnx[user].alloc[roundidx].amount = amount;
        lockedAllLockedFnx[user].pendingAmount =  lockedAllLockedFnx[user].pendingAmount.add(amount);
    }

    function claimFnxExpiredFnx() public inited {
        uint256 i = 0;
        uint256 endIdx = lockedAllLockedFnx[msg.sender].totalItem ;
        uint256 totalRet=0;
        for(;i<endIdx;i++) {
           //only count the rewards over at least one timeSpan
           if (now >= lockedAllLockedFnx[msg.sender].alloc[i].endTime) {
               if (lockedAllLockedFnx[msg.sender].alloc[i].amount > 0) {
                   totalRet = totalRet.add(lockedAllLockedFnx[msg.sender].alloc[i].amount);
               }
           }
        }
        lockedAllLockedFnx[msg.sender].pendingAmount = lockedAllLockedFnx[msg.sender].pendingAmount.sub(totalRet);

        //transfer back to user
        uint256 balbefore = IERC20(fnxAddress).balanceOf(msg.sender);
        IERC20(fnxAddress).transfer(msg.sender,totalRet);
        uint256 balafter = IERC20(fnxAddress).balanceOf(msg.sender);
        require((balafter-balbefore)==totalRet,"error transfer fnx,balance check failed");
        
        emit ClaimFnx(msg.sender,totalRet, lockedAllLockedFnx[msg.sender].pendingAmount);
    }
    
    function getClaimAbleBalance(address user) public view returns (uint256) {
        uint256 i = 0;
        uint256 endIdx = lockedAllLockedFnx[user].totalItem ;
        uint256 totalRet=0;
        for(;i<endIdx;i++) {
            //only count the rewards over at least one timeSpan
            if (now >= lockedAllLockedFnx[user].alloc[i].endTime) {
                if (lockedAllLockedFnx[user].alloc[i].amount > 0) {
                    totalRet = totalRet.add(lockedAllLockedFnx[user].alloc[i].amount);
                }
            }
        }

        return totalRet;
    }

    function setUserStatus(address user,bool disable)
        public
        inited
        onlyOperator(1)
    {
        require(user != address(0));
        lockedAllLockedFnx[user].disable = disable;
    }
    
}
