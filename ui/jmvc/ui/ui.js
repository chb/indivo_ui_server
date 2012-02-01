steal(
	'jquery/controller',
	'jquery/controller/view',
	'jquery/controller/subscribe',
	'jquery/view/ejs',
	'jquery/model',
	'jquery/model/list',
	'jquery/lang/observe',
	'jquery/lang/observe/delegate'
)
.then(
	//Base Model
	"./models/indivoBase"
)
.then(
	// Resources
	"./resources/js/bootstrap-alerts.js",
	"./resources/js/underscore-min.js",
	"./resources/js/jquery-ui-1.8.16.custom.min.js",
	"./resources/js/date.js",
	"./resources/js/utils.js",
	"./resources/css/bootstrap-custom.css",
	// Models
	'./models/account',
	'./models/record',
	'./models/pha',
	'./models/message',
	'./models/carenet',
	'./models/carenetAccount',
	'./models/notification',
	'./models/alert'
)
.then(
	// Controllers
	'./controllers/main_controller.js',
	'./controllers/record_controller.js',
	'./controllers/healthfeed_controller.js',
	'./controllers/message_controller.js',
	'./controllers/carenet_controller.js',
	'./controllers/pha_controller.js',
	'./controllers/app_list_controller.js',
	'./controllers/alert_controller.js',
	// Attach Controllers on document ready
	function($) {
		$(document).ready(function($) {
			UI.ENABLED_APPS = new UI.Models.PHA.List();  // TODO: Currently you can not listen to add/remove events on a List inside an $.Observe, so this is external for now
			UI.ALL_APPS = new UI.Models.PHA.List(); 	 // TODO: Currently you can not listen to add/remove events on a List inside an $.Observe, so this is external for now
			UI.ALERT_QUEUE = new UI.Models.Alert.List();
	
			// init alert controller with a queue to listen on
			$("body").ui_alert({alertQueue:UI.ALERT_QUEUE});
	
			/**
			 * ACCOUNT_ID comes in from django: we might want an extern here for Google Closure Complier
			 * http://code.google.com/closure/compiler/docs/api-tutorial3.html#externs
			 */
			// retrieve the logged in account
			UI.Models.Account.findOne(ACCOUNT_ID, function(account) {
				if (account && account.id) {
					// init controllers once Account is loaded
					$("body").ui_main({account:account, alertQueue:UI.ALERT_QUEUE});
					$("body").ui_record({account:account, alertQueue:UI.ALERT_QUEUE});
					$("#app_selector").ui_app_list({account:account, enabledApps:UI.ENABLED_APPS});
				}
				else {
					UI.ALERT_QUEUE.push(new UI.Models.Alert({text:"could not load account", level:"error"}));  //TODO: move to common messages file?
				}
			},
			function(error) {
				UI.ALERT_QUEUE.push(new UI.Models.Alert({text:"could not load account", level:"error"})); //TODO: move to common messages file?
			});
			
		});
	}
);