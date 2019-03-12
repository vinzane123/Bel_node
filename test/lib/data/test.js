// var DEBUG = require('debug')('accounts')
// var node = require("./../variables.js")

// // Account info for password "sebastian"
// // New account does not have publickey in db
// var Saccount = {
//     "address": "A3Umvpy4vt8kcbZFUhViFr3RyhZYVLDxhi",
//     "publicKey": "fbd20d4975e53916488791477dd38274c1b4ec23ad322a65adb171ec2ab6a0dc",
//     "password": "sebastian",
//     "name": "sebastian",
//     "balance": 0
// };

// function Address(secret,code) {

//     it("Using valid passphrase: " + Saccount.password + ". Should be ok", async function () {
//         var res = await node.openAccountAsync({ secret: Saccount.password })
//         DEBUG('open account response', res.body)
//         node.expect(res.body).to.have.property("success").to.be.true;
//         node.expect(res.body).to.have.property("account").that.is.an("object");
//         node.expect(res.body.account.address).to.equal(Saccount.address);
//         node.expect(res.body.account.publicKey).to.equal(Saccount.publicKey);
//         Saccount.balance = res.body.account.balance;
//     });

// }




function getOwner(secret,code){
if(!secret) return "Details not found"
var wallet =  new Promise((resolve, reject) => {
    request({
        method: 'POST',
        url: 'http://127.0.0.1:9305/api/accounts/open',
        body: JSON.stringify({
            secret: secret,
            countryCode: code
        }),
        function (error, response, body) {
            if(error) reject(error)
            resolve(JSON.parse(body));
        }
    }
        );
        return wallet.account.address;
});
}

var po = getOwner("cactus peasant return inside filter morning wasp floor museum nature iron can","IN")
