/**
 * @tag controllers, home
 *
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 * Message Inbox.
 */
$.Controller.extend('UI.Controllers.Message',
/* @Static */
{

},
/* @Prototype */
{
	init: function() {
		this.messages = [];
		this.message = {};
		this.account = this.options.account;

		this.showMessageList();
	},
	
	showMessageList: function() {
		var self = this;

		this.account.get_inbox(function(messages) {
			self.messages = messages;
			// manually pass messages to view
			self.element.html($.View('//ui/views/message/show.ejs', {
				'messages' : messages
			}))
		});
	},
	
	showMessage: function(params) {
		var self = this;

		this.account.get_message(params.message_id, function(message) {
			self.message = message;

			// render one message template
			self.element.html($.View('//ui/views/message/one_message.ejs', {
				'message' : message
			}))
		});
	},
	".message_subject click": function(el, ev) {
		this.showMessage({
			message_id : ev.target.id
		});
	},
	".message_list click": function(el, ev) {
		this.showMessageList();
	},
	".attachment_accept click": function(el, ev) {
		if(!confirm('Are you sure you would like to accept this attachment within your record?')) {
			return;
		}
		var self = this;
		var attachment_num = ev.target.id.match(/attachment_(\d+)/)[1];
		var messageID = el.closest('.one_message').attr("id");
		this.account.accept_attachment(messageID, attachment_num, function() {
			self.showMessage({
				message_id : messageID
			});
			// reload one_message
		});
	}	
});
