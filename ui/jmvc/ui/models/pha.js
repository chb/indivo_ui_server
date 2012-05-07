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

	model: function( data ) {
		// custom converter for incoming models
		data['app_id'] = data['id'];
		data["id"] = UI.UTILS.generateID();
		return this._super(data);
	},

	get_by_record: function( record_id, type, success, error ) {
		var url = this.apiBase() + 'records/' + encodeURIComponent(record_id) + '/apps/';
		if ( type ) {
			url += "?type=" + encodeURIComponent(type);
		}
		return $.ajax({
			url: url,
			type: 'get',
			dataType: 'json pha.models',
			success: success,
			error: error
		});
	},

	get_by_carenet: function( carenet_id, type, success, error ) {
		var url = this.apiBase() + 'carenets/' + encodeURIComponent(carenet_id) + '/apps/';
		if ( type ) {
			url += "?type=" + encodeURIComponent(type);
		}
		return $.ajax({
			url: url,
			type: 'get',
			dataType: 'json pha.models',
			success: success,
			error: error
		});
	},

	get_all: function( success, error ) {
		return $.ajax({
			url: this.apiBase() + 'apps/',
			type: 'get',
			dataType: 'json pha.models',
			success: success,
			error: error
		});
	},

	get: function( record_id, pha_id, success, error ) {
		var url = this.apiBase() + 'records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id);
		return $.ajax({
			url: url,
			type: 'get',
			dataType: 'json pha.model',
			success: success,
			error: error
		});
	},

	authorize_token: function( token, record_id, success ) {
		var postURL = '/oauth/authorize'; // should we really POST directly to OAuth?
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
	delete_pha: function( record_id, pha_id, success, error ) {
		return $.ajax({
			url: this.apiBase() + 'records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id),
			type: 'delete',
			success: success,
			error: error
		});
	},

	interpolate_url_template: function( url_template, vars ) {
		var result = url_template;
		$.each(vars, function( var_name, var_value ) {
			var regexp = new RegExp("{" + var_name + "}");
			result = result.replace(regexp, var_value);
		});
		return result;
	}
},

/* @Prototype */
{
	getImageSource: function() {
		return this.icon;
	},

	getStartURL: function( vars ) {
		return this.Class.interpolate_url_template(this.index, vars);
	},

	getManifest: function( context_vars ) {
		return {
			name: this.name,
			description: this.description,
			author: this.author,
			id: this.app_id,
			version: this.version,
			mode: this.mode,
			scope: this.scope,
			index: this.getStartURL(context_vars),
			icon: this.getImageSource()
		}
	}
});