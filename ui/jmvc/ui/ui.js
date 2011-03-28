// note: you probably don't need funcunit for the production.js file

steal
.plugins(
  'jquery/controller',
  'jquery/controller/view',
  'jquery/controller/subscribe',
  'jquery/view/ejs',
  'jquery/model',
  'jquery/dom/fixture'
//  'funcunit'
)
.resources(
  // don't add .js to file names
  // oh, and don't add jquery here... duh!
  "js/underscore-min",
  "jquery-ui-1.7.2/js/jquery-ui-1.7.2.custom.min",
  "js/jquery.tools.sans.tabs.min",
  "js/xml2json",
  "js/ObjTree",
  "js/utils"
)
.models(
  'account',
  'record',
  'pha',
  'message',
  'carenet'
)
.controllers(
  'main',
  'record',
  'healthfeed',
  'message',
  'carenet',
  'pha'
)

// todo:
//
// .css(
//   'resources/css/ui' 
// )
// Google Closure doesn't like ejs..
//
// .views(
//   'ui/views/carenet/show.ejs',
//   'ui/views/healthfeed/show.ejs',
//   'ui/views/main/background_app_info.ejs',
//   'ui/views/message/one_message.ejs',
//   'ui/views/message/show.ejs')
