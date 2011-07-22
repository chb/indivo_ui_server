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
	/**
	* Show and manipulate phas for this record. Refactor!
	*/
	show: function() {
		this.record_info = RecordController.RECORDS[RecordController.RECORD_ID]; // get the record info from the globals (FIXME later)
		this.carenet_phas_active_ids = {};
		var _this = this;
		var record = null;
		var all_phas = null;
		var local_phas = null;
		var carenets = null;

		_show_template = function(){
			var params = {
				'local_phas': _this.local_phas,
				'record_info': _this.record_info,
				'carenets': _this.carenets,
				'carenet_phas_active_ids': _this.carenet_phas_active_ids
			};
			$('#app_content').html($.View('//ui/views/pha/show.ejs', params));
			$('#app_content_iframe').hide();
			$('#app_content').show();
		};
		
		_add_handlers = function(){
			$('.remove_app').click(function(evt) {
				UI.Models.PHA.delete_pha(_this.record_info.id, evt.target.id, function(){
					UI.Controllers.PHA.show(); // reload view
					UI.Controllers.MainController._remove_app(evt.target.id); // remove app from selector
				})
			});

			$('#pha_carenets_form').submit(function(evt) {
				var pha_id = $(this).find('input[type=hidden]').attr('value');
				var local_pha = _(_this.local_phas).detect(function(l){ return l.id === pha_id; });
				var done = function(){$('#update_carenets').val('{% trans "Updated!" %}')}
				
				$(this).find('input[name=carenet]').each(function(i, checkbox) {
					var carenet = _(_this.carenets).detect(function(c){ return c.carenet_id === checkbox.value; })
					if (checkbox.checked) { carenet.add_pha(local_pha, done); }
					else { carenet.remove_pha(local_pha, done); }
				});
				_.delay(function(){UI.Controllers.PHA.show()}, 1000); // reload view
				return false;
			});
		};
		
		var record_load_callback = function(record) {
			// get all the phas
			UI.Models.PHA.get_all(function(all_phas) {
				_this.all_phas = all_phas;
				
				var after_pha_callback = function(local_phas) {
					// local_phas are the phas for this record
					_this.local_phas = local_phas;

					// get the carenets for the current record
					_this.record.get_carenets(null, function(carenets) {
						_this.carenets = carenets;

						// get the apps for each carenet
						$(carenets).each(function(i, carenet) {
								UI.Models.PHA.get_by_carenet(carenet.carenet_id, null, function(carenet_phas) {

									var _set_active_ids = function(callback){
										_(carenet_phas).each(function(c_pha){
											// if this _carenet_ pha is also in local_phas, append it to a item carenet_phas_active_ids object (keyed by carenet_id)
											if (_(_this.local_phas).detect(function(p){ return p.id === c_pha.id; })) {
												if (!_this.carenet_phas_active_ids[carenet.carenet_id]) { _this.carenet_phas_active_ids[carenet.carenet_id] = [c_pha.id]; }
												else { _this.carenet_phas_active_ids[carenet.carenet_id].push(c_pha.id); }
											}
										})
										
										callback();
									} // _set_active_ids

									_set_active_ids(_show_template);
									_add_handlers();

							}); // get_by_carenet
						}); // each carenet
					}); // get carenets
				}; // end after_pha_callback

				// is this a carenet or a record? depending on which get the associated apps
				if (_this.record_info.carenet_id) { UI.Models.PHA.get_by_carenet(_this.record_info.carenet_id, null, after_pha_callback); }
				else { UI.Models.PHA.get_by_record(record.record_id, null, after_pha_callback) }
			});
		}; // end record_load_callback

		// load the record from the model and call the callback
		UI.Models.Record.get(RecordController.RECORD_ID, _this.record_info.carenet_id, function(record) {
			_this.record = record;
			record_load_callback(record);
		});
	
	
	}
},
/* @Prototype */
{
    "click": function() { UI.Controllers.PHA.show() }
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
