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
		$('#app_content').html(this.view('show'));
		$('#app_content_iframe').hide();
		$('#app_content').show();
		
		UI.Models.PHA.get_all(this.callback('didGetAllApps'));
	},
	
	didGetAllApps: function(all_apps) {			// got all apps, get my apps
		this.all_apps = all_apps;
		var params = {'all_apps': this.all_apps};
		$('#apps').empty().html(this.view('apps', params)).find('.app').draggable({revert: true, helper: 'clone'});
		$('#carenets').show();
		
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
		var nets = $('#carenets');
		
		var params = {
			'all_apps': this.all_apps,
			'my_apps': this.my_apps,
			'record_info': this.record_info,
			'carenets': this.carenets,
		};
		nets.empty().html(this.view('carenets', params));
		
		// setup droppable
		nets.find('.carenet').droppable({
			accept: function(draggable) {
				var app_arr = $(this).model().apps;
				return ! _(app_arr).detect(function(a) { return a.id === draggable.model().id; });
			},
			hoverClass: 'app_hovers',
			drop: function(event, ui) {
				// original element: ui.draggable
				ui.helper.fadeOut('fast', function() { $(this).remove(); });
				$(this).find("a").html("Dropped " + ui.draggable.model().data.name);
			}
		});
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
		
	
    '.carenet_border click': function(event) {
    	alert(1);
    }
});


// OLD: includes carenet stuff and view

// PHAController= MVC.Controller.extend('pha', {
//		index: function(params) {
//		var _this = this;
//		
//		_this.phas = {};
//		_this.active_carenets = [];
//		
//		var record_id = params.record_id;
//		var pha_id = params.pha_id;
//		
//		// get the record
//		Record.get(record_id, null, function(record) {
//				_this.record = record;
//				
//				// get the carenets for the current record
//				record.get_carenets(null, function(carenets) {
//				_this.carenets = carenets;
//				
//				// get the apps for each carenet
//				$(carenets).each(function(i, carenet) {
//						PHA.get_by_carenet(carenet.carenet_id, null, function(p) {
//						_this.phas[carenet.carenet_id] = p;
//						
//						// check if the current PHA is in here
//						if (_.detect(p, function(one_pha) {
//								return one_pha.id == pha_id;
//						})) {
//								_this.active_carenets.push(carenet.carenet_id);
//						}
//						});
//				});
//				});
//		});
//		
//		// get the app description
//		PHA.get(record_id, pha_id, function(pha) {
//				_this.pha = pha;
//		});
//		
//		// display the page
//		when_ready(function() {
//				return (_this.pha && _this.record && _this.carenets && _.map(_this.carenets, function(i, c) {return _this.phas[c.carenet_id] != null;}));
//		}, function() {
//				$('#app_content_iframe').fadeOut(function(){
//				$('#app_content').fadeIn(function(){
//						_this.render({to: 'app_content'});
//				});
//				});
// 
//				$('#pha_carenets_form').submit(function() {
//				$(this).find('input[name=carenet]').each(function(i, checkbox) {
//						var the_carenet = _.select(_this.carenets, function(i) {return _this.carenets[i].carenet_id == checkbox.value;})[0];
//						if (checkbox.checked) {
//						// add the pha to the carenet
//						the_carenet.add_pha(_this.pha);
//						} else {
//						// remove the pha from the carenet
//						the_carenet.remove_pha(_this.pha);
//						}
//				});
//				setTimeout("HealthfeedController.dispatch('index')", 0);
//				return false;
//				});
//		});
//		},
// });

// 
// <h3>Preferences for "<%= pha.data.name %>"</h3>
// 
// <p>
// In most cases, an application should be shared with all of your carenets. You can limit your carenets' access by choosing which data to share with them. Sometimes, you may want to restrict an application to only some of your carenets when the application itself, i.e. "My Pregnancy Manager," reveals information you want to keep private.
// </p>
// 
// <form id="pha_carenets_form">
// <% $(carenets).each(function(i, carenet) { %>
// <input name="carenet" value="<%= carenet.carenet_id %>" type="checkbox" <% if (active_carenets.indexOf(carenet.carenet_id) > -1) { %>checked<% } %> /> <%= carenet.name %><br />
// <% }); %>
// <input type="submit" value="update" />
// </form>
