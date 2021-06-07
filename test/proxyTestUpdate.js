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
    return false;
  }
}

contract('PhxAllocTest', function (accounts) {
    let phxAmount = "6000000000000000000";
    let PHXInst;
    let unLockerInst;
    let initTime;
    let unLockerAbiInst;
    let unLockerProxyInst;

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

      tx = await PHXInst.mint(unLockerInst.address,new BN(phxAmount).mul(new BN(3)));
      assert.equal(tx.receipt.status,true);

    });

  it('updated proxy logic', async function () {
    newUnLockerInst = await TokenUnlocker.new(PHXInst.address,mulSigInst.address);
    console.log("new unlocker address:" + newUnLockerInst.address);

    let res = await testViolation("update proxy setUserPhxUnlockInfo: This tx is not aprroved",async function(){
      await unLockerProxyInst.setLogicContract(newUnLockerInst.address);
    });
    assert.equal(res,false,"should return false")

    let msgData = unLockerProxyInst.contract.methods.setLogicContract(newUnLockerInst.address).encodeABI();
    let hash = await createApplication(mulSigInst,accounts[9],unLockerProxyInst.address,0,msgData);
    let index = await mulSigInst.getApplicationCount(hash)
    index = index.toNumber()-1;
    console.log(index);

    await mulSigInst.signApplication(hash,index,{from:accounts[7]})
    await mulSigInst.signApplication(hash,index,{from:accounts[8]})

    res = await testViolation("update proxy setUserPhxUnlockInfo: This tx is not aprroved",async function(){
      await unLockerProxyInst.setLogicContract(newUnLockerInst.address,{from:accounts[9]});
    });
    assert.equal(res,true,"should return true")

    let newAddress = await unLockerProxyInst.logic_contract();
    assert.equal(newAddress,newUnLockerInst.address);
  })

})