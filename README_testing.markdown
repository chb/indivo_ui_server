
Indivo UI Server Testing
=========================

Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
TODO: More tests, do qunit


# Funcunit #

- home: <http://funcunit.com/>
- docs: <http://funcunit.com/#&who=FuncUnit>


## Getting Started ##

Assuming your UI server in on localhost,

there are two main ways to run tests:

1. "Stand-alone" in a browser
2. automated, command line mode with envjs and selenium


## Running Tests in a Browser ##

**NOTE: to use Google Chrome for testing you must start it with the "--disable-web-security" argument**

Go to: <http://localhost/jmvc/ui/test/funcunit/funcunit.html> which:

- Reads the funcunit.html page loading the funcunit.js script in the same directory and default CSS
- The funcunit.js script loads the funcunit library via steal and defines the tests to be run which are
  scripts (foo_test.js) in this dir.


## A Test Script ##

See the code in main_controller_test.js for examples. One thing to
note is the different path to the "login" page based on if the test
is being run in the browser or via envjs+selenium. This is a hack
to get this to work. Feel free to fix it!

See the test syntax documentation: <http://funcunit.com/#&who=FuncUnit>

Note: This is just javascript so you can use the standard javascript debugger statement and firebug!

## Running Automated Tests on the Command Line ##

This will run the tests via envjs+selenium on the commandline:

    $ funcunit/envjs http://localhost/jmvc/ui/test/funcunit/funcunit.html
    
You should see output like (ignore the initial coudn't read settings warning):

    $ funcunit/envjs http://localhost/jmvc/ui/test/funcunit/funcunit.html


    STARTING *firefox
    MODULE Login

    --Login as benadida--
    steal.js INFO: Opening /login
    steal.js INFO: Typing benadida on #username
    steal.js INFO: Typing test on #password
    steal.js INFO: Clicking #submit
      done - fail 0, pass 0

    MODULE Main

    --Page structure before data loading--
      PASS logged in and can see #app_content
      PASS #app_content_iframe is hidden on login
    steal.js INFO: Getting text on #app_content
      PASS #app_content is showing Healthfeed
    steal.js INFO: Getting text on #header_fullname
      PASS fullname filled in the header
    steal.js INFO: Getting text on #healthfeed_li
      PASS Healthfeed in app selector
    steal.js INFO: Getting text on #inbox_li
      PASS Inbox in app selector
    steal.js INFO: Getting text on #sharing_list
      PASS Sharing in app selector
    steal.js INFO: Getting text on #get_more_apps_list
      PASS Get more apps in app selector
      done - fail 0, pass 8

    --Page structure after data loading--
    steal.js INFO: Waiting 2000
    steal.js INFO: Getting text on #record_tabs_inner
      PASS record tabs text includes Ben Adida
    steal.js INFO: Getting text on #record_tabs_inner
      PASS record tabs text includes Rita
    steal.js INFO: Getting text on #record_tabs_inner
      PASS record tabs text includes Max
      done - fail 0, pass 3

    --Records--
    steal.js INFO: Waiting 2000
      done - fail 0, pass 0

    --logout--
    steal.js INFO: Waiting 3000
    steal.js INFO: Clicking #logout
      PASS #username exists
      PASS #username is typeable
    steal.js INFO: Typing somebodyelse on #username
      done - fail 0, pass 2


    ALL DONE 0, 13



# QUnit #

QUnit is the jQuery unit testing framework. It's access in a
similar manner as funcunit above. Just go to <http://localhost/jmvc/ui/test/qunit/qunit.html>
which will load qunit and run the tests specified in qunit.js.








