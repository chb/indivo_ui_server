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
  single_callback: function(callback) {
    var ajax_callback = function(result) {
      var pha = result.App;
      callback(new UI.Models.PHA({'id': pha['@id'], 'data': pha}));
    };
    return ajax_callback;
  },

  multi_callback: function(callback) {
    ajax_callback = function(result) {
      var pha_list = result.Apps;
      if (pha_list == null) {
        callback([]);
        return;
      }

      var phas = pha_list.App;

      // for consistency
      if (!(phas instanceof Array)) { phas = [phas]; }
      
      var pha_objs = $(phas).map(function(i, pha) { return new UI.Models.PHA({'id': pha['@id'], 'data': pha}); });
      callback(pha_objs);
    };
    return ajax_callback;
  },

  get_by_record: function(record_id, type, callback) {
    var url = '/records/' + encodeURIComponent(record_id) + '/apps/';
    if (type) { url += "?type=" + encodeURIComponent(type); }
    $.getXML(url, this.multi_callback(callback));
  },

  get_by_carenet: function(carenet_id, type, callback) {
    var url = '/carenets/' + encodeURIComponent(carenet_id) + '/apps/';
    if (type) { url += "?type=" + encodeURIComponent(type); }
    $.getXML(url, this.multi_callback(callback));
  },

  get_all: function(callback) { $.getXML('/apps/', this.multi_callback(callback)); },

  get: function(record_id, pha_id, callback) {
    var url = '/records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id);
    $.getXML(url, this.single_callback(callback));
  },
  
  delete_pha: function(record_id, pha_id, callback) {
    indivo_api_call('delete',
                    '/records/' + encodeURIComponent(record_id) + '/apps/' + encodeURIComponent(pha_id),
                    {},
                    callback);
    }
},

/* 
  @Prototype 

  magic attrs:
  id,
  data
  data.framable
  data.ui
*/
{})