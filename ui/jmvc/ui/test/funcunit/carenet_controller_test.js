// this needs to be rewritten

// module("carenet",{
//  setup : function(){
//    // open the page
//    S.open("//ui/ui.html");
//    
//    //make sure there's at least one carenet on the page before running a test
//    S('.carenet').exists()
//  },
//  //a helper function that creates a carenet
//  create : function(){
//    S("[name=name]").type("Ice")
//      S("[name=description]").type("Cold Water")
//      S("[type=submit]").click()
//    S('.carenet:nth-child(2)').exists()
//  }
// })
// 
// test("carenets present", function(){
//  ok(S('.carenet').size() >= 1, "There is at least one carenet")
// })
// 
// test("create carenets", function(){
//     
//  this.create();
//  
//     S(function(){
//    ok(S('.carenet:nth-child(2) td:first').text().match(/Ice/), "Typed Ice");
//  })
// })
// 
// test("edit carenets", function(){
//     this.create();
//  
//  S('.carenet:nth-child(2) a.edit').click();
//     S(".carenet input[name=name]").type(" Water")
//     S(".carenet input[name=description]").type("\b\b\b\b\bTap Water")
//     S(".update").click()
//     S('.carenet:nth-child(2) .edit').exists(function(){
//    
//    ok( S('.carenet:nth-child(2) td:first').text().match(/Ice Water/), 
//      "Typed Ice Water");
//     
//    ok( S('.carenet:nth-child(2) td:nth-child(2)').text().match(/Cold Tap Water/), 
//      "Typed Cold Tap Water");
//  })
// 
// })
// 
// 
// test("destroy", function(){
//  this.create();
// 
//     S(".carenet:nth-child(2) .destroy").click();
//  
//  //makes the next confirmation return true
//     S.confirm(true);
//  
//  S('.carenet:nth-child(2)').missing(function(){
//    ok("destroyed");
//  })
//     
//  
// });