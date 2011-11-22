/**
 * @tag controllers, home
 * 
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 * Displays healthfeed
 *
 */
$.Controller.extend('UI.Controllers.Healthfeed',
/* @Static */
{
},
/* @Prototype */
{
	init: function() {
		steal.dev.log(this.Class.fullName + " init");
		this.account = this.options.account;
		var self = this;
		this.account.get_healthfeed(function(notifications) {
			self.element.html($.View('//ui/views/healthfeed/show.ejs',{'notifications': notifications}));
		});
	}
});
