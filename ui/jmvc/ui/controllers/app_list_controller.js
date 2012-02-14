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
	},
	
	/*
	 * Display an app when its selector is clicked.  
	 */
	"{selector} click": function(el, ev) {
		var type = el.attr("data-appType"),
			controller = el.attr("data-controller");
		
		// animate tab to new selection TODO: do we want to revert on failure?
		this.selectTab(el);
		
		switch (type) {
			case "internal":
				// clear out old controllers and attach new one
				this.clearControllers($('#app_content'));
				$("#app_content").html("")["ui_" + controller]({account:this.account}).show();
				$('#app_content_iframe').hide();
				break;
			case "external": 
				var url = el.attr("data-url");
				$("#app_content").html("Loading...").show();			/// @todo show a nice loading screen
				$('#app_content_iframe').hide().attr("src", url).load(function(){
					$(this).show();
					$("#app_content").hide();
				});
				break;
			case "background":
				alert("background not supported yet");
				break;
			default:
				alert("app type of " + type + " not supported")
				break;
		}
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
				if (app.ui) {
					var startURL = app.getStartURL({
						'record_id': activeRecord.carenet_id ? '' : activeRecord.id,
						'carenet_id': activeRecord.carenet_id || ''
					});
					$('#active_app_tabs').append($.View("//ui/views/pha/app_tab", {isBackgroundApp:false, app:app, startURL:startURL}));
				}
		
				// background app
				else {
					$('#background_app_tabs').append($.View("//ui/views/pha/app_tab", {isBackgroundApp:true, app:app}));
				}
			});
		}
	},
	
	/*
	 * Listen for apps being removed from enabledApps and removes them from the
	 * display
	 */
	"{enabledApps} remove": function(list, ev, removedApps) {
		removedApps.elements(this.element).remove();
	},
	
	/*
	 * Listens for changes to the account's active Record, and loads the enabled
	 * apps for the new active Record 
	 */
	"{account} updated.attr": function(account, ev, attr, newVal) {
		//TODO: JMVC 3.3 should merge $.Observable with $.Model, so we can listen for changes to a specific attribute
		// load record's apps
		if (attr === "activeRecord") {
			if (newVal) {
				UI.Controllers.MainController.unlockAppSelector();
				var record = newVal;
				// is this a carenet or a record? depending on which, init the appropriate apps
				if (record.carenet_id) {
					UI.Models.PHA.get_by_carenet(record.carenet_id, null, this.callback('set_enabled_apps'));
				} else {
					UI.Models.PHA.get_by_record(record.id, null, this.callback('set_enabled_apps'));
				}
			}
			
			// if we got no record, e.g. to show the new-record form
			else {
				UI.Controllers.MainController.lockAppSelector();
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
			selected_id = $('#app_selector .selected').attr('id'), // remember selected app before clearing...
			removeList = enabledList.slice(0, enabledList.length); 
			
		// clear out exising apps	
		$.each(removeList, function(i, app) { 
			enabledList.remove(app.id);
		});
		
		// add new ones...
		$.each(apps, function(index, value){
			enabledList.push(value);
		});
		
		// TODO: is keeping track of previously selected app something we really want to do?
		// Yes, otherwise switching a record will always throw you to the healthfeed, which I think is not desireable (pp)
		// ...and try to re-select previous app, show healthfeed otherwise
		if (this.account.activeRecord) {
			var old_app = $('#' + selected_id);
			if (old_app.is('*')) {
				old_app.click();
			}
			else {
				$('#healthfeed_li').click();
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
	 * Simple tab functionality
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
	}
});
