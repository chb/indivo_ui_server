/**
 * @tag controllers, home
 * 
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 *
 * Displays healthfeed
 *
 */
$.Controller.extend('UI.Controllers.Healthfeed',
/* @Static */
{
		onDocument: true,
		show: function() {
			ACCOUNT.get_healthfeed(function(notifications) {
				hf_items = _.map(notifications, function(n) {
					// refactor me (IE doesn't like @attr, among many other things)
					return {
						'received_at': n.received_at,
						'document': null,
						'id': n['@id'],
						'content': n.content,
						'sender': n.sender,
						'record': {
							'id': n.record['@id'],
							'label': n.record['@label']
						}
					}
				})
				
				$("#active_app_tabs").tabs('select', 0);
				$('#app_content').html($.View('//ui/views/healthfeed/show.ejs',{'notifications': hf_items}))
				$('#app_content_iframe').attr('src', 'about:blank').hide();
				$('#app_content').show();
			});
		}
},
/* @Prototype */
{
	ready: function(el, options){
		$('#healthfeed_li').bind('click', UI.Controllers.Healthfeed.show).click();
	}
});
