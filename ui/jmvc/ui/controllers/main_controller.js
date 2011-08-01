{% load i18n %}
/**
 * @tag controllers, home
 * 
 * @author Pascal Pfiffner (pascal.pfiffner@childrens.harvard.edu)
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 * Provides the main entry point for the UI code. Inits the "app tabs", and the "get more apps" overlay.
 *
 * Since this is a Document Controller it is automatically instanced for us (and delegated to the documentElement)
 * and since it's also the "main" controller its events are not prepended with #controllername
 *
 */

$.Controller.extend('UI.Controllers.MainController',
/* @Static */
{ 
	onDocument: true,
	
	
	/**
 	* Removes app from the app tabs
 	* NOTE: doesn't actually remove an autorized app from a record! See PHA controller for that.
 	*/
	_remove_app: function(id) {
		var href_to_find = '#'+id.replace(/@/, '_at_').replace(/\./g,'_');
		var parent_tab_div = $(href_to_find).parent();

		// we're relying on the fact that jquery selectors return arrays of nodes in DOM order
		// and that jquery ui uses a 0-based index to manipulate tab elements
		var list_of_div_ids = _( $(parent_tab_div).children('div')).map(function(div){ return '#'+div.id; })
		var index = _(list_of_div_ids).indexOf(href_to_find);
		if (index < 0) { return; } // todo: report bug
		else { $(parent_tab_div).tabs('remove', index + 2); } // +2 is needed here to skip Healthfeed and Inbox
	}
},
/* @Prototype */
{
	/**
 	* DOM ready, do DOM-specific setup
 	*/
	ready: function() {
		// init the "app tabs" and the "background app tabs"
		$("#active_app_tabs").tabs({'selected': 0});
		$("#background_app_tabs").tabs({'selected': 0});
		// init "app add overlay"
		this._init_get_more_apps_overlay();
	},

	_init_get_more_apps_overlay: function(){
		var _this = this;
		console.log(1);
		// we configure and set up the onBeforeLoad callback for the overlay here
		$("a#get_more_apps").overlay({
			expose: {color: "#fff", opacity: 0.7, loadSpeed: 2000},
			onBeforeLoad: function(){
				// function to run to get the available app data before the overlay is shown
				var wrap = this.getContent().find("div.wrap");
				$('.wrap').empty().html('<h2>{% trans "Available Apps" %}</h2><br/>');
				console.log(2);
				UI.Models.PHA.get_all(function(phas) {
 					UI.Models.PHA.get_by_record(RecordController.RECORD_ID, null, function(record_phas) {
						$.each(phas, function(i,v) {
							console.log(pha);
							var pha = phas[i];
							var record_pha_ids = $.map(record_phas, function(e){ return e.id; });
							
							// check that this record doesn't already have this app and it has a ui
							if ($.inArray(pha.id, record_pha_ids) > -1 || pha.data.ui === false) { return true; }
							
							// Create a <div> for each pha, with maybe an image
							// todo: be dry! see _add_app below!
							var img_name = pha.data.name.toLowerCase().replace(/ +/, '_')
							var line = '<img class="app_tab_img" src="/jmvc/ui/resources/images/app_icons_32/'+img_name+'.png" />';
							line += '<a>'+pha.data.name;
							if (pha.data.description && pha.data.description != "None") line += '&nbsp;&ndash;&nbsp;<i>'+pha.data.description+'</i>';
							line += '</a>'
							var e = $('<div class="pha">').attr('id', pha.id).html(line);
							
							// Attach click handlers to each
							e.click(function(e){
								$("a#get_more_apps").overlay().close();
								_this.add_app({'pha': pha, 'fire_p': true});
							})
							
							$('.wrap').append(e);
						}) // each
					});
				}); // get_all
				wrap.load();
			} // onBeforeLoad
		});
	},
	
	
	/**
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
	add_app: function(params) {
		var pha = params.pha;
		var fire_p = params.fire_p;
		var img_name = pha.data.name.toLowerCase().replace(/ +/, '_')
		var icon = '<img class="app_tab_img" src="/jmvc/ui/resources/images/app_icons_32/'+img_name+'.png" />';
		
		if (pha.data.ui) {
			$('#active_app_tabs').tabs('add', '#'+pha.id.replace(/@/, '_at_').replace(/\./g,'_'), icon + pha.data.name);
			var startURL = interpolate_url_template(pha.data.startURLTemplate, {
				'record_id' : params.carenet_id? "":RecordController.RECORD_ID,
				'document_id' : RecordController.DOCUMENT_ID || "",
				'carenet_id' : params.carenet_id || ""
			});
			
			var click_handler = function(){
				$('#app_content_iframe').attr('src', startURL); // load and show the iframe
				$('#app_content').hide();
				$('#app_content_iframe').show();
			};
			
			$('#active_app_tabs_inner li:last a').click(click_handler);
		}
		else {
			// unhide the seperator and the background_app_tabs
			$('#background_app_tabs, #app_tabs_seperator').show();
			$('#background_app_tabs').tabs('add', '#'+pha.id.replace(/@/, '_at_').replace(/\./g,'_')	, pha.data.name);
			$('#background_app_tabs_inner li:last a').prepend(icon);
			$('#background_app_tabs_inner li:last a').click(function() { 		// add the click handler
				$('#app_content').html($.View('//ui/views/main/background_app_info.ejs', {'pha': pha}))
				$('#app_content_iframe').hide();
				$('#app_content').show();
			});
		}
		
		if (fire_p) $('#active_app_tabs_inner li:last a').click(); // fire click event!!
	},
	
	
	/**
	 * Used when switching records
	 *
	 * NOTE: doesn't actually remove an autorized app from a record!!
	 * FIXME: Refactor
	 */
	clear_apps: function() {
		$.each($('#active_app_tabs_inner').children().slice(2), function(i, v){ $(v).remove(); })
	}
});