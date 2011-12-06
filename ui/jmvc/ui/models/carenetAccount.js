/**
 * @tag models, home
 */
UI.Models.IndivoBase.extend('UI.Models.CarenetAccount',
/* @Static */
{
	models: function(data) {
		return this._super($(data).find("CarenetAccount").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);
		return new this({
			'id': data.attr("id"),
			'fullName': data.attr("fullName"),
			'write': data.attr("write")
		});	
	}
},
/* @Prototype */
{});