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
	myInstance: null,
	allRecords: {},
	activeRecord: null,
	
	/**
	 * Create a new record
	 */
	createNewRecord: function(sender) {
		var name = prompt('Record Name:');
		if (name && name.length > 0) {
			UI.Models.Record.create(name, this.didCreateNewRecord, this.didNotCreateNewRecord);
		}
	},
	didCreateNewRecord: function(resObj, textStatus, xhr) {
		if (resObj && resObj.record_id) {
			UI.Controllers.Record.myInstance.ready(null, null, resObj.record_id);
		}
		else {
			alert('{% trans "Your record was created. Reload the browser window to access it." }');
		}
	},
	didNotCreateNewRecord: function(xhr, error, error_type) {
		alert(xhr && xhr.responseText ? xhr.responseText : error_type);
	}
},
/* @Prototype */
{
	/**
	 * ACCOUNT_ID comes in from django: we might want an extern here for Google Closure Complier
	 * http://code.google.com/closure/compiler/docs/api-tutorial3.html#externs
	 */
	ready: function(document, jq, show_record_id) {
		UI.Controllers.Record.myInstance = this;
		var self = this;
		
		// inner function for strict ordering to make sure ACCOUNT.RECORDS is loaded
		var _ready = function(show_record_id) {
			var record_list = {};
			COLORS = ['rgb(250,250,250)', 'rgb(242,246,255)', 'rgb(244,255,242)', 'rgb(250,242,255)', 'rgb(254,255,242)', 'rgb(255,248,242)', 'rgb(255,242,242)', 'rgb(255,242,251)'];
			self.clearTabs();
			
			// create records list, assign colors and add tabs
			$(ACCOUNT.RECORDS).each(function(i, record) {
				record_list[record.id] = record;
				record.bgcolor = COLORS[i];
				self.addTab(record);
			})
			UI.Controllers.Record.allRecords = record_list;
			
			// load the desired or first record
			if (ACCOUNT.RECORDS.length > 0) {
				UI.Controllers.MainController.hasRecords();
				if (!show_record_id) {
					show_record_id = ACCOUNT.RECORDS[0].id;
				}
				self.markTabForRecordSelected(show_record_id);
				self.loadRecord(show_record_id);
			}
			else {
				UI.Controllers.MainController.noRecords();
			}
		};
		
		// init the ACCOUNT model and call the inner function
		ACCOUNT = new UI.Models.Account;
		ACCOUNT.load(ACCOUNT_ID, function() { _ready(show_record_id); });
	},
	
	/**
	 * Makes the provided record the active one
	 */
	loadRecord: function(record_id) {
		UI.Controllers.Record.activeRecord = UI.Controllers.Record.allRecords[record_id];
		var activeRecord = UI.Controllers.Record.activeRecord;
		if (!activeRecord) {
			alert('Failed to load record with id "' + record_id + '": Not found');
			return;
		}
		
		// show/hide carenet owned options
		if (activeRecord.carenet_id) {
			$('#record_owned_options').hide();
		}
		else {
			$('#record_owned_options').show();
		}
		
		// set background color
		$('#app_selector .selected, #app_content, #app_content_iframe').animate({
			backgroundColor: activeRecord.bgcolor
		}, 1000);
		
		// make sure the iframe is hidden and the div is shown
		$('#app_content_iframe').attr('src', 'about:blank').hide();
		$('#app_content').show();
		
		// load the record from the model and call the callback
		UI.Models.Record.get(record_id, activeRecord.carenet_id, function(record) {
			record.bgcolor = UI.Controllers.Record.activeRecord ? UI.Controllers.Record.activeRecord.bgcolor || '' : '';
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
	},
	
	
	/**
	 * Adds a record tab
	 */
	addTab: function(record) {
		var a = $('<a class="record_tab" href="javascript:void(0);" />').text(record.label);
		a.css('background-color', record.bgcolor);
		a.data('record', record);
		
		// add click event
		var self = this;
		a.click(function(event) {
			$(this).addClass('selected').siblings().removeClass('selected');
			self.loadRecord(record.id);
		});
		
		// add tab
		$('#record_tabs').append(a);
	},
	
	markTabForRecordSelected: function(record_id) {
		if (record_id) {
			$('#record_tabs').children().each(function(i) {
				var tab = $(this);
				var this_record = tab.data('record');
				if (this_record) {
					if (record_id == this_record.id) {
						tab.addClass('selected');
					}
					else {
						tab.removeClass('selected');
					}
				}
			});
		}
	},
	
	clearTabs: function() {
		$('#record_tabs').children().not('#add_record_tab').remove();
	}
});
