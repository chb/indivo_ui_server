
// use seperate modules for login and main page checks so /login is not accessed before every test()
// global selenium config is in /ui/funcunit/settings.js, we should more it to the local settings.js eventually

// It looks like this is not needed anymore if envjs is called with a URL on the commandline now.
// e.g. $ funcunit/envjs http://localhost/jmvc/ui/test/funcunit/funcunit.html
//
// if (window.Envjs) { module("Login", { setup: function(){ S.open("//login"); } }) } // envjs + selenium
// else              { module("Login", { setup: function(){ S.open("/login"); } }) }  // in the browser

module("Login", { setup: function(){ S.open("/login"); } })

test('Login as benadida', function(){
  S('#username').type('benadida');
  S('#password').type('test');
  S('#submit').click();
});

// main page tests
module("Main", { setup : function(){} })

test('Page structure before data loading', function(){
  S('#app_content').exists(function(){
    // app content panes
    ok(S('#app_content').visible(), 'logged in and can see #app_content');
    ok(S('#app_content_frame').invisible(), '#app_content_iframe is hidden on login');
    ok(S('#app_content').text().search(/Healthfeed/), '#app_content is showing Healthfeed')

    // note to self: .search(/foo/) returns first index or -1 when not found
    ok(S('#header_fullname').text().search(/for .+/) > -1, 'fullname filled in the header')

    // app selector tests
    ok(S('#healthfeed_li').text().search(/Healthfeed/), 'Healthfeed in app selector');
    ok(S('#inbox_li').text().search(/Inbox/), 'Inbox in app selector');
    ok(S('#sharing_list').text().search(/Healthfeed/), 'Sharing in app selector');
    ok(S('#get_more_apps_list').text().search(/Inbox/), 'Get more apps in app selector');
  })
});

test('Page structure after data loading', function(){
  S.wait(2000); // let the data get loaded
  S('#app_content').exists(function(){
    // record tabs content
    ok(S('#record_tabs_inner').text().search(/Ben Adida/) > -1, 'record tabs text includes Ben Adida')
    ok(S('#record_tabs_inner').text().search(/Rita/) > -1,      'record tabs text includes Rita')
    ok(S('#record_tabs_inner').text().search(/Max/) > -1, 'record tabs text includes Max')
  })
});

test('Records', function(){
  S.wait(2000); // let the data get loaded
  S('#app_content').exists(function(){
    // record tabs content
    // ok(S('#record_tabs_inner li').text().search(/Ben Adida/) > -1, 'record tabs text includes Ben Adida')
  })
});

// test('records', function(){});
// test('app selector', function(){});
// test('healthfeed', function(){});
// test('messaging', function(){});
// test('sharing / carenets', function(){});
// test('adding apps', function(){});

test('logout', function(){
  S.wait(3000); // let the other tests run first
  S('#logout').click(function(){
    S('#username').exists(function(){
      ok(S('#username'), '#username exists');
      ok(S('#username').type('somebodyelse'), '#username is typeable');
    })
  })
});

