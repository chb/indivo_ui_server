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
 * @author Pascal Pfiffner (pascal.pfiffner@childrens.harvard.edu)
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 */
$.Controller.extend('UI.Controllers.PHA',
/* @Static */
{
	onDocument: true,
	viewAnimationState: {},
	animateViewPositionTo: function(view, x, y) {
		var now = (new Date()).getTime();
		UI.Controllers.PHA.viewAnimationState = {
		       'view': view,
		     'startX': parseInt(view.css('left')) || 0,
		     'startY': parseInt(view.css('top')) || 0,
		          'x': x,
		          'y': y,
		      'start': now,
		   'duration': 300,
		        'end': now + 300,
		   'interval': null};
		
		UI.Controllers.PHA.viewAnimationState.interval = setInterval(UI.Controllers.PHA._animateViewPosition, 20);
	},
	
	_animateViewPosition: function() {
		var s = UI.Controllers.PHA.viewAnimationState;
		if (!s) {
			return;
		}
		
		// animating
		var now = (new Date()).getTime();
		if (now < s.end) {
			var delta = (now - s.start) / s.duration;
			var factor = ((delta * delta) * 3.0) - ((delta * delta * delta) * 2.0);
			var thisX = s.startX + (factor * (s.x - s.startX));
			var thisY = s.startY + (factor * (s.y - s.startY));
			
			s.view.css('left', thisX + 'px').css('top', thisY + 'px');
			return;
		}
		
		// finished
		s.view.css('left', s.x + 'px').css('top', s.y + 'px');
		
		clearInterval(s.interval);
		s.interval = null;
		UI.Controllers.PHA.viewAnimationState = {};
	}
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
		else if (this.record.record_id) {
			UI.Models.PHA.get_by_record(this.record.record_id, null, this.callback('didGetMyApps'));
		}
		else {
			alert("didGetAllApps()\n\nError, we got invalid record info, cannot continue");
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
		.bind('selectstart', function () { return false; })		// needed for WebKit (unless we upgrade jQuery UI to 1.8.6+)
		.draggable({
			distance: 8,
			revert: 'invalid',
			revertDuration: 300,
			helper: 'clone',
			containment: '#app_content',
			start: function(event, ui) {
				var app_id = $(this).model().id;
				$('#carenets').find('.carenet').each(function(i, elem) {
					var app_arr = $(elem).model().apps;
					if (app_arr && _(app_arr).detect(function(a) { return a.id === app_id; })) {
						$(elem).css('opacity', 0.4);
					}
				});
				ui.helper.addClass('app_dragged');
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
		
		// setup apps
		var self = this;
		nets.find('.carenet_app').each(function(i) {
			self.setupCarenetApp($(this));
		});
		
		// setup droppable
		nets.find('.carenet').droppable({
			accept: function(draggable) {
				var mod = $(this).model();
				if (!mod) {		// after leaving and re-visiting settings it seems there are droppable zombies still around somewhere
					$(this).remove();
					return false;
				}
				
				var drag_mod = draggable.model();
				if (drag_mod) {
					return ! _(mod.apps).detect(function(a) { return a.id === drag_mod.id; });
				}
				return false;
			},
			hoverClass: 'app_hovers',
			over: function(event, ui) {
				if (ui.helper.hasClass('app_will_remove')) {
					ui.helper.addClass('app_will_transfer');
				}
			},
			out: function(event, ui) {
				if (ui.helper.hasClass('app_will_remove')) {
					ui.helper.removeClass('app_will_transfer');
				}
			},
			
			// add app on drop
			drop: function(event, ui) {
				var app = ui.draggable.model();
				var carenet_view = $(this);
				
				self.addAppToCarenet(app, ui.helper, carenet_view);
			}
		});
	},
	
	
	/**
	 * Event handlers
	 */
	addAppToCarenet: function(app, dragged_view, carenet_view) {
		var carenet = carenet_view.model();
		carenet_view.addClass('expanded');
		app.temporarily_added = true;
		
		// create the view at drop position
		var carenet_content = carenet_view.find('.carenet_content').first();
		var pos_parent = carenet_content.offset();
		var pos_app = dragged_view.offset();
		var cur_coords = {'top': pos_app.top - pos_parent.top + 7, 'left': pos_app.left - pos_parent.left + 30};		// manual correction because the dragged and new app view are of different size
		
		var new_app_view = $(this.view('carenet_app', {'app': app, 'coords': cur_coords}));
		this.setupCarenetApp(new_app_view);
		
		// add the view and animate to final position
		carenet_content.append(new_app_view);
		var coords = this.coordinatesForAppIndex(carenet.apps.length);
		UI.Controllers.PHA.animateViewPositionTo(new_app_view, coords.left, coords.top);
		carenet_view.find('.carenet_num_apps').first().text('~');
		
		// add to array and tell the server
		carenet.apps.push(app);
		carenet.add_pha(app, this.callback('didAddAppToCarenet', new_app_view, carenet_view));
	},
	didAddAppToCarenet: function(app_view, carenet_view, data, textStatus, xhr) {
		app_view.css('opacity', 1);
		app_view.model().temporarily_added = false;
		carenet_view.find('.carenet_num_apps').first().text(carenet_view.model().apps.length);
		
		var tmp_id = 'tmp_id_' + (new Date()).getTime();
		carenet_view.attr('id', tmp_id);
		setTimeout("$('#" + tmp_id + "').removeClass('expanded')", 600);
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
		
		var tmp_id = 'tmp_id_' + (new Date()).getTime();
		carenet_view.attr('id', tmp_id);
		setTimeout("$('#" + tmp_id + "').removeClass('expanded')", 600);
	},
	
	
	/**
	 * Utilities
	 */
	setupCarenetApp: function(app_view) {
		if (app_view) {
			var self = this;
			
			//** show app info on hover
			app_view.bind('mouseover', function(event) {
				var self_id = $(this).model().id;
				$('#apps').find('.app').each(function(i) {
					if ($(this).model().id == self_id) {
						$(this).addClass('app_showinfo');
					}
				});
			})
			.bind('mouseout', function(event) {
				if (!$(this).hasClass('app_dragged')) {
					$('#apps').find('.app').removeClass('app_showinfo');
				}
			})
			
			//** setup action on mouse up (can't use "stop" of draggable as this will first revert the item)
			.bind('mouseup', function(event) {
				var view = $(this);
				
				// remove from carenet
				if (view.hasClass('app_will_remove')) {
				//	if (!view.hasClass('app_will_transfer')) {		// uncomment to NOT delete app from other carenet when transferring
						view.draggable('destroy');
						
						// tell the server
						var carenet_view = view.parentsUntil('.carenet').last().parent();
						var carenet = carenet_view.model();
						if (carenet) {
							var app = view.model();
							carenet_view.addClass('expanded');
							carenet.remove_pha(app, self.callback('didRemoveAppFromCarenet', view, carenet_view));
						}
						
						// animate removal
						if (!view.hasClass('app_will_transfer')) {
							var v = view.get(0);
							var pos = {top: 10, left: 9};	// hardcoded correction for some style attributes. Bad, quick and dirty
							while (v) {
								if ('app_content' == v.getAttribute('id')) {
									break;
								}
								pos.top += v.offsetTop + (window.getComputedStyle ? parseInt(window.getComputedStyle(v, null).borderTopWidth) : 0);
								pos.left += v.offsetLeft + (window.getComputedStyle ? parseInt(window.getComputedStyle(v, null).borderLeftWidth) : 0);
								
								v = v.offsetParent;
							}
							
							var clone = view.clone(false);
							clone.css('top', pos.top + 'px').css('left', pos.left + 'px');
							$('#app_content').append(clone);
							clone.delay(200).fadeOut(500, function() { $(this).remove(); });
						}
						view.detach();
				//	}
				}
			})
			
			//** setup dragging
			.bind('selectstart', function () { return false; })		// needed for WebKit (unless we upgrade jQuery UI to 1.8.6+)
			.draggable({
				distance: 8,
				revert: true,
				revertDuration: 300,
				containment: '#app_content',
				start: function(event, ui) {
					var view = ui.helper;
					view.addClass('app_dragged');
					var carenet_view = view.parentsUntil('.carenet').last().parent();
					carenet_view.addClass('expanded');
					
					// indicate (im)possible targets
					var app_id = view.model().id;
					$('#carenets').find('.carenet').not('.expanded').each(function(i, elem) {
						var app_arr = $(elem).model().apps;
						if (app_arr && _(app_arr).detect(function(a) { return a.id === app_id; })) {
							$(elem).css('opacity', 0.4);
						}
					});
				},
				drag: function(event, ui) {
					var view = ui.helper;
					var par = view.parent();
					var x = parseInt(view.css('left')) + view.outerWidth(true) / 2 - par.outerWidth(true) / 2;
					var y = parseInt(view.css('top')) + view.outerHeight(true) / 2 - par.outerHeight(true) / 2;
					var maxRad = 120;
					var myRad = Math.sqrt(x*x + y*y);
					if (myRad > maxRad) {
						view.addClass('app_will_remove');
					}
					else {
						view.removeClass('app_will_remove');
					}
				},
				stop: function(event, ui) {
					var view = ui.helper;
					view.removeClass('app_dragged');
					
					// revert UI (note: this may be called AFTER another 'start' if the user very quickly drags another app)
					$('#carenets').find('.carenet').each(function(i, elem) {
						$(elem).css('opacity', 1);
					});
					$('#apps').find('.app').removeClass('app_showinfo');
					
					if (!view.hasClass('app_will_remove')) {
						view.parentsUntil('.carenet').last().parent().removeClass('expanded');
					}
				}
			});
		}
	},
	
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

