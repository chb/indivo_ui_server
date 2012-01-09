/**
 * @tag models, home
 * 
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 */
UI.Models.IndivoBase.extend('UI.Models.PHA',
/* @Static */
{
	models: function(data) {
		return this._super($(data).find("App").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);
		return new this({
			'app_id': data.attr("id"),
			'startURLTemplate': data.find("startURLTemplate").text(),
			'name': data.find("name").text(),
			'description': data.find("description").text(),
			'autonomous': ("True" === data.find("autonomous").text()),
			'autonomousReason': data.find("autonomousReason").text(),
			'frameable': ("True" === data.find("frameable").text()),
			'ui': ("True" === data.find("ui").text())
		});	
	},
	
	get_by_record: function(record_id, type, success, error) {
		var url = this.apiBase() + 'records/' + encodeURIComponent(record_id) + '/apps/';
		if (type) { url += "?type=" + encodeURIComponent(type); }
		return $.ajax({
			url: url,
			type: 'get',
			dataType: 'pha.models',
			success: success,
			error: error
		});
	},
	
	get_by_carenet: function(carenet_id, type, success, error) {
		var url = this.apiBase() + 'carenets/' + encodeURIComponent(carenet_id) + '/apps/';
		if(type) {
			url += "?type=" + encodeURIComponent(type);
		}
		return $.ajax({
			url : url,
			type : 'get',
			dataType : 'pha.models',
			success : success,
			error : error
		});
	},

	get_all: function(success, error) {
		return $.ajax({
			url : this.apiBase() + 'apps/',
			type : 'get',
			dataType : 'pha.models',
			success : success,
			error : error
		});
	},
	
	get: function(record_id, pha_id, success, error) {
		var url = this.apiBase() + 'records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id);
		return $.ajax({
			url : url,
			type : 'get',
			dataType : 'pha.model',
			success : success,
			error : error
		});
	},
	
	authorize_token: function(token, record_id, success) {
		var postURL = '/oauth/authorize';		// should we really POST directly to OAuth?
		var dict = {
			'oauth_token': token,
			  'record_id': record_id
		};
		$.ajax({
			type: 'post',
			url: postURL,
			data: dict,
			complete: success
		});
	},
	
	//TODO: move to Record
	delete_pha: function(record_id, pha_id, success, error) {
		return $.ajax({
			url : this.apiBase() + 'records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id),
			type : 'delete',
			success : success,
			error : error
		});
	},

	interpolate_url_template: function(url_template, vars) {
		var result = url_template;
		$.each(vars, function(var_name, var_value) {
			var regexp = new RegExp("{" + var_name + "}");
			result = result.replace(regexp, var_value);
		});
		return result;
	}
},

/* @Prototype */
{
	setup: function(attributes) {
		// TODO: move to utils? (TF)
		// we add in a surrogate id here since the one used by Indivo contains characters that are not compatible with the way JMVC ties
		// models to elements by using their id in a class name
		this.attr("id", UI.UTILS.generateID());
		this._super(attributes);
	},

	getImageSource: function() {
		var img_name = this.name.toLowerCase().replace(/ +/, '_');
		return "/jmvc/ui/resources/images/app_icons_32/" + img_name + ".png";
	},
	
	getStartURL: function(vars) {
		return this.Class.interpolate_url_template(this.startURLTemplate, vars);
	}
	
});