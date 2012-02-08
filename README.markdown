
Indivo UI Server
================
The Indivo UI Server is a reference implementation of an Indivo X UI app, which uses
the Indivo API to present users with an interface in which to login and run user apps.
For more information about the Indivo X Personally Controlled Health Record Platform,
see <http://indivohealth.org>, or the technical documentation at 
<http://docs.indivohealth.org>

Installation instructions for all of Indivo X are at <http://wiki.chip.org/indivo>

Licensing
---------
Copyright (C) 2012 Children's Hospital Boston. All rights reserved.

This program is free software: you can redistribute it and/or modify it under the terms
of the GNU Lesser General Public License as published by the Free Software Foundation, 
either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the GNU Lesser General Public License for more details.

A copy of the GNU Lesser General Public License is located in the LICENSE.txt file in this
repository, and at http://www.gnu.org/licenses/.


Dependencies
------------

  $ cat .gitmodules

and

  $ git-submodule
  
to see status and versions.

Depends on `indivo_client_py` to interface with the Indivo backend server.

Also depends on _parts_ of the javascriptMVC framework _but not the whole thing_!

We use: "`steal`", "`jquerymx`", and "`funcunit`".

    [submodule "ui/jmvc/steal"]
      path = ui/jmvc/steal
      url = http://github.com/jupiterjs/steal.git
    [submodule "ui/jmvc/funcunit"]
      path = ui/jmvc/funcunit
      url = http://github.com/jupiterjs/funcunit.git
    [submodule "ui/jmvc/jquery"]
        path = ui/jmvc/jquery
        url = http://github.com/jupiterjs/jquerymx.git


Installing Indivo UI Server
---------------------------

1. Copy settings.py.default to settings.py, and update a few key parameters

2. Set `SERVER_ROOT_DIR` to the complete path to the location where you've
installed `indivo_ui_server`, e.g. `/web/indivo_ui_server`

3. Set `INDIVO_SERVER_LOCATION`, `CONSUMER_KEY`, `CONSUMER_SECRET` appropriately to
match the Indivo Server's location and chrome credentials (check
`utils/indivo_data.xml` BEFORE you `syncdb` on the server end).

4. Set `SECRET_KEY` to a unique value, and don't share it with anybody



Included Apps
-------------

Allergies, labs, medications, problems are included and in various
states of usability. The Problems app can input data while the
others are read-only.


App Size Conventions (IMPORTANT!)
---------------------------------

If your app is aimed at the general web user population, your app should render
correctly in a <DIV> that is _maximum 768 pixels wide_!

Indivo UI assumes that the user's minimum browser size is 1024 pixels wide by
768 pixels high. Taking Indivo UI's interface elements into account, this leaves
768 pixels of width for your app content.

The safe assumption is that you app content has 768px of width, but no more

Many users will have screen resolutions that make this the maximum width of app
content they will be able to display. If your app exceeds 768 pixels wide by
default, majority of the general web user's browsers will side-scroll, which is
poor user experience and to be avoided. For users with higher resolution
screens, the Indivo UI will expand and provide your app with more pixels of
width that you can take advantage of using a "liquid" layout in your app, but a
wider screen cannot be assumed by default for the general web user population.

As for length, there are less strict criteria, since the length of the
app_content_pane will expand to fit longer content and we assume that users will
scroll vertically. Be aware that empirical browser size research shows that for
90% of users the bottom edge of their browser window is at approximately 500
pixels and for 80% of users the bottom edge is around 560 pixels. To provide a
good experience for your users it's important to keep key data and interface
elements "above the fold" e.g. above 500 to 560 pixels.


Production Javascript Compression
----------------------------------

Note: We don't include CSS in this process since we want to prevent delayed 
styling of our base shell. Also, in order to take advantage of the Django 
translation feature currently in the ui, you should not compress unless you 
only want a single language to be used. 

JMVC3 has the ability to automatically concatenate and compress the
multiple javascript files used by the UI into one highly cacheable
file dramatically reducing HTTP requests and page weight for a more
responsive user experience.

JMVC3 does this is by simulating a page fetch from a commandline
"browser" to execute the `steal.js` dependency management system.
By doing this all the required JS files will be loaded and loaded
in the correct order. This requires:

- A non-login protected page that loads the UI's entire set of JS files

First, you ui.js file **MUST** include all the plugins, resources,
models, and controllers that you want to compress including any
additional libraries you have added.

Next, edit the `/indivo_ui_server/templates/ui/base.html` file uncommenting this line:

    <script compress="true" type="text/javascript" src="/jmvc/steal/steal.js?ui,development"></script>

this will tell the steal.js script to load the entire set of
javascript files just like the UI server's main `index.html` file
does. We normally don't do this since we only need the jQuery and
underscore.js libraries on the login page.

Next, from the commandline, run: (Note: replace http://localhost with the location of your hosted UI)

    /indivo_ui_server/ui/jmvc/$ ./js steal/buildjs http://localhost -to ui

You will see output like the following:
	Building to ui/
	
	BUILDING STYLES --------------- 
	
	no styles
	
	
	BUILDING SCRIPTS --------------- 
	steal.compress - Using Google Closure app
	   ignoring steal/dev/dev.js
	   ui/ui.js
	   jquery/controller/controller.js
	   jquery/controller/view/view.js
	   jquery/controller/subscribe/subscribe.js
	   jquery/view/ejs/ejs.js
	   jquery/model/model.js
	   jquery/model/list/list.js
	   jquery/lang/observe/observe.js
	   jquery/lang/observe/delegate/delegate.js
	   jquery/class/class.js
	   jquery/lang/string/string.js
	   jquery/event/destroyed/destroyed.js
	   jquery/jquery.js
	   jquery/event/event.js
	   jquery/view/view.js
	   jquery/lang/openajax/openajax.js
	   jquery/lang/string/rsplit/rsplit.js
	   ui/resources/js/underscore-min.js
	   ui/resources/jquery-ui-1.8.16.custom/js/jquery-ui-1.8.16.custom.min.js
	   ui/models/account.js
	   ui/models/record.js
	   ui/models/pha.js
	   ui/models/message.js
	   ui/models/carenet.js
	   ui/models/carenetAccount.js
	   ui/models/notification.js
	   ui/controllers/main_controller.js
	   ui/controllers/record_controller.js
	   ui/controllers/healthfeed_controller.js
	   ui/controllers/message_controller.js
	   ui/controllers/carenet_controller.js
	   ui/controllers/pha_controller.js
	   ui/controllers/app_list_controller.js
	
	17283 MS
	SCRIPT BUNDLE > ui/production.js


You should see an updated `production.js` file. To use it:

1. Comment out the `<script>` tag in `base.html`                      
2. In `index.html` change the `steal.js` parameters from `"ui,development"` to `"ui,production"` in the `<script>` tag
3. Reload and enjoy the speed!


Helpful Docs
------------

JMVC main docs: <http://javascriptmvc.com/docs.html>

JMVC API: <http://javascriptmvc.com/docs.html#&who=api>

Cheatsheet: <http://s3.amazonaws.com/jupiter_images/resources/1/javascriptmvc_cheatsheet.pdf>


