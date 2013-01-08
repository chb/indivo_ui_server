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
		this.removeAllRecordTabs();
		var self = this, 
			colors = ['rgb(250,250,250)', 'rgb(242,246,255)', 'rgb(244,255,242)', 'rgb(250,242,255)', 'rgb(254,255,242)', 'rgb(255,248,242)', 'rgb(255,242,242)', 'rgb(255,242,251)'];
		
		// load records, assign colors and add tabs
		this.account.get_records(function(records) {
			for (var i=0; i< records.length; i++) {
				records[i].bgcolor = colors[i % colors.length];
				self.addTab(records[i]);
			}
			
			// load the desired or first record
			if (load_record && records.length > 0) {
				var record_to_load = records[0];
				
				for (var i = 0; i < records.length; i++) {
					if (records[i].id == load_record) {
						record_to_load = records[i];
						break;
					}
				}
				self.loadRecord(record_to_load);
			}
		},
		function() {
			self.alertQueue.push(new UI.Models.Alert({text:"Sorry, but we were not able to load your records. Please try again later", level:"error"}));
		});
	},

	loadRecord: function(record) {
		var loading_same = (record == this.account.activeRecord);
		var ui_main = $('body').controllers('main')[0];
		if (!ui_main) {
			steal.dev.warn('There is no main controller on body');
			return;
		}
		this.account.attr("activeRecord", record);
		
		// show/hide carenet owned options
		if (record && record.carenet_id) {
			$('#record_owned_options').hide();
		}
		else if (record) {
			$('#record_owned_options').show();
		}
		
		// show record info if the same record tab was clicked twice
		if (record && loading_same) {
			this.showRecordInfo();
		}
		
		// select the right tab
		ui_main.deselectMainTabs();
		var all_tabs = $('#record_tabs').find('a');
		for (var i = 0; i < all_tabs.length; i++) {
			var tab = $(all_tabs[i]);
			if (record && tab.model() == record) {
				tab.addClass('selected');
			}
			else {
				tab.removeClass('selected');
			}
		}
		
		// set background color to record's color
		if (record) {
			ui_main.tintInterface(record.bgcolor);
		}
	},
	
	".record_tab click": function(el, ev) {
		var record = $(el).model();
		this.loadRecord(record);
		
		// show "create new record" form
		if (!record) {
			this.showRecordForm(el);
		}
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
	removeAllRecordTabs: function() {
		$('#record_tabs .record_tab').not('#add_record_tab').remove();
	},
	
	
	/**
	 *	Show the record overview page
	 */
	showRecordInfo: function() {
		var record = this.account.activeRecord;
		if (!record) {
			steal.dev.warn('showRecordInfo()', 'Can not show record info page, no activeRecord is set!');
			return;
		}
		
		// deselect apps
		var appListController = $('#app_selector').controller();
		if (appListController) {
			appListController.selectTab(null);
		}
		
		// load template
		var ui_main = $('body').controllers('main')[0];
		if (!ui_main) {
			steal.dev.warn('There is no main controller attached to body');
			return;
		}
		
		var page = $.View('//ui/views/record/info', {'record': record});
		ui_main.tintInterface();
		ui_main.cleanAndShowAppDiv(page);
		
		// ** show demographics
		if (record.demographics) {
			this.fillDemographicsArea();
		}
		
		// ** load demographics first and call us again when we're all good
		else {
			var self = this;
			record.get_demographics(
				
				// success callback
				function(data, textStatus, xhr) {
					self.fillDemographicsArea();
				},
				
				// error callback
				function(xhr, textStatus, error) {
					if ('status' in xhr && 404 == xhr.status) {
						self.fillDemographicsArea();
					}
					else {
						var info = '<p>There was an error loading your personal information:</p>';
						info += '<p>' + (xhr && 'status' in xhr ? xhr.status + ': ' : '') + error + '</p>';
						$('#demographics_area').html(info);
					}
				}
			);
		}
	},
	
	/**
	 * Fills information from the demographics document into the demographics template
	 * @return a jQuery object generated from demographics template and -data
	 * @attention This assumes the div #demographics_area is in the DOM
	 */
	fillDemographicsArea: function() {
		var record = this.account.activeRecord;
		if (!record) {
			steal.dev.warn('filledDemographicsView()', 'Can not show demographics page, no active record is set!');
			return;
		}
		
		var demographics = record ? record.demographics : null;
		
		// show the full name
		if (demographics) {
			var gender_sign = ('male' == demographics.gender ? ", ♂" : ('female' == demographics.gender ? ", ♀" : ''));
			var name = record.formattedName() + gender_sign;
			$('#record_name').html(name);
		}
		
		// main demographics view
		if (demographics) {
			demographics.dob = record.dob();
			demographics.age = record.age();
		}
		//console.log(demographics);
		$('#demographics_area').empty().append($.View('//ui/views/record/demographics', {'record': record, 'demographics': demographics}));
	},
	
	'#show_demographics click': function(element, event) {
		this.showDemographicsForm();
	},
	
	/**
	 * Show the form to update the demographics.
	 * It will automatically insert the current record's values if the demographics
	 * document has been fetched, so be sure to get that first!
	 */
	showDemographicsForm: function() {
		var record = this.account.activeRecord;
		if (!record) {
			steal.dev.warn('showDemographicsForm()', 'Can not show demographics form, no activeRecord is set!');
			return;
		}
		
		var ui_main = $('body').controllers('main')[0];
		if (!ui_main) {
			steal.dev.warn('There is no main controller attached to body');
			return;
		}
		
		var demographics = 'demographics' in record ? record.demographics : null;
		
		// load the form
		var form = $.View('//ui/views/record/demographics_form', {'demographics': demographics});
		ui_main.tintInterface();
		ui_main.cleanAndShowAppDiv(form);
	},
	
	/**
	 * Did submit the create record form - create a record!
	 * @todo The cancel link does not cancel an active call on a slow network
	 */
	'#demographics_form submit': function(element, event) {
		var record = this.account.activeRecord;
		if (!record) {
			steal.dev.warn('#demographics_form submit', 'Can not save demographics, no activeRecord is set!');
			element.find('.error_area').first().text('An error occurred, please try again or contact support').show();
			element.find('.loader').first().hide();
			$('#update_demographics_submit').removeAttr('disabled');
			return;
		}
		
		element.find('.error_area').first().hide().text('');
		element.find('.loader').first().show();
		$('#update_demographics_submit').attr('disabled', 'disabled');
		
		// collect data (where's that "form_values" method of jQuery?)
		var d_email = element.find('input[name="email"]').val();
		var d_ethnicity = element.find('input[name="ethnicity"]').val();
		var d_race = element.find('input[name="race"]').val();
		var d_lang = element.find('input[name="preferred_language"]').val();
		
		var n_prefix = element.find('input[name="prefix"]').val();
		var n_suffix = element.find('input[name="suffix"]').val();
		var n_middle = element.find('input[name="middleName"]').val();
		
		// birthday (at least year must be present)
		var bday_year = element.find('input[name="bday_year"]').val();
		var bday_month = element.find('input[name="bday_month"]').val();
		var bday_date = element.find('input[name="bday_date"]').val();
		var dob_str = '';
		if (bday_year > 0) {
			if (bday_year < 1000) {
				bday_year += 1900;
			}
			var dob = new Date();
			dob.setYear(bday_year);
			dob.setMonth(Math.max(1, bday_month - 1));
			dob.setDate(Math.max(1, bday_date));
			
			dob_str = dob.getFullYear() + '-' + ('0' + (dob.getMonth()+1)).slice (-2) + '-' + ('0' + dob.getDate()).slice (-2);
			console.log(dob, dob_str);
		}
		
		// abort if birthday is not present, we need that!
		else {
			element.find('.error_area').first().text("Please provide a valid birthday").show();
			element.find('.loader').first().hide();
			$('#update_demographics_submit').removeAttr('disabled');
			return;
		}
		
		// phones
		var fon1 = '';
		var number1 = element.find('input[name="tel_1_number"]').val();
		if (number1) {
			fon1 = '<Telephone>';
			fon1 += '<type>' + element.find('select[name="tel_1_type"]').val() + '</type>';
			fon1 += '<number>' + number1 + '</number>';
			fon1 += '<preferred>' + (element.find('input[name="tel_1_preferred_p"]').prop('checked')) + '</preferred>';
			fon1 += '</Telephone>';
		}
		
		var fon2 = ''
		var number2 = element.find('input[name="tel_2_number"]').val();
		if (number2) {
			fon2 = '<Telephone>';
			fon2 += '<type>' + element.find('select[name="tel_2_type"]').val() + '</type>';
			fon2 += '<number>' + number2 + '</number>';
			fon2 += '<preferred>' + (element.find('input[name="tel_2_preferred_p"]').prop('checked')) + '</preferred>';
			fon2 += '</Telephone>';
		}
		
		// address
		var address = '';
		var a_street = element.find('input[name="adr_street"]').val();
		var a_city = element.find('input[name="adr_city"]').val();
		var a_postalcode = element.find('input[name="adr_postalcode"]').val();
		var a_region = element.find('input[name="adr_region"]').val();
		var a_country = element.find('input[name="adr_country"]').val();
		if (a_street || a_city || a_postalcode || a_region || a_country) {
			address = '<Address>';
			address += a_country ? '<country>' + a_country + '</country>' : '';
			address += a_city ? '<city>' + a_city + '</city>' : '';
			address += a_postalcode ? '<postalCode>' + a_postalcode + '</postalCode>' : '';
			address += a_region ? '<region>' + a_region + '</region>' : '';
			address += a_street ? '<street>' + a_street + '</street>' : '';
			address += '</Address>';
		}
		
		// create the demographics XML
		var demographics = '<Demographics xmlns="http://indivo.org/vocab/xml/documents#">'
                                    +'<dateOfBirth>' + dob_str + '</dateOfBirth>'
                                    +'<gender>' + element.find('select[name="gender"]').val() + '</gender>'
                                    +(d_email ? '<email>' + d_email + '</email>' : '')
                                    +(d_ethnicity ? '<ethnicity>' + d_ethnicity + '</ethnicity>' : '')
                                    +(d_lang ? '<preferredLanguage>' + d_lang + '</preferredLanguage>' : '')
                                    +(d_race ? '<race>' + d_race + '</race>' : '')
                                    +'<Name>'
                                        +'<familyName>' + element.find('input[name="familyName"]').val() + '</familyName>'
                                        +'<givenName>' + element.find('input[name="givenName"]').val() + '</givenName>'
                                        +(n_middle ? '<middleName>' + n_middle + '</middleName>' : '')
                                        +(n_prefix ? '<prefix>' + n_prefix + '</prefix>' : '')
                                        +(n_suffix ? '<suffix>' + n_suffix + '</suffix>' : '')
                                    +'</Name>'
                                    +fon1
                                    +fon2
                                    +address
                                +'</Demographics>';
		
		// PUT it!
		var self = this;
		record.put_demographics(demographics,
			
			// success callback
			function(form, data, textStatus, xhr) {
				self.account.activeRecord.demographics = null;		// force re-fetching the thing
				self.showRecordInfo();
			},
			
			// error callback
			function(xhr, textStatus, error) {
				var error = 'responseText' in xhr ? xhr.responseText : textStatus;
				element.find('.error_area').first().show().text(error);
				element.find('.loader').first().hide();
				$('#update_demographics_submit').removeAttr('disabled');
			}
		);
		return false;
	},
	
	'#update_demographics_cancel click': function(element, event) {
		this.showRecordInfo();
	},
	
	/**
	 * Show the form to create a new record
	 */
	showRecordForm: function() {
		var ui_main = $('body').controllers('main')[0];
		if (!ui_main) {
			steal.dev.warn('There is no main controller attached to body');
			return;
		}
		
		var form = $.View('//ui/views/record/create');
		ui_main.tintInterface();
		ui_main.cleanAndShowAppDiv(form);
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
		var demographics = '<Demographics xmlns="http://indivo.org/vocab/xml/documents#">'
                                    +'<dateOfBirth>1939-11-15</dateOfBirth>'
                                    +'<gender>female</gender>'
                                    +'<email>' + el.find('input[name="email"]').val() + '</email>'
                                    +'<Name>'
                                        +'<familyName>' + el.find('input[name="familyName"]').val() + '</familyName>'
                                        +'<givenName>' + el.find('input[name="givenName"]').val() + '</givenName>'
                                    +'</Name>'
                                +'</Demographics>';
		
		UI.Models.Record.create(demographics, this.callback('didCreateNewRecord', el), this.callback('didNotCreateNewRecord', el));
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
		steal.dev.warn('Error handling not really implemented', errXhr);
		form.find('.error_area').first().text('Error');
		form.find('.loader').first().hide();
		$('#create_record_submit').removeAttr('disabled');
	}
});
