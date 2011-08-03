/**
 * @tag controllers, home
 * 
 * @author Pascal Pfiffner (pascal.pfiffner@childrens.harvard.edu)
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 */

$.Controller.extend('UI.Controllers.Record',
/* @Static */
{
	onDocument: true,
	allRecords: {},
	activeRecord: null,
	
	loadRecord: function(record_id) {
		this.activeRecord = UI.Controllers.Record.allRecords[record_id];
		if (!this.activeRecord) {
			alert('Failed to load record "' + record_id + '": Not found');
			return;
		}
		
		// show/hide carenet owned options
		if (this.activeRecord.carenet_id) {
			$('#record_owned_options').hide();
		}
		else {
			$('#record_owned_options').show();
		}
		
		// load the record from the model and call the callback
		UI.Models.Record.get(record_id, this.activeRecord.carenet_id, function(record) {
			record.bgcolor = UI.Controllers.Record.activeRecord.bgcolor || '';
			UI.Controllers.Record.activeRecord = record;
			
			// load record's apps
			UI.Models.PHA.get_all(function(phas) {
				var after_pha_callback = function(phas) {
					
					// remember selected app before clearing...
					var selected_id = $('#app_selector .selected').attr('id');
					$(document.documentElement).ui_main('clear_apps');	// New JMVC3 controller calling convention
					
					// ...add this record's apps...
					$(phas).each(function(i, app){
						$(document.documentElement).ui_main('add_app', {'pha': app, 'fire_p': false, 'carenet_id': record.carenet_id});
					});
					
					// ...and try to re-select previous app, show healthfeed otherwise
					var old_app = $('#' + selected_id);
					if (old_app.is('*')) {
						old_app.click();
					}
					else {
						$('#healthfeed_li').click();
					}
				};
				
				// is this a carenet or a record? depending on which, init the appropriate apps
				if (record.carenet_id) {
					UI.Models.PHA.get_by_carenet(record.carenet_id, null, after_pha_callback);
				}
				else {
					UI.Models.PHA.get_by_record(record.record_id, null, after_pha_callback);
				}
			});
		});
	}
},
/* @Prototype */
{
	/**
	 * ACCOUNT_ID comes in from django: we might want an extern here for Google Closure Complier
	 * http://code.google.com/closure/compiler/docs/api-tutorial3.html#externs
	 */
	ready: function() {
		var self = this;
		
		// inner function for strict ordering to make sure ACCOUNT.RECORDS is loaded
		var _ready = function() {
			var record_list = {};
			COLORS = ['rgb(250,250,250)', 'rgb(242,246,255)', 'rgb(244,255,242)', 'rgb(250,242,255)', 'rgb(254,255,242)', 'rgb(255,248,242)', 'rgb(255,242,242)', 'rgb(255,242,251)'];
			
			
			// create records list, assign colors and add tabs
			$(ACCOUNT.RECORDS).each(function(i, record) {
				record_list[record.id] = record;
				record.bgcolor = COLORS[i];
				self.addTab(record, (0 == i));
			})
			UI.Controllers.Record.allRecords = record_list;
			
			// load the first record
			UI.Controllers.Record.loadRecord(ACCOUNT.RECORDS[0].id);
		};
		
		// init the ACCOUNT model and call the inner function
		ACCOUNT = new UI.Models.Account;
		ACCOUNT.load(ACCOUNT_ID, _ready);
	},
	
	
	
	addTab: function(account, selected) {
		var a = $('<a class="record_tab" href="javascript:void(0);" />').text(account.label);
		a.css('background', account.bgcolor);
		if (selected) {
			a.addClass('selected');
		}
		a.data('account', account);
		
		// add click event
		var self = this;
		a.click(function(event) {
			var acc = $(this).data('account');
			
			// tab functionality
			$('#record_tabs').find('a').removeClass('selected');
			$(this).addClass('selected');
			
			// set background color
			$('#app_selector .selected, #app_content, #app_content_iframe').animate({
				backgroundColor: acc.bgcolor
			}, 1000);
			
			// make sure the iframe is hidden and the div is shown
			$('#app_content_iframe').attr('src', 'about:blank').hide();
			$('#app_content').show();
			
			// fire!
			UI.Controllers.Record.loadRecord(acc.id);
		});
		
		// add tab
		$('#record_tabs').append(a);
	}
});
