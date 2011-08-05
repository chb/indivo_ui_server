{% load i18n %}
/**
 * @tag controllers, home
 *
 * Carenet a.k.a "sharing" Controller
 * 
 * @author Pascal Pfiffner (pascal.pfiffner@childrens.harvard.edu)
 * @author Arjun Sanyal (arjun.sanyal@childrens.harvard.edu)
 * @author Ben Adida (ben.adida@childrens.harvard.edu)
 */
$.Controller.extend('UI.Controllers.Carenet',
/* @Static */
{ 
	onDocument: true,
	record: {},
	accounts: [],
	carenets: [],
	
	/**
	 * Show and manipulate carenets for this record
	 */
	
	create_carenet: function(name) {
		UI.Models.Record.get(UI.Controllers.Record.activeRecord.record_id, null, function(record) {
			record.create_carenet(name);
		})
		return false;
	},
	
	remove_carenet: function(carenet_id, carenet_name) {
		if (confirm('Are you sure you want to remove the ' + carenet_name + ' carenet?')) {
			UI.Models.Record.get(UI.Controllers.Record.activeRecord.record_id, null, function(record) {
				record.remove_carenet(carenet_id);
			})
		}
		return false;
	},
	
	rename_carenet: function(carenet_id, name) {
		UI.Models.Record.get(UI.Controllers.Record.activeRecord.record_id, null, function(record) {
			record.rename_carenet(carenet_id, name);
		})
		return false;
	},
	
	remove_account: function(carenet_id, account_id) {
		var carenet = this.get_carenet(carenet_id);
		if (confirm('Are you sure you want to remove ' + account_id + ' ?')) { carenet.remove_account(account_id); }
		return false;
	},
	
	addAccountToCarenet: function(account, carenet, controller) {
		if (account && carenet) {
			carenet.add_account(account.id, function(data, controller) {
				if ($(data).find('ok').length !== 1) {
					//'{% trans "Could not add ' + account.fullName + ' to the carenet, please try again" %}'
				}
			});
		}
	}
},
/* @Prototype */
{
	/**
	 * Click on our tab item
	 */
    'click': function() {
    	$('#app_content').html(this.view('show', {'label': UI.Controllers.Record.activeRecord.label})).show();
		$('#app_content_iframe').attr('src', 'about:blank').hide();
		
    	//this.reloadRecord();
    	this.didReloadRecord(UI.Controllers.Record.activeRecord);
    },
    
    
    /**
     * Reload the record, then load carenets
     */
    reloadRecord: function() {
		var record = UI.Controllers.Record.activeRecord;
		UI.Models.Record.get(record.record_id, record.carenet_id, this.callback('didReloadRecord'));
	},
	
    didReloadRecord: function(record) {
    	this.record = record;
    	this.accounts = [];
    	this.carenets = [];
    	UI.Controllers.Record.activeRecord.get_carenets(null, this.callback('didLoadCarenets'));
    },
    
    didLoadCarenets: function(carenets) {
    	var self = this;
    	if (carenets && carenets.length > 0) {
			$(carenets).each(function(i, carenet) {
				carenet.get_people(function(account_objects_list) {
					carenet.accounts = account_objects_list;
					if (account_objects_list && account_objects_list.length > 0) {
						self.accounts = self.accounts.concat(account_objects_list);
					}
				});
			});
			
			self.carenets = carenets;
			
			// show known accounts and carenets
			self.updateAccounts();
			$('#carenet_drag_accounts').show();
			$('#carenets').show().html(this.view('carenets', {'carenets': self.carenets}));
		}
	},
	
	updateAccounts: function() {
		var self = this;
		$('#known_accounts').html(this.view('accounts', {'accounts': this.accounts}));
		
		// setup JS
		$('#known_accounts').find('.account.new').click(function(ev) {
			self.showNewAccountBox(ev, $(this));
		});
	},
	
	
	/**
	 * Operations
	 */
	showNewAccountBox: function(ev, el, error_msg) {
		var self = this;
		el.addClass('active');
		var form = el.find('form');
		if ('none' != form.css('display')) {
			return;
		}
		
		// restore view
		form.find('input').removeAttr('disabled');
		form.find('.account_buttons img').remove();
		form.find('.account_buttons button').show();
		if (error_msg && error_msg.length > 0) {
			form.find('.error_area').show().text(error_msg);
		}
		else {
			form.find('.error_area').empty().hide();
		}
		
		// bind submit action
		form.unbind('submit').bind('submit', function(ev) {
			var form = $(this);
			var name_field = form.find('input.account_name');
			name_field.removeClass('error');
			var acc_id = name_field.val();
			if (!acc_id || acc_id.length < 5) {
				name_field.addClass('error').focus();
				return false;
			}
			
			// show status and fire!
			name_field.attr('disabled', 'disabled');
			form.find('button[type="submit"]').hide().before('<img src="jmvc/ui/resources/images/spinner-small.gif" alt="Adding..." />');
			self.getAccountName(acc_id);
			
			return false;
		});
		
		// toggle views
		el.find('div.account_name').hide();
		form.show();
		form.find('input.account_name').focus();
		form.find('button[type="reset"]').click(function(ev) {
			ev.stopPropagation();
			self.hideNewAccountBox();
		});
	},
	
	hideNewAccountBox: function() {
		var form = $('#new_account_form');
		form.parent().removeClass('active');
		form.hide().siblings().show();
	},
	
	
	/**
	 * Model operations
	 */
	getAccountName: function(account_id) {
		if (account_id) {
			var new_account = new UI.Models.Account({'account_id': account_id});
			new_account.get_name(this.callback('didGetAccountName', new_account));
		}
	},
	didGetAccountName: function(account, data, textStatus, xhr) {
		console.log(account);
		if ('success' != textStatus) {
			this.showNewAccountBox(null, $('#new_account_form').parent(), '{% trans "We don\\\'t have an account with this ID, sorry" %}');
		}
		else {
			account.fullName = data;
			account.warning = '{% trans "You must add this account to at least one carenet in order to to keep it in your accounts list" %}';
			this.accounts.push(account);
			console.log(this.accounts);
			this.updateAccounts();
		}
	}
});
