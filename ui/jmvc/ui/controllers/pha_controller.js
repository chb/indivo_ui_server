{% load i18n %}
/**
 * 
@tag controllers, home
 *
 * PHA settings controller. Can remove a pha here and later set preferences, view logs, etc
 *
 *
 *
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 * WARNING: carenet stuff broken and incomplete!!!
 *
 *
 *
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 */
$.Controller.extend('UI.Controllers.PHA',
/* @Static */
{
	onDocument: true,
},
/* @Prototype */
{
	record_info: {},
	record: {},
	all_apps: [],
	my_apps: [],
	carenets: [],
	
    ready: function() {
    	
    },
    
    
	/**
	 * Click on our tab item
	 */
    'click': function() {
    	this.load()
    },
    
    
    /**
	 * Chainload record info and information about the apps
	 */
	load: function() {
		if (RecordController) {
			this.record_info = RecordController.RECORDS[RecordController.RECORD_ID]; 		// get the record info from the globals (FIXME later)
			UI.Models.Record.get(RecordController.RECORD_ID, this.record_info.carenet_id, this.callback('didLoadInfo'));
		}
	},
	
	didLoadInfo: function(record) {				// loaded info, get all apps
		this.record = record;
		//alert($('#app_content').find(':droppable').length);
		$('#app_content').html(this.view('show'));
		$('#app_content_iframe').hide();
		$('#app_content').show();
		
		UI.Models.PHA.get_all(this.callback('didGetAllApps'));
	},
	
	didGetAllApps: function(all_apps) {			// got all apps, get my apps
		this.all_apps = all_apps;
		
		// is this a carenet or a record? depending on which get the associated apps
		if (this.record_info.carenet_id) {
			UI.Models.PHA.get_by_carenet(this.record_info.carenet_id, null, this.callback('didGetMyApps'));
		}
		else {
			UI.Models.PHA.get_by_record(this.record.record_id, null, this.callback('didGetMyApps'));
		}
	},
	
	didGetMyApps: function(my_apps) {			// got my apps, get carenets we are in
		this.my_apps = my_apps;
		var self = this;
		
		var app_div = $('#apps');
		var params = {'all_apps': this.my_apps};
		app_div.empty().html(this.view('apps', params));
		$('#carenets').show();
		
		// setup app hovering (so we see in which carenets the app already is)
		app_div.find('.app').bind({
			'mouseover': function(event) {
				var app_id = $(this).model().id;
				$('#carenets').find('.carenet').each(function(i, elem) {
					var app_arr = $(elem).model().apps;
					if (app_arr && _(app_arr).detect(function(a) { return a.id === app_id; })) {
						$(elem).find('.carenet_border').addClass('has_app');
					}
				});
			},
			'mouseout': function(event) {
				$('#carenets').find('.carenet_border').removeClass('has_app');
			}
		})
		
		// setup app dragging
		.draggable({
			revert: true,
			helper: function(event) {
				var img_name = $(this).model().data.name.toLowerCase().replace(/ +/, '_')
				return $('<img class="dragged_app" src="/jmvc/ui/resources/images/app_icons_32/' + img_name + '.png" alt="" />');
			},
			start: function(event) {
				var app_id = $(this).model().id;
				$('#carenets').find('.carenet').each(function(i, elem) {
					var app_arr = $(elem).model().apps;
					if (app_arr && _(app_arr).detect(function(a) { return a.id === app_id; })) {
						$(elem).css('opacity', 0.5);
					}
				});
			},
			stop: function(event) {				// this may be called AFTER another 'start' if the user very quickly drags another app. We could use 'drag' instead of 'start'
				$('#carenets').find('.carenet').each(function(i, elem) { $(elem).css('opacity', 1); });
			}
		});
		
		this.record.get_carenets(null, this.callback('didGetCarenets'));
	},
	
	didGetCarenets: function(carenets) {		// got our carenets, now get the apps per carenet
		this.carenets = carenets;
		
		self = this;
		var waiting_for = carenets.length;
		$(carenets).each(function(i, carenet) {
			carenet.apps = [];
			UI.Models.PHA.get_by_carenet(carenet.carenet_id, null, function(carenet_apps) {
				_(carenet_apps).each(function(c_app) {
					// if this _carenet_ pha is also in my_apps, remember it
					if (_(self.my_apps).detect(function(p) { return p.id === c_app.id; })) {
						carenet.apps.push(c_app);
					}
				});
				
				waiting_for--;
				if (waiting_for < 1) {
					self.didLoadCarenets();
				}
			}); // get_by_carenet
		}); // each carenet
	},
	
	didLoadCarenets: function() {
		$('#carenet_drag_apps').fadeIn('fast');
		
		// show carenets and their apps
		var nets = $('#carenets');
		var params = {
			'controller': this,
			'all_apps': this.all_apps,
			'my_apps': this.my_apps,
			'record_info': this.record_info,
			'carenets': this.carenets,
		};
		nets.empty().html(this.view('carenets', params));
		
		// setup apps (do this in the EJS?)
		nets.find('.carenet_app').click(function(event) {
			var app_view = $(this);
			var carenet_view = app_view.parentsUntil('.carenet').parent();
			carenet_view.addClass('expanded');
			var carenet = carenet_view.model();
			var app = app_view.model();
			carenet.remove_pha(app, self.callback('didRemoveAppFromCarenet', app_view, carenet_view));
		});
		
		// setup droppable
		var self = this;
		nets.find('.carenet').droppable({
			accept: function(draggable) {
				var mod = $(this).model();
				if (!mod) {		// after leaving and re-visiting settings it seems there are droppable zombies still around somewhere
					$(this).remove();
					return false;
				}
				
				return ! _(mod.apps).detect(function(a) { return a.id === draggable.model().id; });
			},
			hoverClass: 'app_hovers',
			drop: function(event, ui) {
				var app = ui.draggable.model();			// original element: ui.draggable
				var cnet = $(this);
				
				// add app
				self.addAppToCarenet(app, cnet);
				ui.helper.remove();
			}
		});
	},
	
	
	/**
	 * Event handlers
	 */
	addAppToCarenet: function(app, carenet_view) {
		var self = this;
		var carenet = carenet_view.model();
		
		// create the view
		app.temporarily_added = true;
		var coords = self.coordinatesForAppIndex(carenet.apps.length);
		var new_app_view = $(this.view('carenet_app', {'app': app, 'coords': coords}));
		new_app_view.click(function(event) {
			var app_view = $(this);
			app_view.css('opacity', 0.5);
			var carenet_view = app_view.parentsUntil('.carenet').parent();
			carenet_view.addClass('expanded');
			carenet.remove_pha(app, self.callback('didRemoveAppFromCarenet', app_view, carenet_view));
		});
		
		// add the view
		carenet_view.find('.carenet_content').append(new_app_view);
		carenet_view.find('.carenet_num_apps').first().text('~');
		carenet_view.addClass('expanded');
		
		// add to array and tell the server
		carenet.apps.push(app);
		carenet.add_pha(app, this.callback('didAddAppToCarenet', new_app_view, carenet_view));
	},
	didAddAppToCarenet: function(app_view, carenet_view, data, textStatus, xhr) {
		app_view.css('opacity', 1);
		app_view.model().temporarily_added = false;
		carenet_view.find('.carenet_num_apps').first().text(carenet_view.model().apps.length);
		carenet_view.delay(1000).removeClass('expanded');
	},
	
	
	didRemoveAppFromCarenet: function(app_view, carenet_view, data, textStatus, xhr) {
		
		// remove app from carenet app array
		var carenet = carenet_view.model();
		var app_id = app_view.model().id;
		if (carenet && carenet.apps && carenet.apps.length > 0) {
			for (var i = 0; i < carenet.apps.length; i++) {
				var app = carenet.apps[i];
				if (app.id == app_id) {
					carenet.apps.splice(i, 1);
					break;
				}
			}
		}
		
		// update view
		app_view.detach();		// can't fade out here as we need this to be gone when updating the other apps positions
		this.updateAppPositionsInCarenet(carenet_view);
		carenet_view.find('.carenet_num_apps').first().text(carenet.apps.length);
		carenet_view.delay(1000).removeClass('expanded');
	},
	
	
	/**
	 * Utilities
	 */
	updateAppPositionsInCarenet: function(carenet_view) {
		if (carenet_view) {
			var self = this;
			carenet_view.find('.carenet_app').each(function(i) {
				var coords = self.coordinatesForAppIndex(i);
				$(this).css('top', coords.top + 'px').css('left', coords.left + 'px');
			});
		}
	},
	
	coordinatesForAppIndex: function(i) {
		var radius = 72;
		var startDeg = -70;
		var increment = 40;
		
		var myDeg = startDeg + (i * increment);
		var a = Math.sin(this.deg2rad(myDeg)) * radius;
		var b = Math.cos(this.deg2rad(myDeg)) * radius;
		var top = 64 + a - 20;
		var left = 64 + b - 20;
		
		return {'top': top, 'left': left};
	},
	deg2rad: function(deg) {
		return deg * 0.017453;
	},
	
	
	// old handlers:
	/*
	$('.remove_app').click(function(evt) {
		UI.Models.PHA.delete_pha(_this.record_info.id, evt.target.id, function(){
			self.show(); // reload view
			UI.Controllers.MainController._remove_app(evt.target.id); // remove app from selector
		})
	});
		
	$('#pha_carenets_form').submit(function(evt) {
		var pha_id = $(this).find('input[type=hidden]').attr('value');
		var local_pha = _(_this.my_apps).detect(function(l){ return l.id === pha_id; });
		var done = function(){$('#update_carenets').val('{% trans "Updated!" %}')}
		
		$(this).find('input[name=carenet]').each(function(i, checkbox) {
			var carenet = _(_this.carenets).detect(function(c){ return c.carenet_id === checkbox.value; })
			if (checkbox.checked) { carenet.add_pha(local_pha, done); }
			else { carenet.remove_pha(local_pha, done); }
		});
		_.delay(function(){self.show()}, 1000); // reload view
		return false;
	});	*/
});

