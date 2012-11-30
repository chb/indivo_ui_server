/**
 * @class UI.Controllers.AppList
 *	
 * Displays a list of enabled apps for the active Record, and manages loading
 * the selected app.
 */

$.Controller.extend('UI.Controllers.AppList',
/* @Static */
{
	defaults: {
		selector: "li",				// selector for app selection 
		animateTabSelection: true
	}
},
/* @Prototype */
{
	init: function(params) {
		steal.dev.log("AppList Controller init");
		this.account = this.options.account;
		this.enabledApps = this.options.enabledApps;
		this.selector = this.options.selector;
		this.animateTabSelection = this.options.animateTabSelection;
		this.appMap = {};
		this.lastAppId = null;
		// start as locked
		this.lock();
	},
	
	/*
	 * Display an app when its selector is clicked.  
	 */
	"{selector} click": function(el, ev) {
		var appModel = el.model();
		var appId = el.attr("id");
		var controller = el.attr("data-controller");
		
		// animate tab to new selection TODO: do we want to revert on failure?
		this.selectTab(el);
		this.indicateNoAppLoading();
		
		// Clean up the previous running app
		$("#app_content").children().hide();
		if (this.lastAppId) {
			// if the click was on the previously running app, then refresh that app
			if (appId === this.lastAppId && this.appMap[appId]) {
				
				// if the previously selected tab was internal, clean up its div
				if (!appModel) {
					this.appMap[appId].remove();
				}
				
				// otherwise, let the app_manager handle it
				else {
                    managedAppInstance = APP_MANAGER.running_apps[appModel.MANAGER_uuid];
					APP_MANAGER.destroy_app_instance(managedAppInstance);
				}
				
				// and remove it from our app map
				delete this.appMap[appId];
			}
			
			// Otherwise, Background the previous running app
			else {
				var lastModel = $("#" + this.lastAppId).model();
				if ( lastModel ) {
                    managedAppInstance = APP_MANAGER.running_apps[lastModel.MANAGER_uuid];
					APP_MANAGER.notify_app(managedAppInstance, 'backgrounded', {});
				}
			}
		}
		
		// If the newly selected app is already running and has an associated model,
		// foreground it and show it		
		var appEl = this.appMap[appId];
		if ( appEl && appModel ) {
            managedAppInstance = APP_MANAGER.running_apps[appModel.MANAGER_uuid];
			APP_MANAGER.notify_app(managedAppInstance, 'foregrounded', {});
			appEl.show()
		}
		
		// If the newly selected app is already running and internal, just show it.
		else if (appEl) {
			appEl.show()
		}
		
		// If we are starting an app for the first time, and it has an associated model, set it up with the app manager
		else if (appModel) {
			var self = this;
			
			// show a loading image while we wait
			this.indicateAppLoading(el, true);
			
			var activeRecord = this.account.attr("activeRecord");
			var manifest = appModel.getManifest({
				'record_id': activeRecord.carenet_id ? '' : activeRecord.id,
				'carenet_id': activeRecord.carenet_id || ''
			});
			var context = this.getContext();
			var ret = APP_MANAGER.launch_app(manifest, context, {})
			ret.done(function(app_instance) {
				self.appMap[appId] = $(app_instance.iframe).load(function() {
					self.indicateAppLoading(el, false);
				});
				appModel.attr("MANAGER_uuid", app_instance.uuid);
			});
		}
		
		// If we are starting an app for the first time, and it is internal, just load the html under the #app_content div and show it.
		else {
			// show a loading image while we wait
			this.indicateAppLoading(el, true);
			
			var newHtml = $('<div></div>')["ui_" + controller]({
				account: this.account
			});
			this.appMap[appId] = newHtml.appendTo("#app_content").show();
			
			this.indicateAppLoading(el, false);
		}
		
		// set the newly active app as the latest active one
		this.lastAppId = appId;
	},
	
	/**
	 *	Show the spinner while an app is loading
	 */
	indicateAppLoading: function(app_el, is_loading) {
		var icon = app_el ? app_el.find('.app_tab_img') : null;
		if (icon) {
			
			// turn on
			if (is_loading) {
				icon.attr('data-iconsrc', icon.attr('src'));
				icon.attr('src', 'jmvc/ui/resources/images/spinner-24.gif');
			}
			
			// turn off
			else {
				var icon_src = icon.attr('data-iconsrc');
				if (icon_src) {
					icon.attr('src', icon_src);
				}
			}
		}
		else {
			steal.dev.log('App icon element not found');
		}
	},
	
	/**
	 *	Resets any loading spinner; useful when an app fails to load an the user clicks a different app.
	 */
	indicateNoAppLoading: function() {
		$('#app_selector').find('.app_tab_img').each(function(idx, elem) {
			var icon_src = $(elem).attr('data-iconsrc');
			if (icon_src) {
				$(elem).attr('src', icon_src);
			}
		});
	},
	
	
	/**
	 * Listen for new apps being added to enabledApps and renders a new selector
	 * for them
	 * 
	 * There are two kinds of app we have to deal with:
	 * 1. normal apps with UIs
	 * 2. other apps with no UI
	 *
	 * Both are added to the tabs panel, but in seperate sections.
	 *
	 * NOTE: Healthfeed, Inbox, "Get More Apps", and "Sharing" are not
	 * added using this method since they are not true apps.
	 *
	 * app with no ui go into a spot below the normal apps and above "sharing" and "get more apps"
	 *
	 * @codestart html
	 * <div id="background_apps_list" style="text-align: center; margin: 0px 0;">
	 *   <span style="color: #aaa; font-size: 0.85em">&bull;</span>
	 * </div>
	 * <div>this is a bg app</div>
	 * <div>this is another bg app</div>
	 * @codeend
	 */
	"{enabledApps} add": function(list, ev, newApps) {
		var activeRecord = this.account.attr("activeRecord");
		if (activeRecord) {
			$.each(newApps, function(i, app) {
				
				// app with a UI
				if (app.has_ui) {
					var startURL = app.getStartURL({
						'record_id': activeRecord.carenet_id ? '' : activeRecord.id,
						'carenet_id': activeRecord.carenet_id || ''
					});
					$('#active_app_tabs').append($.View("//ui/views/pha/app_tab", {
						isBackgroundApp: false,
						app: app,
						startURL: startURL
					}));
				}
				
				// background app
				else {
					$('#background_app_tabs').append($.View("//ui/views/pha/app_tab", {
						isBackgroundApp: true,
						app: app
					}));
				}
			});
		}
		this.updateAppSelectorVisibility();
	},
	
	/*
	 * Listen for apps being removed from enabledApps and removes them from the
	 * display
	 */
	"{enabledApps} remove": function( list, ev, removedApps ) {
		// notify apps
		self = this;
		removedApps.each(function(index, app){
			if (self.appMap[app.id]) {
				var managedAppInstance = APP_MANAGER.running_apps[app.MANAGER_uuid];
				APP_MANAGER.destroy_app_instance(managedAppInstance);
			}
		});
		// remove from display
		removedApps.elements(this.element).remove();
		this.updateAppSelectorVisibility();
	},
	
	/*
	 *	Shows and hides the app selector areas according to their content
	 */
	updateAppSelectorVisibility: function() {
		var ui_app_sel = $('#active_app_tabs');
		if (ui_app_sel.children().length > 0) {
			ui_app_sel.show();
		}
		else {
			ui_app_sel.hide();
		}
		
		var bg_app_sel = $('#background_app_tabs');
		if (bg_app_sel.children().length > 0) {
			bg_app_sel.show();
		}
		else {
			bg_app_sel.hide();
		}
	},
	
	/*
	 * Listens for changes to the account's active Record, and loads the enabled
	 * apps for the new active Record 
	 */
	"{account} updated.attr": function(account, ev, attr, newVal) {
		//TODO: JMVC 3.3 should merge $.Observable with $.Model, so we can listen for changes to a specific attribute
		// load record's apps
		if ( attr === "activeRecord" ) {
			if ( newVal ) {
				var record = newVal;

				// stop managing the old record's apps
				APP_MANAGER.record_context_changed();
				$.each(this.appMap, function(app_id, app_el) {
					if (!app_el.model()) {
						app_el.remove();
					}
				});
				this.appMap = {};

				// is this a carenet or a record? depending on which, init the appropriate apps
				if (record.carenet_id) {
					UI.Models.PHA.get_by_carenet(record.carenet_id, null, this.callback('set_enabled_apps'));
				} else {
					UI.Models.PHA.get_by_record(record.id, null, this.callback('set_enabled_apps'));
				}
			}
			
			// if we got no record, e.g. to show the new-record form
			else {
				this.selectTab(null);
				this.set_enabled_apps([]);
			}
		}
	},

	/*
	 * Set the current enabledApps List, clearing out the previous
	 * @param {UI.Model.PHA.List} apps List of apps to show as enabled
	 */
	set_enabled_apps: function(apps) {
		var enabledList = this.enabledApps,
			selected_id = $('#app_selector .selected').attr('id'),
			// remember selected app before clearing...
			removeList = enabledList.slice(0, enabledList.length);

		// clear out exising apps
		$.each(removeList, function(i, app) {
			enabledList.remove(app.id);
		});
		
		// add new ones...
		$.each(apps, function(index, value){
			enabledList.push(value);
		});
		
		// lock/unlock the app selector
		if (this.account.activeRecord) {
			this.unlock();
		}
		else {
			this.lock();
		}
		
		// TODO: is keeping track of previously selected app something we really want to do?
		// Yes, otherwise switching a record will always throw you to the healthfeed, which I think is not desireable (pp)
		// ...and try to re-select previous app, show record info otherwise
		if (this.account.activeRecord) {
			var old_app = $('#' + selected_id);
			if (old_app.is('*') && !this.account.activeRecord.isCarenet()) {
				old_app.click();
			}
			else {
				$('body').controllers('main')[0].displayDefaultPage();
			}
		}
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
	 * Simple App tab functionality
	 */
	selectTab: function(el) {
		var selector = this.element,
			selected = selector.find(this.selector + '.selected'),
			activeRecord = this.account.attr("activeRecord"),
			bgcolor = activeRecord ? activeRecord.bgcolor : 'rgb(250,250,250)';
		
		// deselect old tab and select new tab
		if (selected.is('*') && (!el || selected.attr('id') != el.attr('id'))) {
			var sel_clone = selected.clone(false).css({
				       'position': 'absolute',
				           'left': '10px',
				          'right': '-1px',
				            'top': selected.position().top + 'px',
				         'height': selected.innerHeight() - 8 + 'px',		/* 8 = 4px + 4px top and bottom padding. Would be better to get this from CSS or calculate it! */
				'-moz-box-shadow': 'none', '-webkit-box-shadow': 'none', 'box-shadow': 'none'
			}).empty();
			selected.removeClass('selected').css('background-color', '');
			
			// animate tab selection
			if (el) {
				el.css('background-color', 'transparent').css('border-right-color', 'transparent');
				if (this.animateTabSelection) {
					selected.parent().parent().children().first().prepend(sel_clone);		// prepend to first <ul> to stack it behind all other tabs
					sel_clone.animate({
							   'top': el.position().top + 'px',
							'height': el.innerHeight() - 8 + 'px'
						},
						300,
						'swing',
						function() {
							var bgcolor = activeRecord ? activeRecord.bgcolor : 'rgb(250,250,250)';
							el.addClass('selected').css('background-color', bgcolor).css('border-right-color', '');
							$(this).remove();
						}
					);
					return;
				}
			}
		}
		
		// set background color on newly selected tab
		if (el) {
			el.addClass('selected').css('background-color', bgcolor);
		}
	},

	getContext: function() {
		var activeRecord = this.account.attr("activeRecord");
		var context = {}
		context.user = {
			id: this.account.id,
			full_name: this.account.fullName
		};
		context.record = {
			id: activeRecord.carenet_id || activeRecord.id,
			full_name: activeRecord.label
		};
        if (activeRecord.carenet_id) {
            context.carenet = { id: activeRecord.carenet_id }
        }
		return context;
	},
	
	
	/**
	 *	Locks the app selector, and if it's completely empty hides it alltogether
	 */
	lock: function() {
		var num_apps = $('#app_selector ul li').length;
		if (num_apps < 1) {
			this.hideAppSelectionInterface();
		}
		else if (!$('#app_selector_cover').is('*')) {
			$('#record_owned_options').append('<div id="app_selector_cover"> </div>');
		}
	},
	
	/**
	 *	Unlocks/shows the app selector if there is anything to be shown
	 */
	unlock: function() {
		var num_apps = $('#app_selector ul li').length;
		if (num_apps > 0) {
			this.showAppSelectionInterface();
			$('#app_selector_cover').remove();
		}
		else {
			this.hideAppSelectionInterface();
		}
	},
	
	showAppSelectionInterface: function() {
		if (this.element.is(':hidden')) {
			this.element.show();
			$('#tabs').css('left', '17%');
			$('#app_container').css('left', '17%');
		}
	},
	
	hideAppSelectionInterface: function() {
		if (this.element.is(':visible')) {
			this.element.hide();
			$('#tabs').css('left', '15px');
			$('#app_container').css('left', '15px');
		}
	}
});
