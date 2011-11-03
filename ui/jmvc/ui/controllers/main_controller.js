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
	animateTabSelection: true,
	
	/**
	 * General record UI handling
	 */
	hasRecords: function() {
		$('#app_selector_cover').remove();
	},
	noRecords: function() {
		$('#app_content_iframe').attr('src', 'about:blank').hide();
		$('#app_content').html('<div id="no_record_hint"><h2>{% trans "Start by creating a record for this account" %}</h2></div>').show();
		$('#app_selector').append('<div id="app_selector_cover"> </div>');
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
	}
},
/* @Prototype */
{
	/**
 	 * DOM ready, do DOM-specific setup
 	 */
	ready: function() {
	},
	
	'#add_record_tab click': function(el) {
		UI.Controllers.Record.createNewRecord(el);
	},
	
	
	/**
	 * Simple tab functionality
	 */
	'#app_selector li click': function(el, ev) {
		var selector = $('#app_selector');
		var selected = selector.find('li.selected');
		
		// deselect old tab and select new tab
		if (selected.is('*') && selected.attr('id') != el.attr('id')) {
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
			el.css('background-color', 'transparent').css('border-right-color', 'transparent');
			if (UI.Controllers.MainController.animateTabSelection) {
				selected.parent().parent().children().first().prepend(sel_clone);		// prepend to first <ul> to stack it behind all other tabs
				sel_clone.animate({
						   'top': el.position().top + 'px',
						'height': el.innerHeight() - 8 + 'px'
					},
					300,
					'swing',
					function() {
						var bgcolor = UI.Controllers.Record.activeRecord ? UI.Controllers.Record.activeRecord.bgcolor : 'rgb(250,250,250)';
						el.addClass('selected').css('background-color', bgcolor).css('border-right-color', '');
						$(this).remove();
					}
				);
				return;
			}
		}
		
		// set background color
		var bgcolor = UI.Controllers.Record.activeRecord ? UI.Controllers.Record.activeRecord.bgcolor : 'rgb(250,250,250)';
		el.addClass('selected').css('background-color', bgcolor);
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
