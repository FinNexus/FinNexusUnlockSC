const { time, expectEvent} = require("@openzeppelin/test-helpers")
let utils = require('./utils.js');

let CFNC = artifacts.require("CFNX");
let TokenUnlocker = artifacts.require("TokenUnlock");
let multiSignature = artifacts.require("multiSignature");

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
    return false;
  }
}

contract('PhxAllocTest', function (accounts) {
    let phxAmount = "6000000000000000000";
    let PHXInst;
    let unLockerInst;
    var initTime;

    before(async () => {

      let addresses = [accounts[7],accounts[8],accounts[9]]
      mulSigInst = await multiSignature.new(addresses,2,{from : accounts[0]})

      PHXInst = await CFNC.new();
      console.log("phx address:" + PHXInst.address);

      unLockerInst = await TokenUnlocker.new(PHXInst.address,mulSigInst.address);
      console.log("unlocker address:" + unLockerInst.address);

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

        await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved",async function(){
            await unLockerInst.setUserPhxUnlockInfo(accounts[1],amount,startTime,interval,allocTimes,{from:accounts[9]});
        });


        let lockinfo = await unLockerInst.allLockedPhx(accounts[1])
        console.log(lockinfo)

        let itemcount = parseInt(lockinfo[2].toString())
        assert.equal(itemcount,6)

        for(var i=0;i<itemcount;i++) {
            let item = await unLockerInst.getUserLockedItemInfo(accounts[1],i)
            console.log(i,item[0].toString(10),item[1].toString(10),item[2].toString(10));
            assert.equal(web3.utils.fromWei(item[2]),1)
        }

    })

  it('reSet user info', async function () {
    var amount = web3.utils.toWei("2","ether");
    var interval = ONE_MONTH;
    var allocTimes = 6;
    let block = await web3.eth.getBlock("latest");
    startTime = block.timestamp

    let lockinfo = await unLockerInst.allLockedPhx(accounts[1])
    console.log(lockinfo)

    let itemcount = parseInt(lockinfo[2].toString())
    assert.equal(itemcount,6)

    for(var i=0;i<itemcount;i++) {
      let item = await unLockerInst.getUserLockedItemInfo(accounts[1], i)
      console.log(item)
      let st = item[0].toString();
      let et = item[1].toString();

      let msgData = unLockerInst.contract.methods.resetUserPhxUnlockInfo(accounts[1],i, amount,st,et).encodeABI();
      let hash = await createApplication(mulSigInst, accounts[9], unLockerInst.address, 0, msgData);

      let res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved", async function() {
        await unLockerInst.resetUserPhxUnlockInfo(accounts[1],i, amount, st,et, { from: accounts[9] });
      });
      assert.equal(res, false, "should return false")

      let index = await mulSigInst.getApplicationCount(hash)
      index = index.toNumber() - 1;
      console.log(index);

      await mulSigInst.signApplication(hash, index, { from: accounts[7] })
      await mulSigInst.signApplication(hash, index, { from: accounts[8] })

      initTime = startTime;
      console.log(startTime);

      res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved", async function() {
        await unLockerInst.resetUserPhxUnlockInfo(accounts[1],i, amount, st,et, { from: accounts[9] });
      });

      assert.equal(res, true, "should return true")
    }

    lockinfo = await unLockerInst.allLockedPhx(accounts[1])
    console.log(lockinfo)

    itemcount = parseInt(lockinfo[2].toString())
    assert.equal(itemcount,6)

    for(var i=0;i<itemcount;i++) {
      let item = await unLockerInst.getUserLockedItemInfo(accounts[1],i)
      console.log(i,item[0].toString(10),item[1].toString(10),item[2].toString(10));
      assert.equal(web3.utils.fromWei(item[2]),2)
    }
  })

    it('set user status', async function () {
      var amount = web3.utils.toWei("2","ether");
      var interval = ONE_MONTH;
      var allocTimes = 6;
      let block = await web3.eth.getBlock("latest");
      startTime = block.timestamp

      let lockinfo = await unLockerInst.allLockedPhx(accounts[1])
      console.log(lockinfo)

      let itemcount = parseInt(lockinfo[2].toString())
      assert.equal(itemcount,6)

      let disable = true;
      let msgData = unLockerInst.contract.methods.setUserStatus(accounts[1],disable).encodeABI();
      let hash = await createApplication(mulSigInst, accounts[9], unLockerInst.address, 0, msgData);

      let res = await testViolation("multiSig setUserPhxUnlockInfo: This tx is not aprroved", async function() {
        await unLockerInst.setUserStatus(accounts[1],disable, { from: accounts[9] });
      });
      assert.equal(res, false, "should return false")

      let index = await mulSigInst.getApplicationCount(hash)
      index = index.toNumber() - 1;
      console.log(index);

      await mulSigInst.signApplication(hash, index, { from: accounts[7] })
      await mulSigInst.signApplication(hash, index, { from: accounts[8] })

      res = await testViolation("multiSig setUserStatus: This tx is not aprroved", async function() {
        await unLockerInst.setUserStatus(accounts[1],disable, { from: accounts[9] });
      });
      assert.equal(res, true, "should return true")

    })

  it('try Get locked PHX after disabled', async function () {
    await time.increaseTo(initTime + 6 * ONE_MONTH + 100)
    let block = await web3.eth.getBlock("latest");
    let intervalNum = parseInt((block.timestamp - initTime) / ONE_MONTH)
    console.log("timestamp=" + block.timestamp, "startTime=" + initTime, "intervalNum=" + intervalNum);

    let claimable = web3.utils.fromWei(await unLockerInst.getClaimAbleBalance(accounts[1]))
    console.log(claimable.toString(10))
    assert.equal(claimable, 12);

    let beforePhxUser = web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));

    let res = await testViolation("multiSig setUserStatus: This tx is not aprroved", async function() {
      await unLockerInst.claimExpiredPhx({ from: accounts[1] });
    });
    assert.equal(res, false, "should return true")

    let afterPhxUser = web3.utils.fromWei(await PHXInst.balanceOf(accounts[1]));
    let diff = afterPhxUser - beforePhxUser;
    assert.equal(diff, 0);

  })

})