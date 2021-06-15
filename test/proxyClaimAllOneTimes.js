const { time, expectEvent} = require("@openzeppelin/test-helpers")
let utils = require('./utils.js');

let CFNC = artifacts.require("CFNX");
let TokenUnlocker = artifacts.require("TokenUnlock");
let multiSignature = artifacts.require("multiSignature");
let TokenUnlockerProxy = artifacts.require("TokenUnlockProxy");

const BN = require("bn.js");
const assert = require('assert');

const ONE_HOUR = 60*60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_MONTH = 30 * ONE_DAY;

async function createApplication(multiSign,account,to,value,message){
  await multiSign.createApplication(to,value,message,{from:account});
  return await multiSign.getApplicationHash(account,to,value,message)
}

async function testViolation(message,testFunc){
  try {
    await testFunc();
    return true;
  } catch (error) {
    //console.log(error);
    return false;
  }
}

contract('PhxAllocTest', function (accounts) {
    let phxAmount = "6000000000000000000";
    let PHXInst;
    let unLockerInst;
    let unLockerAbiInst;
    let unLockerProxyInst;
    var initTime;

    before(async () => {

      let addresses = [accounts[7],accounts[8],accounts[9]]
      mulSigInst = await multiSignature.new(addresses,2,{from : accounts[0]})

      PHXInst = await CFNC.new();
      console.log("phx address:" + PHXInst.address);

      unLockerInst = await TokenUnlocker.new(PHXInst.address,mulSigInst.address);
      console.log("unlocker address:" + unLockerInst.address);

      unLockerAbiInst = unLockerInst;

     unLockerProxyInst = await TokenUnlockerProxy.new(unLockerInst.address,PHXInst.address,mulSigInst.address);
     console.log("proxy address:" + unLockerProxyInst.address);

      unLockerInst = await TokenUnlocker.at(unLockerProxyInst.address);
      console.log("2 unlocker address:" + unLockerInst.address);

      unLockerInst.setOperator(0,accounts[9])

      tx = await PHXInst.mint(unLockerInst.address,new BN(phxAmount).mul(new BN(3)));
      assert.equal(tx.receipt.status,true);

    });

    it('Set user locked phx info', async function () {
        var amount = phxAmount;
        var interval = ONE_MONTH;
        var allocTimes = 6;
        let block = await web3.eth.getBlock("latest");
        startTime = block.timestamp

        let msgData = unLockerInst.contract.methods.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes).encodeABI();
        let hash = await createApplication(mulSigInst,accounts[9],unLockerInst.address,0,msgData);

        let res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved",async function(){
            await unLockerInst.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes,{from:accounts[9]});
        });
        assert.equal(res,false,"should return false")

        let index = await mulSigInst.getApplicationCount(hash)
        index = index.toNumber()-1;
        console.log(index);

        await mulSigInst.signApplication(hash,index,{from:accounts[7]})
        await mulSigInst.signApplication(hash,index,{from:accounts[8]})

        initTime = startTime;
        console.log(startTime);

        res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved",async function(){
            await unLockerInst.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes,{from:accounts[9]});
        });
        assert.equal(res,true,"should return true")

        startTime = startTime + ONE_MONTH*6
        msgData = unLockerInst.contract.methods.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes).encodeABI();
        hash = await createApplication(mulSigInst,accounts[9],unLockerInst.address,0,msgData);
        index = await mulSigInst.getApplicationCount(hash)
        index = index.toNumber()-1;
        console.log(index);

        await mulSigInst.signApplication(hash,index,{from:accounts[7]})
        res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved",async function(){
            await unLockerInst.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes,{from:accounts[9]});
        });
        assert.equal(res,false,"should return false")

        await mulSigInst.signApplication(hash,index,{from:accounts[8]})

        res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved",async function(){
            await unLockerInst.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes,{from:accounts[9]});
        });
        assert.equal(res,true,"should return true")

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

    it('Get back left phx', async function () {
      let beforePhxUser =  web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));
      let scBalance = web3.utils.fromWei(await PHXInst.balanceOf(unLockerInst.address));

      let msgData = unLockerInst.contract.methods.getbackLeftPhx(accounts[1]).encodeABI();
      let hash = await createApplication(mulSigInst, accounts[9], unLockerInst.address, 0, msgData);

      let res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved", async function() {
        await unLockerInst.getbackLeftPhx(accounts[1],{ from: accounts[9] });
      });
      assert.equal(res, false, "should return false")

      let index = await mulSigInst.getApplicationCount(hash)
      index = index.toNumber() - 1;
      console.log(index);

      await mulSigInst.signApplication(hash, index, { from: accounts[7] })
      res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved", async function() {
        await unLockerInst.getbackLeftPhx(accounts[1],{ from: accounts[9] });
      });
      assert.equal(res, false, "should return false")

      await mulSigInst.signApplication(hash, index, { from: accounts[8] })

      res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved", async function() {
        await unLockerInst.getbackLeftPhx(accounts[1],{ from: accounts[9] });
      });
      assert.equal(res, true, "should return true")

      afterPhxUser =  web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));
      diff = afterPhxUser - beforePhxUser;
      assert.equal(diff,scBalance,"balance should be same");

    })

})