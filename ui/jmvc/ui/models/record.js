/**
 * @tag models, home
 * Wraps backend record services.
 */
$.Model.extend('UI.Models.Record',
/* @Static */
{
	models: function(data) {
		return this._super($(data).find("Record").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);
		return new this({
			'record_id': data.attr("id"),
			'label': data.attr("label")
		});	
	},
	
	findOne: function(id, success, error) {
		var url = 'indivoapi/records/' + encodeURIComponent(id);
		
		return $.ajax({
			url: url,
			type: 'get',
			dataType: 'record.model',
			success: success,
			error: error
		});
	}
	
},
/* @Prototype */
{
	//TODO: why is document_id here? (TF)
	get_carenets: function(document_id, success, error) {
		var base_url = 'indivoapi/records/' + encodeURIComponent(this.record_id);
		var url = '/carenets/';
		if (document_id != null) url = '/documents/' + document_id + '/carenets/';

		return $.ajax({
			url: base_url + url,
			type: 'get',
			dataType: 'carenet.models',
			success: success,
			error: error
		});
	},

	create_carenet: function(name, callback, error) {
		$.ajax({
			type: 'post',
			url: '/records/' + this.record_id + '/carenets/',
			data: {'name': name},
			dataType: 'carenet.model',
			success: callback,
			error: error
		});
	}
})
