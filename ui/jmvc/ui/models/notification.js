/**
 * @tag models, home
 */
UI.Models.IndivoBase.extend('UI.Models.Notification',
/* @Static */
{
	attributes: {
		received_at: 'date'
	},
	
	models: function(data) {
		return this._super($(data).find("Notification").toArray());
	},
	
	model: function(data) {
		// custom converter for this model
		data = $(data);
		var notification = new this({
			'id': data.attr("id"),
			'fullName': data.attr("fullName"),
			'sender': data.find("sender").text(),
			'received_at': data.find("received_at").text(),
			'content': data.find("content").text(),	
			'record': {id:data.find("record").attr("id"), "label": data.find("record").attr("label")}		
		});	
		
		var document = data.find("document");
		if (document) {
			notification.attr("document", {id:document.attr("id"), label:document.attr("label")})
		}
		
		return notification;
	}
},
/* @Prototype */
{});