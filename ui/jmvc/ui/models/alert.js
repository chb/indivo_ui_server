/**
 * Alerts consist of the following:
 * text: The message to display to the user
 * lvel: The level to use for the alert styling. One of "error", "warning", "info", or "success"
 */
$.Model.extend('UI.Models.Alert',
/* @Static */
{
},
/* @Prototype */
{
	setup: function(attributes) {
		this.attr("id", UI.UTILS.generateID());
		this._super(attributes);
	},
	
	getLevel: function() {
		// default to info level styling if no level is specified
		return this.level || "info";
	}
})