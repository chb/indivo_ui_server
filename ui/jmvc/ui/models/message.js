/**
 * @tag models, home
 *
 * Wraps backend message services.
 * 
 */
$.Model.extend('UI.Models.Message',
/* @Static */
{},
/* @Prototype */
{
  init: function(args){
    var xml_el = args.xml_el;
    this.account = args.account;
    this.id = xml_el['@id'];
    this.sender = xml_el['sender'];
    this.received_at = xml_el['received_at'];
    this.read_at = xml_el['read_at'];
    this.archived_at = xml_el['archived_at'];
    this.severity = xml_el['severity'];
    this.subject = xml_el['subject'];
    this.body = xml_el['body'];

    if (xml_el['record']) { this.about_record_id = xml_el['record']['@id']; }
    else { this.about_record_id = null; }

    var _this = this;
    var record = _.detect(ACCOUNT.RECORDS, function(record){ return record.id === _this.about_record_id; });
    this.record_label = record.label;

    // attachments
    this.attachments = [];
    if (!xml_el['attachment']){ return; }
    else {
      var attachments = xml_el['attachment'];
      if (!attachments.length) { attachments = [attachments]; }
      $(attachments).each(function(i, attachment) {
        _this.attachments[i] = {'type': attachment['@type'], 'size': attachment['@size'], 'num': attachment['@num']};
      });
    }
  },

  accept_attachment: function(attachment_num, callback) {
    indivo_api_call("POST",
                    this.account.base_url() + '/inbox/' + this.id + '/attachments/' + attachment_num + '/accept',
                    null,
                    callback);
  }
})