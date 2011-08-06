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
			self.accounts = [new UI.Models.Account({'account_id': 'fake@indivo.org', 'fullName': 'Mr. Universe'})];
			
			// show known accounts and carenets
			self.updateAccounts();
			$('#carenet_drag_accounts').show();
			self.updateCarenets();
		}
	},
	
	
	/**
	 * UI preparations
	 */
	updateAccounts: function() {
		var self = this;
		$('#known_accounts').html(this.view('accounts', {'accounts': this.accounts}));
		
		// setup adding an account
		$('#known_accounts').find('.account.new').click(function(ev) {
			self.showNewAccountBox(ev, $(this));
		});
		
		// setup app dragging
		$('#known_accounts').find('.account').not('.new')
		.bind('selectstart', function () { return false; })		// needed for WebKit (unless we upgrade jQuery UI to 1.8.6+)
		.draggable({
			distance: 8,
			revert: 'invalid',
			revertDuration: 300,
			helper: 'clone',
			containment: '#app_content',
			start: function(event, ui) {
				var account_id = $(this).model().account_id;
				$('#carenets').find('.carenet').not('.new').each(function(i, elem) {
					var carenet = $(elem).model();
					if (carenet && carenet.accounts && carenet.accounts.length > 0) {
						var account_arr = carenet.accounts;
						if (account_arr && _(account_arr).detect(function(a) { return a.account_id === account_id; })) {
							$(elem).css('opacity', 0.4);
						}
					}
				});
				ui.helper.addClass('account_dragged');
			},
			stop: function(event) {				// this may be called AFTER another 'start' if the user very quickly drags another app. We could use 'drag' instead of 'start'
				$('#carenets').find('.carenet').each(function(i, elem) { $(elem).css('opacity', 1); });
			}
		})
		
		// setup hovering (so we see in which carenets the account already is)
		.not('.new').bind({
			'mouseover': function(event) {
				var account_id = $(this).model().account_id;
				$('#carenets').find('.carenet').not('.new').each(function(i, elem) {
					var account_arr = $(elem).model().accounts;
					if (account_arr && _(account_arr).detect(function(a) { return a.account_id === account_id; })) {
						$(elem).addClass('has_app');
					}
				});
			},
			'mouseout': function(event) {
				$('#carenets').find('.carenet').removeClass('has_app');
			}
		});
	},
	
	updateCarenets: function() {
		var self = this;
		var nets = $('#carenets');
		nets.show().html(this.view('carenets', {'carenets': this.carenets}));
		
		// setup droppable
		nets.find('.carenet').droppable({
			accept: function(draggable) {
				var mod = $(this).model();
				if (!mod) {
					return $(this).hasClass('new');
				}
				var drag_mod = draggable.model();
				if (drag_mod) {
					return ! _(mod.accounts).detect(function(a) { return a.account_id === drag_mod.account_id; });
				}
				return false;
			},
			hoverClass: 'draggable_hovers',
			over: function(event, ui) {
				//if (ui.helper.hasClass('draggable_will_remove')) {		// 'draggable_will_remove' class is not yet set for quick drags. Set 'draggable_will_transfer' without checking as it doesn't hurt
					ui.helper.addClass('draggable_will_transfer');
				//}
			},
			out: function(event, ui) {
				if (ui.helper.hasClass('draggable_will_remove')) {
					ui.helper.removeClass('draggable_will_transfer');
				}
			},
			
			// add app on drop
			drop: function(event, ui) {
				self.addAccountToCarenet(ui.draggable.model(), ui.helper, $(this));
			}
		});
		
		// setup carenet name editing
		nets.find('a.carenet_name').each(function(i) {
			self.setupCarenetName($(this));
		});
	},
	
	setupCarenetAccount: function(account_view) {
		
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
			this.updateAccounts();
		}
	},
	
	addAccountToCarenet: function(account, dragged_view, carenet_view) {
		var carenet = carenet_view.model();
		carenet_view.addClass('expanded');
		account.temporarily_added = true;
		
		// create the view at drop position
		var carenet_content = carenet_view.find('.carenet_content').first();
		var pos_parent = carenet_content.offset();
		var pos_acc = dragged_view.offset();
		var cur_coords = {'top': pos_acc.top - pos_parent.top, 'left': pos_acc.left - pos_parent.left};
		var new_acc_view = $(this.view('carenet_account', {'account': account}));
		this.setupCarenetAccount(new_acc_view);
		
		// add the view and animate to final position
		dragged_view.detach();
		carenet_content.find('p.hint').remove();
		var children = carenet_content.children();
		var coords = {'top': 0, 'left': 0};
		if (children.length > 0) {
			//coords = ...
		}
		carenet_content.append(new_acc_view);
		new_acc_view.animate({'left': coords.left, 'top': coords.top}, 'fast');
		carenet_view.find('.carenet_num_apps').first().text('~');
		
		// add to array and tell the server
		carenet.accounts.push(account);
		carenet.add_account(account.account_id, this.callback('didAddAccountToCarenet', new_acc_view, carenet_view));
	},
	didAddAccountToCarenet: function(data, textStatus, xhr) {
		console.log(data);
	}
});
