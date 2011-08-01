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
  onDocument: true,
  messages: [],
  message: {},
  check_interval_seconds: 10,
  show: function() {
    ACCOUNT.get_inbox(function(messages) {
      UI.Controllers.Message.messages = messages;
      // manually pass messages to view
      $('#app_content').html($.View('//ui/views/message/show.ejs', {'messages': messages})) 
      $('#app_content_iframe').attr('src', 'about:blank').hide();
      $('#app_content').show();
      $('.message_subject').click(function(evt) {
        UI.Controllers.Message.one_message({message_id: evt.target.id});
      });
    })
  },
  one_message: function(params) {
    // "this" is the class
    var _this = this;
    _this.params = params;
    
    ACCOUNT.get_message(params.message_id, function(message) {
      _this.message = message;

      // render one message template
      $('#app_content').html($.View('//ui/views/message/one_message.ejs', {'message': message}))

      // attach click handlers
      $('.message_list').click(function() { UI.Controllers.Message.show(); });
      $('.attachment_accept').click(function(evt) {
        if (!confirm('Are you sure you would like to accept this attachment within your record?'))
        return;

        var attachment_num = evt.target.id.match(/attachment_(\d+)/)[1];
        _this.message.accept_attachment(attachment_num, function() {
          UI.Controllers.Message.one_message(_this.params); // reload one_message
        });
      });
    });
  }
},
/* @Prototype */
{
  /**
   * Attach the click event to the inbox tab
   */
  load: function(el, options){
    $('#inbox_li').bind('click', UI.Controllers.Message.show); // use basic jquery .bind
    if (ACCOUNT.RECORDS.length == 0) { _.delay(this._update_inbox_tab, 500); }
    else { this._update_inbox_tab(); }
  },
  /**
   * show number of unread messages on icon and line
   */
   _update_inbox_tab: function(){
     var _inner = function(){
       ACCOUNT.get_inbox(function(messages) {
         var n_unread = _(messages).select(function(m){ if (typeof(m.read_at) === 'undefined') return m; }).length;

         // alter img src
         var img = $('#inbox_li img');
         if (n_unread > 0 && n_unread < 10) {
           img.attr('src', img.attr('src').match(/\/.*\//) + 'inbox_' + n_unread + '.png');
         } else if (n_unread >= 10) {
           img.attr('src', img.attr('src').match(/\/.*\//) + 'inbox_9_plus.png')
         } else {
           img.attr('src', img.attr('src').match(/\/.*\//) + 'inbox.png')
         }

         // alert link text
         var a = $('#inbox_li a');
         if (n_unread > 0) { a.text('Inbox ('+n_unread+')') }
         else { a.text('Inbox') }

         a.prepend(img)
       })
       // todo: make sure this doesn't leak memory. Check Resig's book.
       _.delay(_inner, UI.Controllers.Message.check_interval_seconds * 1000); // poll every couple of seconds
     }
     _inner();
   }
});