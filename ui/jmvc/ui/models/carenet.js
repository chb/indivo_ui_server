/**
 * @tag models, home
 * Wraps backend carenet services.
 */
$.Model.extend('UI.Models.Carenet',
/* @Static */
{
	from_xml_node: function(record_id, xml_node) {
		return new UI.Models.Carenet({
			'record_id': record_id,
			'carenet_id': $(xml_node).attr('id'),
			'name': $(xml_node).attr('name'),
			'accounts': []
		});
	},
	
	from_json: function(record_id, json) {
		var rec_id = record_id ? record_id : json.record_id;
		return new UI.Models.Carenet({
			'record_id': rec_id,
			'carenet_id': json.carenet_id,
			'name': json.name,
			'accounts': json.accounts,
			'has_default_name': json.has_default_name
		});
	}
},
/* @Prototype */
/* magic attrs:
	 record_id
	 carenet_id
	 name
 */
{
	delete: function(callback, error) {
        $.ajax({
			type: 'delete',
			url: '/carenets/' + this.carenet_id,
			success: callback,
			error: error
		});
    },
	
    rename: function(new_name, callback, error) {
    	var self = this;
        $.ajax({
			type: 'post',
			url: '/carenets/' + this.carenet_id + '/rename',
			data: {'name': new_name},
			dataType: 'json',
			success: function(data, textStatus, xhr) {
				self.name = data.name;
				if (callback) {
					callback(self, textStatus, xhr);
				}
			},
			error: error
		});
    },
    
	get_people: function(callback) {
		indivo_api_call("GET", '/carenets/' + this.carenet_id + '/accounts/', null, function(result) {
			var account_objects_list = $(result).find('CarenetAccount').map(function(i, account_xml_node) {
				return UI.Models.Account.from_xml_node(account_xml_node);
			})
			callback(account_objects_list);
		})
	},
	
	/*
	 *	PHA handling
	 */
	add_pha: function(pha, callback) {
		indivo_api_call("PUT", '/carenets/' + this.carenet_id + '/apps/' + encodeURIComponent(pha.id), null, callback);
	},
	
	remove_pha: function(pha, callback) {
		indivo_api_call("DELETE", '/carenets/' + this.carenet_id + '/apps/' + encodeURIComponent(pha.id), null, callback);
	},
	
	
	/*
	 *	account handling
	 */
	add_account: function(account_id, callback) {
		indivo_api_call("POST", '/carenets/' + this.carenet_id + '/accounts/', {'account_id' : account_id, 'write': 'true'}, callback);
	},
	
	remove_account: function(account_id, callback) {
		indivo_api_call("DELETE", '/carenets/' + this.carenet_id + '/accounts/' + encodeURIComponent(account_id), null, callback);
	}
})
