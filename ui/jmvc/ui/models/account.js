/**
 * @tag models, home
 */
UI.Models.IndivoBase.extend('UI.Models.Account',
/* @Static */
{
	models: function(data) {
		return this._super($(data).find("Account").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);  
		return new this({
			'id': data.find("Account").attr("id"),
			'fullName': data.find("fullName").text(),
			'contactEmail': data.find("contactEmail").text(),
			'lastLoginAt': data.find("lastLoginAt").text(),
			'lastStateChange': data.find("lastStateChange").text(),
			'state': data.find("state").text(),
			'totalLoginCount': data.find("totalLoginCount").text()
		});	
	},
	
	findOne: function(account_id, success, error) {
		var url = this.apiBase() + 'accounts/'+ account_id;
		
		return $.ajax({
			url: url,
			type: 'get',
			dataType: 'account.model',
			success: success,
			error: error
		});
	}
},
/* @Prototype */
{
	baseURL: function() {
		return this.Class.apiBase() + 'accounts/' + this.id;
	},
	
	// Relies on the UI server to use its credentials to retrieve the name attached to an account
	get_name: function(callback) {
		$.ajax({
			url: '/accounts/'+this.id + '/name',
			dataType: 'json',
			success: this.callback(function(data, textStatus, xhr) {
				var status = data.error ? 'error' : 'success';
				var value = ('success' == status) ? (data.name ? data.name : data.account_id) : data.error;
				callback(value, status, null);
			})
		});
	},
	
	/**
	 * Retrieve records associated with this Account.
	 */ 
	get_records: function(success, error) {
		var self = this;
		return $.ajax({
			url : this.baseURL() + '/records/',
			type : 'get',
			dataType : 'record.models',
			success : function(records) {
				// store off cached copy for record label resolution
				self.records = records;
				if(success) {
					success(records);
				}
			},
			error : error
		});
	},

	get_record_label: function(record_id) {
		if(record_id != null && record_id !== "") {
			var self = this;
			if(!this.records) {
				this.get_records(function() {
					var record = self.records.get(record_id)[0];
					return (record) ? record.label : null;
				});
			} else {
				var record = self.records.get(record_id)[0];
				return (record) ? record.label : null;
			}
		} else {
			return null;
		}
	},
	
	get_record_labels: function(success, error) {
		var self = this;
			if(!this.records) {
				this.get_records(function() {
					return self.get_record_labels(success, error);
				});
			} else {
				success($.map( this.records, function(record, index){ 
					return record.label
					})
				);
			}
	},
	
	has_record: function(record_id) {
		return (this.records.get(record_id).length > 0) ? true : false; 
	},
	
	get_healthfeed: function(success, error) {
		return $.ajax({
			url : this.baseURL() + '/notifications/',
			type : 'get',
			dataType : 'notification.models',
			success : success,
			error : error
		});
	},
	
	get_inbox: function(success, error) {
		return $.ajax({
			url : this.baseURL() + '/inbox/',
			type : 'get',
			dataType : 'message.models',
			success : success,
			error : error
		});
	},
	
	get_message: function(message_id, success, error) {
		return $.ajax({
			url : this.baseURL() + '/inbox/' + encodeURIComponent(message_id),
			type : 'get',
			dataType : 'message.model',
			success : success,
			error : error
		});
	},
	
	accept_attachment: function(message_id, attachment_num, success, error) {
		return $.ajax({
			url : this.baseURL() + '/inbox/' + message_id + '/attachments/' + attachment_num + '/accept',
			type : 'post',
			success : success,
			error : error
		});
	}
	
});