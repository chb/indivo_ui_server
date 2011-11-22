/**
 * @tag models, home
 * 
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 */
$.Model.extend('UI.Models.PHA',
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
		var url = 'indivoapi/records/' + encodeURIComponent(record_id) + '/apps/';
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
		var url = 'indivoapi/carenets/' + encodeURIComponent(carenet_id) + '/apps/';
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
			url : 'indivoapi/apps/',
			type : 'get',
			dataType : 'pha.models',
			success : success,
			error : error
		});
	},
	
	get: function(record_id, pha_id, success, error) {
		var url = 'indivoapi/records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id);
		return $.ajax({
			url : url,
			type : 'get',
			dataType : 'pha.model',
			success : success,
			error : error
		});
	},
	
	enable_pha: function(record_id, pha, success, error) {
		var startURL = this.interpolate_url_template(pha.startURLTemplate, {'record_id' : record_id, 'carenet_id': ''});
		$.ajax({
			type: 'get',
			url: startURL,
			dataType: 'json',			// the response does NOT get parsed - because of the redirect? Anyway, just parse data.responseText in the callback
			success: success,
			error: error
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
	
	delete_pha: function(record_id, pha_id, success, error) {
		return $.ajax({
			url : 'indivoapi/records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id),
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
		//TODO: based purely on browser's implementation of Math.random with no timestamp component, so look into better option if collisions appear
		var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
		this.attr("id", id);
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