/**
 * @tag models, home
 *
 * Wraps backend message services.
 * 
 */
$.Model.extend('UI.Models.Message',
/* @Static */
{
	models: function(data) {
		return this._super($(data).find("Message").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);
		var message = new this({
			'id': data.attr("id"),
			'sender': data.find("sender").text(),
			'received_at': data.find("received_at").text(),
			'read_at': data.find("read_at").text(),
			'archived_at': data.find("archived_at").text(),
			'subject': data.find("subject").text(),
			'body': data.find("body").text(),
			'severity': data.find("severity").text(),
			'record_id': data.find("record_id").text(),
			'sender': data.find("sender").text(),
			'attachments': []
		});
		data.find("attachment").each(function(i, attachment){
			attachment = $(attachment);
			message.attachments.push({"num":attachment.attr("num"), "type":attachment.attr("type"), "size":attachment.attr("size")})
		});
		return message;			
	}
},
/* @Prototype */
{
  
})