/**
 * @tag models, home
 */
$.Model.extend('UI.Models.Account',
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
		var url = 'indivoapi/accounts/'+ account_id;
		
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
	base_url: function() { return 'indivoapi/accounts/'+this.id; },
	
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
	
	get_records: function(success, error) {
		return $.ajax({
			url : this.base_url() + '/records/',
			type : 'get',
			dataType : 'record.models',
			success : success,
			error : error
		});

	},
	
	get_healthfeed: function(success, error) {
		return $.ajax({
			url : this.base_url() + '/notifications/',
			type : 'get',
			dataType : 'notification.models',
			success : success,
			error : error
		});
	},
	
	get_inbox: function(success, error) {
		return $.ajax({
			url : this.base_url() + '/inbox/',
			type : 'get',
			dataType : 'message.models',
			success : success,
			error : error
		});
	},
	
	get_message: function(message_id, success, error) {
		return $.ajax({
			url : this.base_url() + '/inbox/' + encodeURIComponent(message_id),
			type : 'get',
			dataType : 'message.model',
			success : success,
			error : error
		});
	},
	
	accept_attachment: function(message_id, attachment_num, success, error) {
		return $.ajax({
			url : this.base_url() + '/inbox/' + message_id + '/attachments/' + attachment_num + '/accept',
			type : 'post',
			success : success,
			error : error
		});
	}
	
});