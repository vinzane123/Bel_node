var async = require('async');
var ByteBuffer = require("bytebuffer");
var crypto = require('crypto');
var util = require('util');
var ed = require('../utils/ed.js');
var TransactionTypes = require('../utils/transaction-types.js');
var Router = require('../utils/router.js');
var constants = require('../utils/constants.js');

var modules, library, self, private = {};


function Approve(){
  this.create = function(data,trs){
    trs.recipientId = null;
    trs.amount = 0;
    trs.countryCode = data.countryCode;

    trs.asset.approve = {
      sender:data.sender.address,
      amount: data.amount,
      receiver: data.recipientId
    };
    return trs;
  }

  this.calculateFee = function(trs,sender){
    return constants.fees.approve *constants.fixedPoint;
  }

  this.verify = function(trs,sender,cb){
    if(trs.recipientId){
      return setImmediate(cb, "Invalid recipient");
    }
    if(trs.amount != 0){
      return setImmediate(cb,"Invalid transaction amount");
    }
    if(!trs.asset || !trs.asset.approve){
      return cb("Invalid transaction asset")
    }
    if(trs.asset.approve.amount < 0){
      return setImmediate(cb,"Invalid approved amount");
    }

    modules.accounts.getAccount({
      address:trs.asset.approve.receiver
    }, function(err,address){
      if(err){
        return cb(err);
      }

      if(!address){
        return cb("Receiver's account not found");
      }

      cb(null,trs);
    });
  }

  this.process = function(trs,sender,cb){
    setImmediate(cb,null,trs);
  }

  this.getBytes = function(trs){
    var aprvl = trs.asset.approve;
    try{
      var buf = new Buffer([]);
      bb = new ByteBuffer(1, true);
      bb.writeInt(aprvl.amount);
      bb.writeString(aprvl.sender)
      bb.writeString(aprvl.receiver);
      bb.flip();255
      buf = Buffer.concat([buf,bb.toBuffer()])
      
    } catch(e){
      throw Error(e.toString());
    }
     return buf; 
  }

  this.apply = function(trs,block,sender,cb){
    // console.log("from_apply:"+trs.asset.approve.receiver,trs.countryCode)
    // // modules.accounts.setAccountAndGet(sender.address)
    // modules.accounts.setAccountAndGet({ address: trs.asset.approve.receiver, countryCode: trs.countryCode }, function (err, recipient) {
    //   if (err) {
    //     return cb(err);
    setImmediate(cb);
  }
  

  this.applyUnconfirmed = function(trs,sender,cb){
    // // setImmediate(cb)
    // modules.accounts.getAccount({address: trs.recipientId}, function(err, account) {
    //   if(!account) {
    //     var idKey = sender.address + ':' + trs.type
    //     if (library.oneoff.has(idKey)) {
    //       return setImmediate(cb, 'Double submit')
    //     }
    //     library.oneoff.set(idKey, true)
    //   }
      
    // });
    setImmediate(cb);
  }

  this.undo = function(trs,block,sender,cb){
    setImmediate(cb)
  }
  this.undoUnconfirmed = function(trs,sender,cb){
    setImmediate(cb)
  }

  this.objectNormalize = function(trs){
    // for(var i in trs.asset.approve){
    //   if(trs.asset.approve[i] === null || typeof trs.asset.approve[i] === 'undefined'){
    //     delete trs.asset.approve[i]
    //   }
    // }

    var report = library.scheme.validate(trs.asset.approve,{
      type:"object",
      properties:{
        amount:{
          type:"integer",
          minimun:1,
        },
        receiver:{
          type:"string",
          minLength:5
        },
        sender:{
          type:"string",
          minLength:5
        },
        senderPublicKey: {
          type: "string",
          format: "publicKey"
        }
      },
      required:["amount","receiver","sender"]
    });
    if(!report){
      throw Error("Failed to normalize approve transaction body: "+ library.scheme.getLastError().details[0].message);
    }

    return trs;
  }

  this.dbRead = function(raw){
    if(!raw.approve_receiver){
      return null;
    }else{
      var approve = {
        amount : raw.amount,
        receiver : raw.approve_receiver,
        sender : raw.t_senderId,
        senderPublicKey: raw.t_senderPublicKey,
      }
      return {approve:approve}
    }
  }

  this.dbSave = async function(trs,cb){
    var r = await new Promise((resolve,reject) => {
      library.dbLite.query("SELECT amount from approve where owner=$owner and spender=$spender",{
        owner :trs.senderId,
        spender :trs.asset.approve.receiver
        }, function(err,rows){
          if(err){
            reject(err)
          }
          resolve(rows.length)
        })

    })
    if(r === 0){
      library.dbLite.query("INSERT INTO approve(owner,spender,amount,transactionId,senderPublicKey) VALUES($owner,$spender,$amount,$transactionId,$senderPublicKey)",{
          owner:trs.senderId,
          spender:trs.asset.approve.receiver,
          amount:trs.asset.approve.amount,
          transactionId:trs.id,
          senderPublicKey: trs.senderPublicKey
    },cb)
    //added cb
  }
  else{
    library.dbLite.query("UPDATE approve SET amount =$amount,transactionId=$transactionId WHERE owner=$owner and spender=$spender",{
      owner:trs.senderId,
      spender:trs.asset.approve.receiver,
      amount:trs.asset.approve.amount,
      transactionId:trs.id
    },cb)
  }

  }

  this.ready = function(trs,sender){
    if(sender.multisignatures.length){
      if(!trs.signatures){
        return false;
      }
      return trs.signatures.length >= sender.multimin -1;
    } else {
      return true;
    }
  }
}

