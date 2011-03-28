//
// TODO: just a start. Feel free to fill in!


module("Model: UI.Models.Account")

// test("findAll2", function(){
//  stop(2000);
//  UI.Models.Account.findAll({}, function(accounts){
//    start()
//    ok(accounts)
//         ok(accounts.length)
//         ok(accounts[0].name)
//         ok(accounts[0].description)
//  });
//  
// })

// ACCOUNT = new UI.Models.Account;
// ACCOUNT.load(ACCOUNT_ID, _ready);

test("create", function(){
  stop();
  debugger;
  var account = new UI.Models.Account;
  account.load('benadida@informedcohort.org', function(){})
  start();
  
  // .save(function(account){
    start();
    // debugger;
    ok(account);
    ok(account.id);
    equals(account.name,"dry cleaning")
    // account.destroy()
  // })
})
// test("update" , function(){
//  stop();
//  new UI.Models.Account({name: "cook dinner", description: "chicken"}).
//             save(function(account){
//              equals(account.description,"chicken");
//            account.update({description: "steak"},function(account){
//              start()
//              equals(account.description,"steak");
//              account.destroy();
//            })
//             })
// 
// });
// test("destroy", function(){
//  stop(2000);
//  new UI.Models.Account({name: "mow grass", description: "use riding mower"}).
//             destroy(function(account){
//              start();
//              ok( true ,"Destroy called" )
//             })
// })