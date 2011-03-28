
Indivo UI Server
================

Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)  
Ben Adida (ben.adida@childrens.harvard.edu)


Installation instructions for all of Indivo X are at <http://wiki.chip.org/indivo>
All source code is licensed under GPLv3.


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

Note: this is for javascript only. Not CSS. See below.

JMVC3 has the ability to automatically concatenate and compress the
multiple javascript files used by the UI into one highly cacheable
file dramatically reducing HTTP requests and page weight for a more
responsive user experience.

JMVC3 does this is by simulating a page fetch from a commandline
"browser" to execute the `steal.js` dependency management system.
By doing this all the required JS files will be loaded and loaded
in the correct order. This requires:

- A non-login protected page that loads the UI's entire set of JS files
- Removal of any conflicting JS files. For instance, we don't want to compress
  jQuery into the same file twice.

First, you ui.js file **MUST** include all the plugins, resources,
models, and controllers that you want to compress including any
additional libraries you have added.

Next, edit the `/indivo_ui_server/templates/ui/login.html` file uncommenting this line:

    <script compress="true" type="text/javascript" src="/jmvc/steal/steal.js?ui,development"></script>

this will tell the steal.js script to load the entire set of
javascript files just like the UI server's main `index.html` file
does. We normally don't do this since we only need the jQuery and
underscore.js libraries on the login page.

Then, in `header.html` comment out the `<script>` tags to prevent multiple inclusions.

Next, from the commandline, run:

    /indivo_ui_server/ui/jmvc/$ ./js steal/buildjs http://localhost -to ui

You will see output like the following. You can safely ignore the
warnings and the output below "BUILDING STYLES" since we are not
using CSS compression:

    Building to ui/

    BUILDING SCRIPTS ---------------
    steal.compress - Using Google Closure app
       /jmvc/steal/steal.js
    tmp991925.js:1082: WARNING - Parse error. expected closing }
         * @param {optional:String} content_type optional content type
                           ^

    tmp991925.js:1082: WARNING - Parse error. expecting a variable name in a @param tag
         * @param {optional:String} content_type optional content type
                           ^

    0 error(s), 2 warning(s)
       ignoring /jmvc/steal/dev/dev.js
       /jmvc/ui/ui.js
       /jmvc/jquery/controller/controller.js
       /jmvc/jquery/class/class.js
       /jmvc/jquery/jquery.js
       /jmvc/jquery/lang/lang.js
       /jmvc/jquery/event/destroyed/destroyed.js
       /jmvc/jquery/event/event.js
       /jmvc/jquery/controller/view/view.js
       /jmvc/jquery/view/view.js
       /jmvc/jquery/controller/subscribe/subscribe.js
       /jmvc/jquery/lang/openajax/openajax.js
       /jmvc/jquery/view/ejs/ejs.js
       /jmvc/jquery/lang/rsplit/rsplit.js
       /jmvc/jquery/model/model.js
       /jmvc/jquery/dom/fixture/fixture.js
       /jmvc/jquery/dom/dom.js
       /jmvc/ui/resources/js/underscore-min.js
       /jmvc/ui/resources/jquery-ui-1.7.2/js/jquery-ui-1.7.2.custom.min.js
       /jmvc/ui/resources/js/jquery.tools.sans.tabs.min.js
       /jmvc/ui/resources/js/xml2json.js
       /jmvc/ui/resources/js/ObjTree.js
       /jmvc/ui/resources/js/utils.js
       /jmvc/ui/models/account.js
       /jmvc/ui/models/record.js
       /jmvc/ui/models/pha.js
       /jmvc/ui/models/message.js
       /jmvc/ui/models/carenet.js
       /jmvc/ui/controllers/main_controller.js
       /jmvc/ui/controllers/record_controller.js
       /jmvc/ui/controllers/healthfeed_controller.js
       /jmvc/ui/controllers/message_controller.js
       /jmvc/ui/controllers/carenet_controller.js
       /jmvc/ui/controllers/pha_controller.js

    SCRIPT BUNDLE > ui/production.js

    BUILDING STYLES --------------- 
    text/css
    /jmvc/ui/resources/css/ui.css
    js: "steal/rhino/file.js", line 104: uncaught JavaScript runtime exception: ReferenceError: "File" is not defined.
      at steal/rhino/file.js:104
      at steal/build/styles/styles.js:22
      at steal/build/build.js:280
      at steal/build/styles/styles.js:16
      at steal/build/build.js:121
      at steal/buildjs:16
      at steal/rhino/steal.js:26
      at steal/buildjs:2

You should see an updated `production.js` file. To use it:

1. Comment out the `<script>` tag in `login.html`                      

2. Uncomment the `<script>` tags in `header.html`
3. In `index.html` change the `steal.js` parameters from `"ui,development"` to `"ui,production"` in the `<script>` tag
4. Reload and enjoy the speed!


Helpful Docs
------------

JMVC main docs: <http://javascriptmvc.com/docs.html>

JMVC API: <http://javascriptmvc.com/docs.html#&who=api>

Cheatsheet: <http://s3.amazonaws.com/jupiter_images/resources/1/javascriptmvc_cheatsheet.pdf>


