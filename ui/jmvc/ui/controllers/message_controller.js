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
		this.alertQueue = this.options.alertQueue;
		this.showMessageList();
	},
	
	showMessageList: function() {
		var self = this;

		this.account.get_inbox(function(messages) {
			// refresh unread message count
			// TODO: Once we move the indox to a non-record specific area, allow message controller to use a Message List for showing unread counts, etc
			UI.Controllers.MainController.update_inbox_tab(messages); 
			self.messages = messages;
			// manually pass messages to view
			self.account.get_record_labels(function(labels) {
				self.element.html($.View('//ui/views/message/show.ejs', {
					'messages': messages,
					'account': self.account,
					'labels': labels  
				}));
			});
		});
	},
	
	showMessage: function(params) {
		var self = this;

		this.account.get_message(params.message_id, function(message) {
			// mark this message as read in our existing list  TODO: see todo in showMessageList
			self.messages.get(params.message_id)[0].read_at = new Date;
			UI.Controllers.MainController.update_inbox_tab(self.messages); 
			
			self.message = message;

			// render one message template
			self.element.html($.View('//ui/views/message/one_message.ejs', {
				'message': message,
				'account': self.account
			}))
		});
	},
	
	".message click": function(el, ev) {
		this.showMessage({
			message_id : el.model().id
		});
	},
	".message_list click": function(el, ev) {
		this.showMessageList();
	},
	
	".archive click": function(el, ev) {
		self = this;
		messageElement = $(el.closest('.message'));
		message = messageElement.model();
		message.archive(self.account,
			// success 
			function(data, textStatus, jqXHR) {
				// remove message from table, and refresh even/odd classes 
				tableElement = messageElement.closest('table');
				messageElement.fadeOut("slow", function() {
					messageElement.remove()
					tableElement.find('tr').filter(":even").addClass("even").removeClass("odd");
					tableElement.find('tr').filter(":odd").addClass("odd").removeClass("even");
				});
			},
			// error 
			function() {
				self.alertQueue.push(new UI.Models.Alert({
					text : "Sorry, but we were not able to delete your message. Please try again later",
					level : "error"
				}));
		});
		return false;
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
				})
			}, function(jqXHR, textStatus, errorThrown) {
				alert(textStatus + ': ' + errorThrown);
		});
	}
});
