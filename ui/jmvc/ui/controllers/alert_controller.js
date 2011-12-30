/**
 * Displays Alerts from an Alert.List, treating it like a queue.  
 */

$.Controller.extend('UI.Controllers.Alert',
/* @Static */
{ 
	defaults: {
		alertContainerID: "alerts",                // div to add the Alerts to
		alertQueue: new UI.Models.Alert.List(),    // Alert.List to read Alerts from
		currentAlert: new UI.Models.Alert.List(),  // Alert.List to keep track of currently displayed Alerts 
		maxAlertsToShow: 1                         // Maximum number of Alerts to display at one time
	}
},
/* @Prototype */
{
	init: function(){
		this.alertContainerID = this.options.alertContainerID;
		this.currentAlert =this.options.currentAlert;
		this.alertQueue = this.options.alertQueue;
		this.maxAlertsToShow = this.options.maxAlertsToShow;		
	},
	
	/**
	 * Handle User closing an alert
	 */
	".alert-message .close click": function(el, ev) {
		var self = this;
		setTimeout(function() {
			self.currentAlert.remove(el.attr("data-alert-id"));
		}, 500)
	},

	"{alertQueue} add": function(list, ev, newAlerts) {
		if (this.currentAlert.length < this.maxAlertsToShow) {
			// display next alert if there is not one currently showing
			this.currentAlert.push(this.alertQueue.shift());
		}
	},
	
	"{currentAlert} remove": function(list, ev, removedAlerts) {
		if (this.alertQueue.length > 0) {
			// display the next alert
			this.currentAlert.push(this.alertQueue.shift());
		}
	},
	
	"{currentAlert} add": function(list, ev, newAlerts) {
		// render the new alert
		this.alert(newAlerts[0]);
	},
	
	/*
	 * Show a simple alert to the user
	 * @parm {Object} text The alert to display
	 */
	alert: function(alert) {
		$('#' + this.alertContainerID).append($.View("//ui/views/main/alert", {alert:alert}));
	}
});