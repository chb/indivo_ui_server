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
	/**
	 * Create a new record
	 */
	createNewRecord: function(sender) {
		alert("not implemented");
	}
},
/* @Prototype */
{
	init: function() {
		this.account = this.options.account;
		this.alertQueue = this.options.alertQueue;
		
		var self = this, 
			colors = ['rgb(250,250,250)', 'rgb(242,246,255)', 'rgb(244,255,242)', 'rgb(250,242,255)', 'rgb(254,255,242)', 'rgb(255,248,242)', 'rgb(255,242,242)', 'rgb(255,242,251)']; //TODO: greater than 8 records will cause errors
		
		// load records, assign colors and add tabs
		this.account.get_records(function(records) {
			for (var i=0; i< records.length; i++) {
				records[i].bgcolor = colors[i];
				self.addTab(records[i], (0 == i));
			}
			// load the first record
			if(records.length > 0) {
				UI.Controllers.MainController.hasRecords();
				self.loadRecord(records[0]);
			} else {
				UI.Controllers.MainController.noRecords();
			}
		},
		function() {
			self.alertQueue.push(new UI.Models.Alert({text:"Sorry, but we were not able to load your records. Please try again later", level:"error"}));
		});
	},

	loadRecord: function(record) {
		this.account.attr("activeRecord", record);
		
		// show/hide carenet owned options
		if (record.carenet_id) {
			$('#record_owned_options').hide();
		}
		else {
			$('#record_owned_options').show();
		}
	},
	
	".record_tab click": function(el, ev) {
		var record = $(el).model();
		if (record) {
			// tab functionality
			$('#record_tabs').find('a').removeClass('selected');
			$(el).addClass('selected');
			
			// set background color
			$('#app_selector .selected, #app_content, #app_content_iframe').animate({
				backgroundColor : record.bgcolor
			}, 1000);
			
			// make sure the iframe is hidden and the div is shown
			$('#app_content_iframe').attr('src', 'about:blank').hide();
			$('#app_content').show();
			
			// fire!
			this.loadRecord(record);
		}
	},

	/**
	 * Add a record tab
	 */
	addTab: function(record, selected) {
		// TODO: replace with a listener for changes to a List of Records on the Account when JMVC merges Observable into Model 
		// append tab to existing list
		$('#record_tabs').append($.View("//ui/views/record/show_tab", {record:record, selected:selected, color:record ? record.bgcolor : 'rgb(250,250,250)'}));
	}
});
