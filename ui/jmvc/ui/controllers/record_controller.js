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
		this.allRecords = {};
		
		var self = this;
				
		var colors = ['rgb(250,250,250)', 'rgb(242,246,255)', 'rgb(244,255,242)', 'rgb(250,242,255)', 'rgb(254,255,242)', 'rgb(255,248,242)', 'rgb(255,242,242)', 'rgb(255,242,251)'];
		
		// create records list, assign colors and add tabs
		this.account.get_records(function(records) {
			
			$(records).each(function(i, record) {
				record.bgcolor = colors[i];
				self.addTab(record, (0 == i));
			})
		
			self.allRecords = records;
			
			// load the first record
			if (self.allRecords.length > 0) {
				UI.Controllers.MainController.hasRecords();
				self.loadRecord(self.allRecords[0].record_id);
			}
			else {
				UI.Controllers.MainController.noRecords();
			}
		});
		
	},
	
	loadRecord: function(record_id) {
		var record = this.allRecords.match("record_id", record_id)[0];
		if (!record) {
			alert('Failed to load record "' + record_id + '": Not found');
			return;
		}
		else {
			this.account.attr("activeRecord", record);
		}
		
		// show/hide carenet owned options
		if (this.account.attr("activeRecord").carenet_id) {
			$('#record_owned_options').hide();
		}
		else {
			$('#record_owned_options').show();
		}
	},
	
	
	/**
	 * Adds a record tab
	 */
	addTab: function(account, selected) {
		var a = $('<a class="record_tab" href="javascript:void(0);" />').text(account.label);
		a.css('background-color', account.bgcolor);
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
			self.loadRecord(acc.record_id);
		});
		
		// add tab
		$('#record_tabs').append(a);
	}
});
