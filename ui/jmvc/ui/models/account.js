/**
 * @tag models, home
 */
$.Model.extend('UI.Models.Account',
/* @Static */
{
  from_xml_node: function(xml_node) {
      return new UI.Models.Account({'account_id': $(xml_node).attr('id')});
  }
},
/* @Prototype */
/* magic attrs:
 * account_id
 */
{
    username: null,
    RECORDS: [],
    base_url: function() { return '/accounts/'+this.account_id; },
    /**
     * Retrieves account data
     * @param {Object} account_id
     * @param {Function} success a callback function that returns wrapped account objects.
     * @param {Function} error a callback function for an error in the ajax request.
     */
    load: function(account_id, success, error){
        if (!account_id) { alert('error in account model load()'); }
        this.account_id = account_id;

        // fixme: static fixtures not working? not calling "success" callback?
        // setup: fixture: "//ui/fixtures/accounts.xml.get"
        

        // testing dynamic fixtures - the functions defined here override the ajax callbacks below
        // they must return the appropriate same arguments that the corresponding ajax callbacks require
        // e.g
        // the standard "success" function takes (data, textStatus, and XMLHttpRequest) so the "success"
        // fixture must return an array of faked [data, textStatus, XMLHttpRequest]
        //
        // see http://api.jquery.com/jQuery.ajax/ for more
        //
        // callback details
        //
        // success(data, textStatus, XMLHttpRequest)
        // A function to be called if the request succeeds. The
        // function gets passed three arguments: The data returned
        // from the server, formatted according to the 'dataType'
        // parameter; a string describing the status; and the
        // XMLHttpRequest object (available as of jQuery 1.4).
        //
        // complete(XMLHttpRequest, textStatus)
        // The function gets passed two arguments: The
        // XMLHttpRequest object and a string categorizing the
        // status of the request ("success", "notmodified",
        // "error", "timeout", or "parsererror").

        $.fixture["-get"] = function(settings, callbackType){
          var xml_text = '<?xml version="1.0" encoding="utf-8" ?>\
                           <Account id="benadida@informedcohort.org">\
                             <fullName>Ben Adida</fullName>\
                             <contactEmail>ben@adida.net</contactEmail>\
                             <lastLoginAt>2010-09-22T16:09:30Z</lastLoginAt>\
                             <totalLoginCount>75</totalLoginCount>\
                             <failedLoginCount>0</failedLoginCount>\
                             <state>active</state>\
                             <lastStateChange>2010-09-22T20:09:30Z</lastStateChange>\
                             <authSystem name="password" username="benadida" />\
                           </Account>';

          var data = xml_doc_from_string(xml_text);
          var xhr = {responseText: xml_text};
          
          switch(callbackType){
            case "success":
              return [data, "success", xhr]
            case "complete":
              return [xhr,"success"]
          }
        };
        
        // todo: abstract this, but check the "this" referece in the callbacks 
        // (jmvc3 has the this.callback() function to help)
        $.ajax({
            url: '/indivoapi'+this.base_url(),
            dataType: 'xml',
            data: account_id,
            success: this.callback(function(data, textStatus, xhr){
              this.username = $(data).find('Account').find('authSystem').attr('username');
              this.get_records(function(records_list){ 
                ACCOUNT.RECORDS = records_list; 
                if (success) success();
              });
            }),
            error: error,
            fixture: "-get"
        });
    },
	
	get_name: function(callback) {
		// TODO: Implement me!!
		callback('Mr. Anonymous', 'success', null);
	},
	
    get_records: function(callback) {
      $.getXML(this.base_url() + '/records/', function(record_list) {
        // If we have stale tokens for this user, we'll get "Permission Denied" here
        // FIXME: handle that properly
        var lst = record_list.Records.Record;
        if (!(lst instanceof Array)) lst = [lst];
        callback($(lst).map(function(el_num, el) {return {'id': el['@id'], 'label': el['@label'], 'shared': el['@shared'] != null, 'carenet_id': el['@carenet_id']};}));
      });
    },
    
    get_healthfeed: function(callback) {
      $.getXML(this.base_url() + '/notifications/', function(notifications_xml) {
        // if there are no notifications, the notifications_xml object will
        // be {'Notifications': undefined}, need to check for this due to
        // differences in XML parsing across browsers (IE, cough)
        var notifications = null;
        if (notifications_xml.Notifications === undefined
            || !notifications_xml.Notifications.Notification) {
          notifications = [];
        } else {
          notifications = notifications_xml.Notifications.Notification;
        }
        if (!(notifications instanceof Array)) notifications = [notifications];
        callback(notifications);
      });
    },
    
    get_inbox: function(callback) {
      var _this = this;
      $.getXML(this.base_url() + '/inbox/', function(message_list) {
        var lst;
        try { lst = message_list.Messages.Message; }
        catch (e) {
          callback([]);
          return;
        }

        if (!lst) {
          callback([]);
          return;
        }

        callback($(lst).map(function(el_num, el) { return new UI.Models.Message({'account':_this, 'xml_el': el}); }));
      });
    },

    get_message: function(message_id, callback) {
      var _this = this;
      $.getXML(this.base_url() + '/inbox/' + encodeURIComponent(message_id), function(message) {
        var message;
        try { message = message.Message; }
        catch (e) { callback(null); }
        callback(new UI.Models.Message({'account':_this, 'xml_el': message}));
      });
    }
})