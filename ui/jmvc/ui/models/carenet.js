/**
 * @tag models, home
 * Wraps backend carenet services.
 */
UI.Models.IndivoBase.extend('UI.Models.Carenet',
/* @Static */
{
	models: function(data) {
		return this._super($(data).find("Carenet").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);
		return new this({
			'id': data.attr("id"),
			'name': data.attr("name"),
			'has_default_name': data.attr("has_default_name"),		///< @attention This will only be set when creating a new carenet
			'mode': data.attr("explicit")
		});	
	}
},
/* @Prototype */
{
	baseURL: function() {
		return this.Class.apiBase() + 'carenets/' + this.id;	
	},
	
	destroy: function(success, error) {
        $.ajax({
			type: 'delete',
			url: this.baseURL(),
			success: success,
			error: error
		});
    },
	
    rename: function(new_name, success, error) {
    	var self = this;
        $.ajax({
			type: 'post',
			url: '/carenets/' + this.id + '/rename',
			data: {'name': new_name},
			dataType: 'carenet.models',  // single values are wrapped in a <Carenets> element
			success: function(data, textStatus, xhr) {
				self.name = (data && data.length > 0) ? data[0].name : self.name;
				if (success) {
					success(textStatus, xhr);
				}
			},
			error: error
		});
    },
    
	get_accounts: function(success, error) {
		return $.ajax({
			url: this.baseURL() + '/accounts/',
			type: 'get',
			dataType: 'carenet_account.models',
			success: success,
			error: error
		});
	},
	
	/*
	 *	PHA handling
	 */
	add_pha: function(pha, success, error) {
		return $.ajax({
			url: this.baseURL() + '/apps/' + encodeURIComponent(pha.app_id),
			type: 'put',
			success: success,
			error: error
		});
	},
	
	remove_pha: function(pha, success, error) {
		return $.ajax({
			url: this.baseURL() + '/apps/' + encodeURIComponent(pha.app_id),
			type: 'delete',
			success: success,
			error: error
		});
	},
	
	/*
	 *	account handling
	 */
	add_account: function(account_id, success, error) {
		return $.ajax({
			url: this.baseURL() + '/accounts/',
			type: 'post',
			data: {'account_id' : account_id, 'write': 'true'},
			success: success,
			error: error
		});
	},
	
	remove_account: function(account_id, success, error) {
		return $.ajax({
			url: this.baseURL() + '/accounts/' + encodeURIComponent(account_id),
			type: 'delete',
			success: success,
			error: error
		});
	}
})
