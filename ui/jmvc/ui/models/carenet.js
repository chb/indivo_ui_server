/**
 * @tag models, home
 * Wraps backend carenet services.
 */
$.Model.extend('UI.Models.Carenet',
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
			'mode': data.attr("explicit")
		});	
	}
},
/* @Prototype */
{
	destroy: function(success, error) {
        $.ajax({
			type: 'delete',
			url: 'indivoapi/carenets/' + this.id,
			success: success,
			error: error
		});
    },
	
    rename: function(new_name, success, error) {
    	var self = this;
        $.ajax({
			type: 'post',
			url: 'indivoapi/carenets/' + this.id + '/rename',
			data: {'name': new_name},
			dataType: 'carenet.models',  // single values are wrapped in a <Carenets> element
			success: function(data, textStatus, xhr) {
				self.name = data[0].name;
				if (success) {
					success(self, textStatus, xhr);
				}
			},
			error: error
		});
    },
    
	get_people: function(success, error) {
		return $.ajax({
			url: 'indivoapi/carenets/' + this.id + '/accounts/',
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
			url: 'indivoapi/carenets/' + this.id + '/apps/' + encodeURIComponent(pha.app_id),
			type: 'put',
			success: success,
			error: error
		});
	},
	
	remove_pha: function(pha, success, error) {
		return $.ajax({
			url: 'indivoapi/carenets/' + this.id + '/apps/' + encodeURIComponent(pha.app_id),
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
			url: 'indivoapi/carenets/' + this.id + '/accounts/',
			type: 'post',
			data: {'account_id' : account_id, 'write': 'true'},
			success: success,
			error: error
		});
	},
	
	remove_account: function(account_id, success, error) {
		return $.ajax({
			url: 'indivoapi/carenets/' + this.id + '/accounts/' + encodeURIComponent(account_id),
			type: 'delete',
			success: success,
			error: error
		});
	}
})
