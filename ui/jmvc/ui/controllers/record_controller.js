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
	
},
/* @Prototype */
{
	init: function() {
		this.account = this.options.account;
		this.alertQueue = this.options.alertQueue;
		
		this.loadRecords();
	},
	
	/**
	 *	Removes all record tabs (but not the add-record tab), fetches the records of this.account, adds tabs for each record and then
	 *	loads the first or the given record.
	 */
	loadRecords: function(load_record) {
		this.removeAllTabs();
		var self = this, 
			colors = ['rgb(250,250,250)', 'rgb(242,246,255)', 'rgb(244,255,242)', 'rgb(250,242,255)', 'rgb(254,255,242)', 'rgb(255,248,242)', 'rgb(255,242,242)', 'rgb(255,242,251)'];
		
		// load records, assign colors and add tabs
		this.account.get_records(function(records) {
			for (var i=0; i< records.length; i++) {
				records[i].bgcolor = colors[i % colors.length];
				self.addTab(records[i], (0 == i));
			}
			
			// load the desired or first record
			if (records.length > 0) {
				UI.Controllers.MainController.unlockAppSelector();
				var record_to_load = records[0];
				if (load_record) {
					for (var i = 0; i < records.length; i++) {
						if (records[i].id == load_record) {
							record_to_load = records[i];
							break;
						}
					}
				}
				self.loadRecord(record_to_load);
			}
			else {
				UI.Controllers.MainController.showNoRecordsHint();
			}
		},
		function() {
			self.alertQueue.push(new UI.Models.Alert({text:"Sorry, but we were not able to load your records. Please try again later", level:"error"}));
		});
	},

	loadRecord: function(record) {
		this.account.attr("activeRecord", record);
		
		// show/hide carenet owned options
		if (record && record.carenet_id) {
			$('#record_owned_options').hide();
		}
		else if (record) {
			$('#record_owned_options').show();
		}
	},
	
	".record_tab click": function(el, ev) {
		var record = $(el).model();
		var bgcolor = record ? record.bgcolor : 'rgb(250,250,250)';
		
		// tab functionality
		$('#record_tabs').find('a').removeClass('selected');
		$(el).addClass('selected');
		
		// make sure the iframe is hidden and the div is shown
		$('#app_content_iframe').attr('src', 'about:blank').hide();
		$('#app_content').show();
		
		// load the record or show new record form
		if (record) {
			this.loadRecord(record);
		}
		else {
			this.loadRecord(null);
			var appListController = $('#app_selector').controller();
			if (appListController) {
	//			appListController.clearControllers($('#app_content'));
				appListController.selectTab(null);
			}
			this.showRecordForm(el);
		}
		
		// set background color
		$('#app_selector .selected, #app_content, #app_content_iframe').animate({
			backgroundColor : bgcolor
		}, 1000);
	},
	
	/**
	 * Add a record tab
	 */
	addTab: function(record, selected) {
		// TODO: replace with a listener for changes to a List of Records on the Account when JMVC merges Observable into Model
		$('#loading_records_hint').remove();
		// append tab to existing list
		$('#record_tabs').append($.View("//ui/views/record/show_tab", {record:record, selected:selected, color:record ? record.bgcolor : 'rgb(250,250,250)'}));
	},
	
	/**
	 * Remove all but the [+] record tabs
	 */
	removeAllTabs: function() {
		$('#record_tabs .record_tab').not('#add_record_tab').remove();
	},
	
	/**
	 * Show the form to create a new record
	 */
	showRecordForm: function(sender) {
		var form = $.View('//ui/views/record/create');
		$('#app_content').html(form);
		$('#givenName').focus();
	},
	
	/**
	 * Did submit the create record form - create a record!
	 * @todo The cancel link does not cancel an active call on a slow network
	 */
	'#new_record_form submit': function(el, ev) {
		el.find('.error_area').first().hide().text('');
		el.find('.loader').first().show();
		$('#create_record_submit').attr('disabled', 'disabled');
		
		// collect data (where's that "form_values" method of jQuery?)
		var dict = {'givenName': el.find('input[name="givenName"]').val(),
				   'familyName': el.find('input[name="familyName"]').val(),
					    'email': el.find('input[name="email"]').val()};
		
		UI.Models.Record.create(dict, this.callback('didCreateNewRecord', el), this.callback('didNotCreateNewRecord', el));
		return false;
	},
	didCreateNewRecord: function(form, data, textStatus, xhr) {
		var new_record_id = null;
		if (data && data.record_id) {
			new_record_id = data.record_id;
		}
		$('#add_record_tab').removeClass('selected');
		this.loadRecords(new_record_id);
	},
	didNotCreateNewRecord: function(form, errXhr) {
		steal.dev.log('Error handling not really implemented', errXhr);
		form.find('.error_area').first().text('Error');
		form.find('.loader').first().hide();
		$('#create_record_submit').removeAttr('disabled');
	}
});
