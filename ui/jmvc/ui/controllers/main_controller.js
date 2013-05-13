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
		messageCheck: false,
		messageCheckDelay: 10
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
		
		// indicate unread count
		if (n_unread > 0) {
			var badge = $('#message_unread_count');
			if (!badge.is('*')) {
				badge = $('<div/>', {'id': 'message_unread_count'});
				$('#message').append(badge);
			}
			badge.text(n_unread);
		}
		
		// no unread messages
		else {
			$('#message_unread_count').fadeOut('fast', function() { $(this).remove(); });
		}
		
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

		function csrfSafeMethod(method) {
			// these HTTP methods do not require CSRF protection
			return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
		}

		$.ajaxSetup({
			crossDomain: false, // obviates need for sameOrigin test
			beforeSend: function(xhr, settings) {
				if (!csrfSafeMethod(settings.type)) {
					var csrftoken = $.cookie('csrftoken')
					xhr.setRequestHeader("X-CSRFToken", csrftoken);
				}
			}
		});

		$('body').ajaxComplete(function(e, xhr, settings) {
			if(xhr.status === 401) {
				// logout user if we receive any unauthorized responses
				window.location.href = '/logout';
			}
			else if(xhr.status === 500) {
				// TODO: remove once we make sure the rest of the code uses error handlers
				if (self.alertQueue.length < 5 ) {
					// don't flood the user with alerts
					//self.alertQueue.push(new UI.Models.Alert({text:"Sorry, but something went wrong, Please try again later", level:"error"}));
				}
			}
		});
		
		// start into healthfeed or inbox
		var launch_app = $('#healthfeed').is('*') ? $('#healthfeed') : $('#message');
		launch_app.click();
		
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
	},
	
	
	/**
	 *	Called by app_list_controller if it doesn't know what to do
	 */
	displayDefaultPage: function() {
		this.cleanAndShowAppDiv();
		var record_controller = $('body').controllers('record')[0];
		if (record_controller) {
			record_controller.showRecordInfo();
		}
	},
	
	
	/**
	 *	Shows the given controller in #app_content
	 *	@param {String} html An optional HTML string to display in #app_content
	 */
	cleanAndShowAppDiv: function(html) {
		var app_content = $('#app_content');
		this.clearControllers(app_content);
		app_content.html(html ? html : '').show();
		
		$('#app_content_iframe').unbind('load').attr('src', 'about:blank').hide();
	},
	
	/**
	 *	Updates the interface so that once the iFrame URL is loaded, the controller gets to display content on #app_content_iframe
	 */
	loadURLInAppIFrame: function(url) {
		this.cleanAndShowAppDiv("Loading...");			/// @todo show a nice loading screen
		$('#app_content_iframe').load(function() {
			$(this).show();
			$("#app_content").html('').hide();
		}).attr("src", url);
	},
	
	/*
	 * Clear out any previous Controllers that have been attached to given element
	 * @param {Object} el element to remove Controllers from
	 */
	clearControllers: function(el) {
		$.each($(el).controllers(), function(i, val) {
			val.destroy();
		});
	},
	
	
	/**
	 *	Tints the interface in a given color (e.g. the record's color)
	 */
	tintInterface: function(color) {
		var csscolor = $('#tabs a.selected').css('background-color');
		var bgcolor = color ? color : (csscolor ? csscolor : 'rgb(250,250,250)');
		
		$('#app_selector .selected, #app_container').animate({
			backgroundColor : bgcolor
		}, 400);
	},
	
	/**
	 *	Deselects main tabs
	 */
	deselectMainTabs: function() {
		$('#tabs a').removeClass('selected');
	},
	
	/**
	 *	Make main controller watch clicks onto Healthfeed and Inbox
	 */
	'.main_tab click': function(el, ev) {
		var record = $(el).model();
		
		// unload the record
		var record_controller = $('body').controllers('record')[0];
		if (record_controller) {
			record_controller.loadRecord(null);
		}
		else {
			steal.dev.warn('RecordController was not found on body', $('body').controllers());
		}
		
		// load correct controller
		this.cleanAndShowAppDiv();
		if ($('#app_content')['ui_' + el.attr('id')]) {
			$('#app_content')['ui_' + el.attr('id')]({account:this.account, alertQueue:this.alertQueue}).show();
		}
		else {
			steal.dev.warn("Error: There is no controller for " + el.attr('id'));
		}
		
		// update tab and set background color
		this.deselectMainTabs();
		el.addClass('selected');
		this.tintInterface();
	},
	
	
	/**
	 *	Show hint on how to add a record.
	 *	@todo Currently not being used as we start into Healthfeed. We could add a hint to the records tabbar if we have no records instead. [pp]
	 */
	showNoRecordsHint: function() {
		$("#app_selector").controller().lock();
		$('#app_content_iframe').attr('src', 'about:blank').hide();
		
		// this will also be shown if adding records has been disabled, but signing up from the site automatically creates the first record,
		// so this should not be a real issue. Better check here again, anyway.
		$('#app_content').html('<div id="no_record_hint"><h2>{% trans "Start by creating a record for this account" %}</h2></div>').show();
	}
});
