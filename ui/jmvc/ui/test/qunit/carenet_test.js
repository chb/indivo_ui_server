// fixme scaffolded

// module("Model: UI.Models.Carenet")
// 
// test("findAll", function(){
//  stop(2000);
//  UI.Models.Carenet.findAll({}, function(carenets){
//    start()
//    ok(carenets)
//         ok(carenets.length)
//         ok(carenets[0].name)
//         ok(carenets[0].description)
//  });
//  
// })
// 
// test("create", function(){
//  stop(2000);
//  new UI.Models.Carenet({name: "dry cleaning", description: "take to street corner"}).save(function(carenet){
//    start();
//    ok(carenet);
//         ok(carenet.id);
//         equals(carenet.name,"dry cleaning")
//         carenet.destroy()
//  })
// })
// test("update" , function(){
//  stop();
//  new UI.Models.Carenet({name: "cook dinner", description: "chicken"}).
//             save(function(carenet){
//              equals(carenet.description,"chicken");
//            carenet.update({description: "steak"},function(carenet){
//              start()
//              equals(carenet.description,"steak");
//              carenet.destroy();
//            })
//             })
// 
// });
// test("destroy", function(){
//  stop(2000);
//  new UI.Models.Carenet({name: "mow grass", description: "use riding mower"}).
//             destroy(function(carenet){
//              start();
//              ok( true ,"Destroy called" )
//             })
// })