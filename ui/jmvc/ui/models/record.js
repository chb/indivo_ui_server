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
		var obj = new this({
			'record_id': data.attr("id"),
			'label': data.attr("label"),
			'carenet_id': data.attr("carenet_id"),
			'carenet_label': data.attr("carenet_label"),
			'shared': data.attr("shared")
		});
        obj.id = obj.record_id;
        if (obj.carenet_id != undefined) {
            obj.id = obj.carenet_id
        }
        return obj;
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
		});
	}
	
},
/* @Prototype */
{
	demographics: null,
	
	baseURL: function() {
        if (this.isCarenet()) {
            return this.Class.apiBase() + 'carenets/' + encodeURIComponent(this.id);
        }
		return this.Class.apiBase() + 'records/' + encodeURIComponent(this.id);	
	},

    isCarenet: function() {
        return this.carenet_id != undefined;
    },
	
	/**
	 * Fetches the record's demographics
	 * @param {success} callback function upon success
	 * @param {error} callback function upon failure
	 */
	get_demographics: function(success, error) {
		var self = this;
		$.ajax({
			url: this.baseURL() + '/demographics',
			data: {'response_format': 'application/json'},
			type: 'get',
			success: function(data, textStatus, jqXHR) {
				self.demographics = data.length > 0 ? data[0] : null;
				if (success) {
					success(data, textStatus, jqXHR);
				}
			},
			error: error
		});
	},
	
	/**
	 * Updates the record's demographics to the supplied XML value
	 * @param {demographics} A demographics document
	 * @param {success} callback function upon success
	 * @param {error} callback function upon failure
	 */
	put_demographics: function(demographics, success, error) {
		if (!demographics) {
			if (error) {
				error(null, 'error', 'Bad Request');
			}
			steal.dev.warn('You must supply XML to this call');
			return;
		}
		
		$.ajax({
			type: 'PUT',
			url: this.baseURL() + '/demographics',
			data: demographics,
			dataType: 'xml',
			contentType: 'application/xml',
			success: success,
			error: error
		});
	},
	
	
	//TODO: why is document_id here? (TF)
	get_carenets: function(document_id, success, error) {
		var url = '/carenets/';
		if (document_id != null) {
			url = '/documents/' + document_id + '/carenets/';
		}

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
	},
	
	
	// Utilities
	
	/**
	 * Composes a nice display name from all name parts
	 */
	formattedName: function() {
		if (this.demographics) {
			var names = new Array();
			if (this.demographics.name_prefix) {
				names.push(this.demographics.name_prefix);
			}
			if (this.demographics.name_given) {
				names.push(this.demographics.name_given);
			}
			if (this.demographics.name_middle) {
				names.push(this.demographics.name_middle);		// is this an array?
			}
			if (this.demographics.name_family) {
				names.push(this.demographics.name_family);
			}
			if (this.demographics.name_suffix) {
				names.push(this.demographics.name_suffix);		// add a comma before this?
			}
			
			if (names.length > 0) {
				return names.join(' ');
			}
		}
		else {
			steal.dev.warn('The demographics have not yet been fetched, returning the label');
		}
		return this.label ? this.label : 'Unknown';
	},
	
	/**
	 * Returns the birthday as a date object (if demographics have been fetched)
	 */
	dob: function() {
		if (!this.demographics || !'bday' in this.demographics) {
			return null;
		}
		
		var dob_parts = this.demographics.bday.split(/\D+/);
		var dob = new Date();
		dob.setYear(dob_parts[0]);
		dob.setMonth(dob_parts[1] - 1);
		dob.setDate(dob_parts[2]);
		
		return dob;
	},
	
	/**
	 * Returns the current age in years (if demographics have been fetched)
	 */
	age: function() {
		if (!this.demographics || !'bday' in this.demographics) {
			return 0;
		}
		
		var dob = this.dob();
		var today = new Date();
		
		age = today.getFullYear() - dob.getFullYear();
		var month = today.getMonth() - dob.getMonth();
		if (month < 0 || (month === 0 && today.getDate() < dob.getDate())) {
			age--;
		}
		return age;
	}
})
