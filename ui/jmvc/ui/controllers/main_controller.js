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
},
/* @Prototype */
{
	/**
 	 * DOM ready, do DOM-specific setup
 	 */
	ready: function() {
	},
	
	
	/**
	 * Simple tab functionality
	 */
	'#app_selector li click': function(el, ev) {
		$('#app_selector li').removeClass('selected');
		el.addClass('selected');
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
		var li = null;
		var pha = params.pha;
		var fire_p = params.fire_p;
		var img_name = pha.data.name.toLowerCase().replace(/ +/, '_')
		var icon = '<img class="app_tab_img" src="/jmvc/ui/resources/images/app_icons_32/'+img_name+'.png" />';
		pha.html_id = pha.id.replace(/\W+/g, '_');
		
		// app with a UI
		if (pha.data.ui) {
			var startURL = interpolate_url_template(pha.data.startURLTemplate, {
				'record_id' : params.carenet_id? "":RecordController.RECORD_ID,
				'document_id' : RecordController.DOCUMENT_ID || "",
				'carenet_id' : params.carenet_id || ""
			});
			
			li = $('<li/>', {'id': pha.html_id}).html(icon + pha.data.name).click(function(ev) {
				$('#app_content_iframe').attr('src', startURL);		// load and show the iframe
				$('#app_content').hide();
				$('#app_content_iframe').show();
			});
			$('#active_app_tabs').append(li);
		}
		
		// background app
		else {
			li = $('<li/>', {'id': pha.html_id}).html(icon + pha.data.name).click(function(ev) {
				$('#app_content').html($.View('//ui/views/main/background_app_info.ejs', {'pha': pha}))
				$('#app_content_iframe').attr('src', 'about:blank').hide();
				$('#app_content').show();
			});
			$('#background_app_tabs').show().append(li);
		}
		
		if (fire_p) {
			li.click();			// fire click event!!
		}
	},
	
	
	/**
	 * Used when switching records
	 *
	 * NOTE: doesn't actually remove an autorized app from a record!!
	 * FIXME: Refactor
	 */
	clear_apps: function() {
		$.each($('#active_app_tabs').children().slice(2), function(i, v) { $(v).remove(); })
	}
});
