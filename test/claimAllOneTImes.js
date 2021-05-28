const { time, expectEvent} = require("@openzeppelin/test-helpers")
let utils = require('./utils.js');

let CFNC = artifacts.require("CFNX");
let TokenUnlocker = artifacts.require("TokenUnlock");

const BN = require("bn.js");
const assert = require('assert');

const ONE_HOUR = 60*60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_MONTH = 30 * ONE_DAY;

contract('PhxAllocTest', function (accounts) {
    let phxAmount = new BN("6000000000000000000");
    let PHXInst;
    let unLockerInst;
    var initTime;

    before(async () => {
        PHXInst = await CFNC.new();
        console.log("phx address:" + PHXInst.address);

        unLockerInst = await TokenUnlocker.new(PHXInst.address);
        console.log("unlocker address:" + unLockerInst.address);

        let tx = await unLockerInst.setParameter(PHXInst.address);
        assert.equal(tx.receipt.status,true);

        tx = await unLockerInst.setOperator(0,accounts[8]);
        assert.equal(tx.receipt.status,true);

        tx = await unLockerInst.setOperator(1,accounts[9]);
        assert.equal(tx.receipt.status,true);

        tx = await PHXInst.mint(unLockerInst.address,phxAmount.mul(new BN(2)));
        assert.equal(tx.receipt.status,true);

    });

    it('Set user locked phx info', async function () {
        var amount = phxAmount;
        var interval = ONE_MONTH;
        var allocTimes = 6;

        let block = await web3.eth.getBlock("latest");
        startTime = block.timestamp

        initTime = startTime;
        console.log(startTime);

        let tx = await unLockerInst.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes,{from:accounts[9]});
        assert.equal(tx.receipt.status,true);

        startTime = startTime + ONE_MONTH*6
        tx = await unLockerInst.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes,{from:accounts[9]});
        assert.equal(tx.receipt.status,true);

        let lockedPhx =   web3.utils.fromWei(await unLockerInst.lockedBalanceOf(accounts[1]));
        assert.equal(lockedPhx,12);

        let lockinfo = await unLockerInst.allLockedPhx(accounts[1])
        console.log(lockinfo)

        let itemcount = parseInt(lockinfo[2].toString())
        assert.equal(itemcount,12)

        for(var i=0;i<itemcount;i++) {
            let item = await unLockerInst.getUserLockedItemInfo(accounts[1],i)
            console.log(i,item[0].toString(10),item[1].toString(10),item[2].toString(10));
            assert.equal(web3.utils.fromWei(item[2]),1)
        }
    })


     it('Get half locked PHX', async function () {
          await time.increaseTo(initTime + 6*ONE_MONTH + 100)
          let block = await web3.eth.getBlock("latest");
          let intervalNum = parseInt((block.timestamp - initTime)/ONE_MONTH)
          console.log("timestamp="+block.timestamp,"startTime="+initTime,"intervalNum=" + intervalNum);

          let claimable = web3.utils.fromWei(await unLockerInst.getClaimAbleBalance(accounts[1]))
          console.log(claimable.toString(10))
          assert.equal(claimable,intervalNum);

          let beforePhxUser =  web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));
          let tx = await unLockerInst.claimExpiredPhx({from:accounts[1]});
          assert.equal(tx.receipt.status,true);
          let afterPhxUser =  web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));
          let diff = afterPhxUser - beforePhxUser;
          assert.equal(diff,claimable);

          let leftPhx = 2*web3.utils.fromWei(phxAmount) - claimable;

          await time.increase(6*ONE_MONTH + 100);
          claimable =  web3.utils.fromWei(await unLockerInst.getClaimAbleBalance(accounts[1]))
          console.log(claimable.toString(10))
          assert.equal(claimable,leftPhx);

          beforePhxUser =  web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));
          tx = await unLockerInst.claimExpiredPhx({from:accounts[1]});
          assert.equal(tx.receipt.status,true);
          afterPhxUser =  web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));
          diff = afterPhxUser - beforePhxUser;
          assert.equal(diff,claimable);

      })

})