function TransferFrom() {
  this.create = function (data, trs) {
    trs.recipientId = data.recipientId;
    trs.amount = data.amount;
    trs.countryCode = data.countryCode;
    trs.asset.countryCode = data.countryCode

    trs.asset.transferfrom = {
      approver:data.approver,
      allowance:data.balance,
      s_pk:data.apk,
      sender:data.sender.address,
      receiver:data.recipientId,
      amount:data.amount,
      countryCode:data.countryCode
    }
    return trs;
  }

  this.calculateFee = function (trs, sender) {
    return library.base.block.calculateFee();
  }

  this.verify = function (trs, sender, cb) {
    /*if (!addressHelper.isAddress(trs.recipientId)) {
      return cb("Invalid recipient");
    }*/

    if (trs.amount <= 0) {
      return cb("Invalid transaction amount");
    }

    // if (trs.recipientId == sender.address) {
    //   return cb("Invalid recipientId, cannot be your self");
    // }

    if (!global.featureSwitch.enableMoreLockTypes) {
      var lastBlock = modules.blocks.getLastBlock()
      if (sender.lockHeight && lastBlock && lastBlock.height + 1 <= sender.lockHeight) {
        return cb('Account is locked')
      }
    }

    cb(null, trs);
  }

  this.process = function (trs, sender, cb) {
    setImmediate(cb, null, trs);
  }

  this.getBytes = function (trs) {
    var trnsfr = trs.asset.transferfrom;
    try{
      var buf = new Buffer([]);
      bb = new ByteBuffer(1,true);
      bb.writeInt(trnsfr.amount),
      bb.writeString(trnsfr.approver),
      bb.writeString(trnsfr.sender),
      bb.writeString(trnsfr.receiver);
      bb.flip();255
      buf = Buffer.concat([buf,bb.toBuffer()])
    }catch(e){
      throw Error(e.toString());
    }
    return buf;
  }

  this.apply = function (trs, block, sender, cb) {
    var recepientCountryCode = (trs.asset && trs.asset.countryCode)? trs.asset.countryCode: '';
    modules.accounts.setAccountAndGet({ address: trs.recipientId, countryCode: recepientCountryCode }, function (err, recipient) {
      if (err) {
        return cb(err);
      }

      modules.accounts.mergeAccountAndGet({
        address: trs.recipientId,
        balance: trs.amount,
        u_balance: trs.amount,
        blockId: block.id,
        round: modules.round.calc(block.height)
      }, function (err) {
        cb(err);
      });
    });
  }

  this.undo = function (trs, block, sender, cb) {
    var recepientCountryCode = (trs.asset && trs.asset.countryCode)? trs.asset.countryCode: '';    
    modules.accounts.setAccountAndGet({ address: trs.recipientId}, function (err, recipient) {    
      // , countryCode: recepientCountryCode
      if (err) {
        return cb(err);
      }

      modules.accounts.mergeAccountAndGet({
        address: trs.recipientId,
        balance: -trs.amount,
        u_balance: -trs.amount,
        blockId: block.id,
        round: modules.round.calc(block.height)
      }, function (err) {
        cb(err);
      });
    });
  }

  this.applyUnconfirmed = function (trs, sender, cb) {
    modules.accounts.getAccount({address: trs.recipientId}, function(err, account) {
      if(!account || account.status != 1) {
        var idKey = trs.recipientId + ':' + trs.type
        if (library.oneoff.has(idKey)) {
          return setImmediate(cb, 'Double submit')
        }
        library.oneoff.set(idKey, true)
      } 
      setImmediate(cb);
    });
  }

  this.undoUnconfirmed = function (trs, sender, cb) {
    var idKey = trs.recipientId + ':' + trs.type;
    library.oneoff.delete(idKey);
    setImmediate(cb);
  }

  this.objectNormalize = function (trs) {
    delete trs.blockId;

    var report = library.scheme.validate(trs.asset.transferfrom,{
      type:"object",
      properties:{
        amount:{
          type:"integer",
          minimun:1,
        },
        receiver:{
          type:"string",
          minLength:5
        },
        sender:{
          type:"string",
          minLength:5
        },
        approver: {
          type: "string",
          minLength: 5
        }
      },
      required:["amount","receiver","sender","approver"]
    });
    
    if(!report){
      throw Error("Failed to normalize approve transaction body: "+ library.scheme.getLastError().details[0].message);
    }
    return trs;
  }

  this.dbRead = function (raw) {
    if (!raw.cc_countryCode) {
			return null;
		} else {
			var countryCode = raw.cc_countryCode;
			return {countryCode: countryCode};
		}
    return null;
  }

  this.dbSave = function (trs, cb) {
    library.dbLite.query("INSERT INTO ac_countrycode(countryCode, transactionId) VALUES($countryCode, $transactionId)", {
      countryCode: trs.asset && trs.asset.countryCode? trs.asset.countryCode: '',
      transactionId: trs.id
    }, cb);
    //setImmediate(cb);
  }

  this.ready = function (trs, sender) {
    if (sender.multisignatures.length) {
      if (!trs.signatures) {
        return false;
      }

      return trs.signatures.length >= sender.multimin - 1;
    } else {
      return true;
    }
  }
}

