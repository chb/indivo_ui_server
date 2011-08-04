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
	animateTabSelection: true
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
		var selector = $('#app_selector');
		var selected = selector.find('li.selected');
		
		// deselect old tab and select new tab
		if (selected.is('*') && selected.attr('id') != el.attr('id')) {
			var clone = selected.clone(false).css({
				'position': 'absolute',
				    'left': '10px',
				   'right': '-1px',
				     'top': selected.position().top + 'px',
				  'height': selected.innerHeight() - 8 + 'px'		/* 8 = 4px + 4px top and bottom padding. Would be better to get this from CSS or calculate it! */
			}).text('');
			selected.removeClass('selected').css('background-color', '');
			
			// animate tab selection
			if (UI.Controllers.MainController.animateTabSelection) {
				selected.before(clone);
				clone.animate({'top': el.position().top + 'px'}, 300, 'swing', function() {
					el.addClass('selected').css('background-color', UI.Controllers.Record.activeRecord.bgcolor);
					$(this).remove();
				});
				return;
			}
		}
		
		el.addClass('selected').css('background-color', UI.Controllers.Record.activeRecord.bgcolor);
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
				  'record_id': params.carenet_id ? '' : UI.Controllers.Record.activeRecord.record_id,
			/*	'document_id': RecordController.DOCUMENT_ID || '',	*/		// what's the replacement for this? It is nowhere being set...
				 'carenet_id': params.carenet_id || ''
			});
			
			li = $('<li/>', {'id': pha.html_id}).html(icon + pha.data.name).click(function(ev) {
				$('#app_content_iframe').attr('src', startURL).show();		// load and show the iframe
				$('#app_content').empty().hide();
			});
			$('#active_app_tabs').append(li);
		}
		
		// background app
		else {
			li = $('<li/>', {'id': pha.html_id}).html(icon + pha.data.name).click(function(ev) {
				$('#app_content').html($.View('//ui/views/main/background_app_info.ejs', {'pha': pha})).show();
				$('#app_content_iframe').attr('src', 'about:blank').hide();
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
		$('#active_app_tabs').children().slice(2).remove();
	}
});
