{% load i18n %}
/**
 * @tag controllers, home
 * 
 * @author Pascal Pfiffner (pascal.pfiffner@childrens.harvard.edu)
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 * Provides the main entry point for the UI code. 
 *
 */

$.Controller.extend('UI.Controllers.MainController',
/* @Static */
{ 
	defaults: {
		messageCheck: true,
		messageCheckDelay: 10
	},
	
	/**
	 * General record UI handling
	 */
	lockAppSelector: function() {
		$('#app_selector').append('<div id="app_selector_cover"> </div>');
	},
	unlockAppSelector: function() {
		$('#app_selector_cover').remove();
	},
	showNoRecordsHint: function() {
		UI.Controllers.MainController.lockAppSelector();
		$('#app_content_iframe').attr('src', 'about:blank').hide();
		
		// this will also be shown if adding records has been disabled, but signing up from the site automatically creates the first record,
		// so this should not be a real issue. Better check here again, anyway.
		$('#app_content').html('<div id="no_record_hint"><h2>{% trans "Start by creating a record for this account" %}</h2></div>').show();
	},
	
	/**
	 * poof animation
	 */
	poofViews: [],
	poof: function(view) {				// view must already be absolutely positioned for now. Does NOT remove/detach 'view', only hide it
		if (view && 'object' == typeof view) {
			var must_start = (UI.Controllers.MainController.poofViews.length < 1);
			
			// insert
			var x = parseInt(view.css('left')) + (view.outerWidth(true) / 2) - 25;		// '.poof' is 50 pixels square
			var y = parseInt(view.css('top')) + (view.outerHeight(true) / 2) - 25;
			poof = $('<div/>').addClass('poof').css('left', x + 'px').css('top', y + 'px');
			view.hide().after(poof);
			UI.Controllers.MainController.poofViews.push(poof);
			
			// timeout for first step
			if (must_start) {
				setTimeout(UI.Controllers.MainController.poof, 50);
			}
		}
		else if (UI.Controllers.MainController.poofViews.length > 0) {
			var all_poofs = UI.Controllers.MainController.poofViews.slice(0);		// copy array
			for (var i = all_poofs.length; i > 0; i--) {				// iterate backwards as we're deleting items from the array by index
				var poof = all_poofs[i-1];
				var curr = poof.css('background-position');
				if (typeof curr != "undefined") {
					curr = curr.split(/\s+/);
					if (curr.length > 1) {
						var step = Math.floor(Math.abs(parseInt(curr[1]) / 50));
						if (step < 4) {
							poof.css('background-position', curr[0] + ' ' + ((step + 1) * -50) + 'px');
						}
						else {
							poof.fadeOut(25, function() { $(this).remove(); });
							UI.Controllers.MainController.poofViews.splice(i-1, 1);
						}
					}
				}
				else {
					// IE needs to use background-position-y
					curr = poof.css('background-position-y');
					if (curr === "top") {
						// interpret background-position-y of "top" as 0
						curr = 0;
					}
					if (typeof curr !== "undefined") {
						var step = Math.floor(Math.abs(parseInt(curr) / 50));
						if (step < 4) {
							poof.css('background-position-y', ((step + 1) * -50) + 'px');
						}
						else {
							poof.fadeOut(25, function() { $(this).remove(); });
							UI.Controllers.MainController.poofViews.splice(i-1, 1);
						}
					}
				}
			}
			
			// timeout for next step
			if (UI.Controllers.MainController.poofViews.length > 0) {
				setTimeout(UI.Controllers.MainController.poof, 50);
			}
		}
	},
	
	update_inbox_tab: function(messages, success, error) {
		var n_unread = _(messages).select(function(m) {
			if(!m.read_at)
				return m;
		}).length;
		// alter img src
		var img = $('#inbox_li img');
		if(n_unread > 0 && n_unread < 10) {
			img.attr('src', img.attr('src').match(/\/.*\//) + 'inbox_' + n_unread + '.png');
		} else if(n_unread >= 10) {
			img.attr('src', img.attr('src').match(/\/.*\//) + 'inbox_9_plus.png')
		} else {
			img.attr('src', img.attr('src').match(/\/.*\//) + 'inbox.png')
		}

		// alert link text
		var a = $('#inbox_li a');
		if(n_unread > 0) {
			a.text('Inbox (' + n_unread + ')')
		} else {
			a.text('Inbox')
		}

		a.prepend(img)
		if (success) {
			success();
		}
	}
},
/* @Prototype */
{
	init: function(){
		var self = this;
		this.account = this.options.account;
		this.messageCheck = this.options.messageCheck;
		this.messageCheckDelay = this.options.messageCheckDelay;
		this.alertQueue = this.options.alertQueue;
		
		$('body').ajaxComplete(function(e, xhr, settings) {
			if(xhr.status === 401) {
				// logout user if we receive any unauthorized responses
				window.location.href = '/logout';
			}
			else if(xhr.status === 500) {
				// TODO: remove once we make sure the rest of the code uses error handlers
				if (self.alertQueue.length < 5 ) {
					// don't flood the user with alerts
					self.alertQueue.push(new UI.Models.Alert({text:"Sorry, but something went wrong, Please try again later", level:"error"}));
				}
			}
		});

		// setup periodic new message check 
		(function inboxUpdater(){
			if(self.messageCheck) {
				self.account.get_inbox(function(messages) {
					self.Class.update_inbox_tab(messages, function() {
						setTimeout(inboxUpdater, self.messageCheckDelay * 1000);
					},
					function() {
						// increase message check delay if we experienced an error on the last try
						setTimeout(inboxUpdater, (self.messageCheckDelay + 30) * 1000);
					});
				});
			} else {
				setTimeout(inboxUpdater, self.messageCheckDelay * 1000);
			}
		})();
	}
});