//Constructor
function Approvals(cb,scope){
  library = scope,
  self = this,
  self.__private = private;
  

  library.base.transaction.attachAssetType(TransactionTypes.APPROVE, new Approve());
  library.base.transaction.attachAssetType(TransactionTypes.TRANSFERFROM, new TransferFrom());
  
  private.attachApi();

  setImmediate(cb,null,self);
}

Approvals.prototype.onBind = function (scope) {
  modules = scope;
}


private.attachApi = function(){
  var router = new Router();

  router.use(function (req, res, next) {
    if (modules) return next();
    res.status(500).send({ success: false, error: "Blockchain is loading" });
  });

  router.map(private, {
    "put /approve": "approve",
  });

  router.put('/', function(req,res,next){
    var body = req.body;
    req.sanitize(req.body,{
      type:"object",
      properties:{
        secret:{
          type:"string",
          minLength:10
        },
        publicKey:{
          type:"string",
          minLength:10
        },
        approver_address:{
          type:"string",
          minLength:1
        },
        receiver_address:{
          type:"string",
          minLength:1
        },
        amount:{
          type:"integer",
          minimum:1
        }
      },
      required:["secret","publicKey","approver_address","receiver_address","amount"]
    }, function(err){
      if(err){
        return next(err)
      }

      var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
      var keypair = ed.MakeKeypair(hash);

      if (body.publicKey) {
        if (keypair.publicKey.toString('hex') != body.publicKey) {
          return res.json({ success: false, error: "Invalid passphrase" });
        }
      }
      
      library.balancesSequence.add(async function(cb){
        var sender_account = await new Promise((resolve,reject) => {
          modules.accounts.getAccount({publicKey:keypair.publicKey.toString('hex')},function(err,account){
            library.logger.debug('=========================== after getAccount ==========================');
            if(err){
              reject(err)
            }
            else{
              resolve(account)
            }
          });
        });
        
        var check = await new Promise((resolve,reject) =>{
          library.dbLite.query("SELECT * FROM approve WHERE owner=$owner and spender=$spender and amount>$amount", {
            owner:body.approver_address,
            spender:sender_account.address,
            amount:body.amount
          }, function(err,rows){
            if(err){
              reject(err)
              res.json({success:false, messsage:"Data not found to be appropriate"})
            }
            else{
              console.log(rows)
              resolve(rows)
            }
          });
        });
        
        var approver_account = await new Promise((resolve,reject) => {
            modules.accounts.getAccount({address:body.approver_address}, function(err,account){
              library.logger.debug('=========================== after getAccount ==========================');
              if(err){
                reject(err)
              }
              else{
                resolve(account)
              }
            });
          });

        if(check.length>0){
          let dbamt = parseInt(check[0][2]);
          let ap_pk = body.publicKey
          try{
            var transaction = library.base.transaction.create({
              type:TransactionTypes.TRANSFERFROM,
              amount:body.amount,
              approver:body.approver_address,
              sender:approver_account,
              recipientId:body.receiver_address,
              keypair:keypair,
              balance:dbamt,
              apk:ap_pk,
              // requester:keypair,
              countryCode:"IN",
              recipientCountryCode:"IN"
            });
          } catch(e){
            return cb(e.toString());
          }
          modules.transactions.receiveTransactions([transaction],cb)
        }

       else{
         return cb("No data found");
          } 
      },function(err,transaction){
        if(err){
          return res.json({success:false,error:err.toString()})
        }
        else{
          library.dbLite.query("UPDATE approve SET amount =$amount WHERE owner=$owner and spender=$spender",{
            owner:transaction[0].asset.transferfrom.approver,
            spender:transaction[0].asset.transferfrom.sender,
            amount:transaction[0].asset.transferfrom.allowance-transaction[0].amount
          })
          res.json({success:true,transaction:transaction[0].id});
        }
      })
    })
  })


  //Allowance 
  router.post('/allowance', async function(req,res,next){
    req.sanitize(req.body,{
      type:"object",
      properties:{
        from:{
          type:"string",
          minLength:1
        },
        to:{
          type:"string",
          minLength:1
        }
      }, required:["from","to"]
    }, async function(err,report,body){
      if(err) return next(err)
      if(!report.isValid) return res.json({success:false, error:report.issues})
      var alwnce = await new Promise((resolve,rejct) =>{
        library.dbLite.query("SELECT amount FROM approve WHERE owner=$owner and spender=$spender",{
          owner:body.from,
          spender:body.to
        }, function(err,rows){
          if(err){
            reject(errr)
          }
          resolve(rows)
        })
      })
      var alwnc = parseInt(alwnce[0])
      return res.json({success:true,allowance:alwnc})
    })
  })


  library.network.app.use('/api/token', router);
  library.network.app.use(function (err, req, res, next) {
    if (!err) return next();
    library.logger.error(req.url, err.toString());
    res.status(500).send({success: false, error: err.toString()});
  });
}

