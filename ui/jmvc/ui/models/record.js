/**
 * @tag models, home
 * Wraps backend record services.
 */
$.Model.extend('UI.Models.Record',
/* @Static */
{
    /**
     * Retrieves one record.
     * @param {String} record_id
     * @param {String} carenet_id 
     * @param {Function} callback
     */
     get: function(record_id, carenet_id, callback) {
         var base_url = '/records/' + encodeURIComponent(record_id);

        // with a carenet, replace the base URL
        if (carenet_id) {
            base_url = "/carenets/" + carenet_id;
            return callback(new UI.Models.Record({
              'record_id': record_id,
              'label': 'No Label',
              'demographics': null,
              'carenet_id': carenet_id,
              'base_url': base_url}));
        }

        $.getXML(base_url, function(result) {
            var r = new UI.Models.Record({
              'record_id': record_id, 
              'label': result.Record['@label'],
              'demographics': result.Record.demographics,
              'base_url': base_url,
              'carenet_id': carenet_id
              })
            callback(r);
        });
    }
},
/* @Prototype */
{
    /**
     * magic attrs automatically added:
     * record_id: null,
     * label: null,
     * demographics: null,
     * base_url: null,
     * carenet
     */
    get_document_list: function(tags, callback) {
        $.getXML(this.base_url + '/documents/', function(doc_list) {
            callback(doc_list);
        });
    },
    
    get_carenets: function(document_id, callback) {
        var url = '/carenets/';
        if (document_id != null) url = '/documents/' + document_id + '/carenets/';

        var _this = this;
        indivo_api_call("GET", this.base_url + url, null, function(result) {
            var carenets_xml = $(result).find('Carenets').find('Carenet');
            callback(carenets_xml.map(function(i, carenet_xml_node) {
                return UI.Models.Carenet.from_xml_node(_this.record_id, carenet_xml_node);
            }));
        });
    },

    create_carenet: function(name, callback, error) {
    	$.ajax({
    		type: 'post',
    		url: '/records/' + this.record_id + '/carenets/',
    		data: {'name': name},
    		dataType: 'json',
    		success: callback,
    		error: error
    	});
    },

    remove_carenet: function(carenet_id, callback) {
        indivo_api_call('DELETE', '/carenets/'+carenet_id, {}, callback);
    },
	
	// TODO: Move this to carenet.js and check return value! (currently always returns 'success')
    rename_carenet: function(carenet_id, name, callback) {
        indivo_api_call('POST', '/carenets/'+carenet_id+'/rename', {'name': name}, callback);
    }
})
