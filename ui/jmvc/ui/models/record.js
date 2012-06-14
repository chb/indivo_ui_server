/**
 * @tag models, home
 * Wraps backend record services.
 */
UI.Models.IndivoBase.extend('UI.Models.Record',
/* @Static */
{
	models: function(data) {
		return this._super($(data).find("Record").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);
		return new this({
			'id': data.attr("id"),
			'label': data.attr("label"),
			'carenet_id': data.attr("carenet_id"),
			'carenet_label': data.attr("carenet_label"),
			'shared': data.attr("shared")
		});	
	},
	
	findOne: function(id, success, error) {
		var url = this.apiBase() + 'records/' + encodeURIComponent(id);
		
		return $.ajax({
			url: url,
			type: 'get',
			dataType: 'record.model',
			success: success,
			error: error
		});
	},
	
	/**
	 * Creates a new record
	 * @param {demographics} A demographics document
	 * @param {callback} callback function upon success
	 * @param {error} callback function upon failure
	 */
	create: function(demographics, callback, error) {
		$.ajax({
			type: 'post',
			url: '/records/',
			data: demographics,
			dataType: 'xml',
			success: callback,
			error: error
		})
	}
	
},
/* @Prototype */
{
	baseURL: function() {
		return this.Class.apiBase() + 'records/' + encodeURIComponent(this.id);	
	},
	
	//TODO: why is document_id here? (TF)
	get_carenets: function(document_id, success, error) {
		var url = '/carenets/';
		if (document_id != null) url = '/documents/' + document_id + '/carenets/';

		return $.ajax({
			url: this.baseURL() + url,
			type: 'get',
			dataType: 'carenet.models',
			success: success,
			error: error
		});
	},
	
	//TODO: move to Static
	create_carenet: function(name, callback, error) {
		$.ajax({
			type: 'post',
			url: '/records/' + this.id + '/carenets/',
			data: {'name': name},
			dataType: 'carenet.model',
			success: callback,
			error: error
		});
	},
	
	enable_app: function(app_id, success, error) {
		$.ajax({
			type: 'put',
			url: this.baseURL() + '/apps/' + app_id,
			success: success,
			error: error
		});
	}
})