//Approve
private.approve = function(req,cb){
    let body = req.body;
    library.scheme.validate(body,{
      type:"object",
      properties:{
        secret:{
          type:"string",
          maxLength:100
        },
        amount:{
          type:"integer",
          minimum:1,
          maximum:constants.totalAmount
        },
        publicKey:{
          type:"string",
          minLength:1,
          maxLength:64
        },
        to:{
            type:"string",
            maxLength:100
        },
        countryCode:{
          type:"string",
          minLength:2
        }
      },
      required:["secret","amount","to","countryCode","publicKey"]
    }, function(err){
      if(err){
        return cb(err[0].message);
      }

      var hash = crypto.createHash('sha256').update(body.secret,'utf8').digest()
      var keypair = ed.MakeKeypair(hash);

      console.log("publickey :"+keypair.publicKey.toString('hex'))

      if(body.publicKey){
        if(keypair.publicKey.toString('hex') != body.publicKey){
          return cb("Invalid passphrase")
        }
      }

      library.balancesSequence.add(function(cb){
        modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
          library.logger.debug('=========================== after getAccount ==========================');
          if (err) {
            return cb(err.toString());
          }
          if (!account) {
            return cb("Account not found");
          }
          if(account.countryCode != body.countryCode) {
            return cb("Account country code mismatched!");
          }
          if (account.secondSignature && !body.secondSecret) {
            return cb("Invalid second passphrase");
          }
          var secondKeypair = null;

          if (account.secondSignature) {
            var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
            secondKeypair = ed.MakeKeypair(secondHash);
          }

          try {
            var transaction = library.base.transaction.create({
              type: TransactionTypes.APPROVE,
              sender: account,
              keypair:keypair,
              amount:body.amount,
              recipientId:body.to,
              secondKeypair: secondKeypair,
              countryCode: body.countryCode  
            })
          } catch (e) {
            return cb(e.toString());
          }
          
          modules.transactions.receiveTransactions([transaction], cb);
        });
      }, function(err,transaction){
        if(err){
          return cb(err.toString());
        }
         cb(null,{transaction:transaction[0].id});
        });
      });
}


module.exports = Approvals;














