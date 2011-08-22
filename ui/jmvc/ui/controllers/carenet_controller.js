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
		this.accounts = [];
		this.carenets = [];
		this.waitingForCarenetAccounts = 0;
		
    	if (carenets && carenets.length > 0) {
			this.carenets = carenets;
    		this.waitingForCarenetAccounts = carenets.length;
    		
    		// load accounts in carenets
			$(carenets).each(function(i, carenet) {
				carenet.get_people(self.callback('didGetPeople', carenet));
			});
		}
		else {
			this.didGetPeople(null, []);
		}
	},
	
	didGetPeople: function(carenet, c_accounts) {
		this.waitingForCarenetAccounts--;
		
		// store accounts
		if (carenet) {
			if (c_accounts && c_accounts.length > 0) {
				carenet.accounts = c_accounts;
				for (var i = 0; i < c_accounts.length; i++) {		// can't use "concat" here as this wraps the accounts into some jquery element, stupidly :P
					if (!_(this.accounts).detect(function(a) { return a.account_id === c_accounts[i].account_id; })) {
						this.accounts.push(c_accounts[i]);
					}
				}
			}
			else {
				carenet.accounts = [];
			}
		}
		
		// got all carenets, update UI
		if (this.waitingForCarenetAccounts < 1) {
			this.showAccounts();
			$('#carenet_drag_accounts').fadeIn('fast');
			this.showCarenets();
		}
	},
	
	
	/**
	 * UI preparations
	 */
	showAccounts: function() {
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
				ui.helper.addClass('account_dragged');
				
				// indicate (im)possible targets
				var account = $(this).model();
				var account_id = account ? account.account_id : 0;
				$('#carenets').find('.carenet').not('.new').each(function(i, elem) {
					if (!account_id) {
						$(elem).css('opacity', 0.4);
					}
					else {
						var carenet = $(elem).model();
						if (carenet) {
							var account_arr = carenet.accounts;
							if (account_arr && account_arr.length > 0 && _(account_arr).detect(function(a) { return a.account_id === account_id; })) {
								$(elem).css('opacity', 0.4);
							}
						}
					}
				});
			},
			stop: function(event) {				// this may be called AFTER another 'start' if the user very quickly drags another app. We could use 'drag' instead of 'start'
				$('#carenets').find('.carenet').each(function(i, elem) { $(elem).css('opacity', 1); });
			}
		})
		
		// setup hovering (so we see in which carenets the account already is)
		.not('.new').bind({
			'mouseover': function(event) {
				var account = $(this).model();
				if (account) {
					var account_id = account.account_id;
					$('#carenets').find('.carenet').not('.new').each(function(i, elem) {
						var account_arr = $(elem).model().accounts;
						if (account_arr && account_arr.length > 0 && _(account_arr).detect(function(a) { return a.account_id === account_id; })) {
							$(elem).addClass('has_app');
							
							// also highlight the account in the list
							$(elem).find('.account').each(function(j, node) {
								var acc = $(node).model();
								if (acc && acc.account_id == account_id) {
									$(node).addClass('highlight');
									return;
								}
							});
						}
					});
				}
			},
			'mouseout': function(event) {
				$('#carenets').find('.account').removeClass('highlight');
				$('#carenets').find('.carenet').removeClass('has_app');
			}
		});
	},
	
	showCarenets: function() {
		var self = this;
		var nets = $('#carenets');
		
		// show and setup existing accounts
		nets.show().html(this.view('carenets', {'carenets': this.carenets, 'controller': this}));
		nets.find('.account').each(function(i, node) {
			self.setupCarenetAccount($(node));
		});
		
		// setup droppable
		nets.find('.carenet').droppable({
			accept: function(draggable) {
				var carenet = $(this).model();
				if (!carenet) {
					return $(this).hasClass('new');
				}
				if (!carenet.accounts || carenet.accounts.length < 1) {
					return true;
				}
				var dragged_acc = draggable.model();
				if (dragged_acc) {
					return ! _(carenet.accounts).detect(function(a) { return a.account_id === dragged_acc.account_id; });
				}
				return false;
			},
			hoverClass: 'draggable_hovers',
			over: function(event, ui) {
				ui.helper.addClass('draggable_will_transfer');
			},
			out: function(event, ui) {
				ui.helper.removeClass('draggable_will_transfer');
			},
			
			// add or transpfer account on drop
			drop: function(event, ui) {
				self.addAccountToCarenet(ui.draggable.model(), ui.helper, $(this));
				
				if (ui.helper.hasClass('draggable_will_remove')) {
					self.removeAccountFromCarenet(ui.draggable.model(), ui.helper);
				}
			}
		});
		
		// setup carenet name editing
		nets.find('a.carenet_name').each(function(i) {
			self.setupCarenetName($(this));
		});
	},
	
	
	/**
	 * Operations
	 */
	showNewAccountBox: function(ev, el, error_msg) {
		var self = this;
		el.addClass('highlight');
		var form = el.find('form');
		
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
			
			// get desired account id
			var name_field = form.find('input.account_name');
			name_field.removeClass('error');
			var acc_id = name_field.val();
			if (!acc_id || acc_id.length < 5) {
				name_field.addClass('error').focus();
				return false;
			}
			
			// is the account already known?
			var known_accounts = $('#known_accounts').find('.account').not('.new');
			for (var i = 0; i < known_accounts.length; i++) {
				var node = $(known_accounts[i]);
				var account = node.model();
				if (account && account.account_id == acc_id) {
					node.addClass('highlight');
					window.setTimeout(function() { node.removeClass('highlight'); }, 1500);
					return false;
				}
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
		form.parent().removeClass('highlight');
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
		if ('success' != textStatus) {
			this.showNewAccountBox(null, $('#new_account_form').parent(), data);
		}
		else {
			account.fullName = data;
			account.in_no_carenet = true;
			this.accounts.push(account);
			this.showAccounts();
		}
	},
	
	addAccountToCarenet: function(account, dragged_view, carenet_view) {
		carenet_view.addClass('expanded');
		
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
		
		// tell the server
		var carenet = carenet_view.model();
		if (!carenet) {
			console.log("DROPPED ON NEW CARENET");
		}
		else {
			carenet_view.find('.carenet_num_items').first().text('~');
			carenet.add_account(account.account_id, this.callback('didAddAccountToCarenet', new_acc_view, carenet_view));
		}
	},
	didAddAccountToCarenet: function(account_view, carenet_view, data, textStatus, xhr) {
		if ('success' == textStatus) {		// as of Indivo X b3, this always return success!
			var carenet = carenet_view.model();
			var account = account_view.model();
			
			// add to carenet array
			if (account) {
				carenet.accounts.push(account);
				
				// remove warning
				if (account.in_no_carenet) {
					$('#known_accounts').find('.account').each(function(i, node) {
						var acc = $(node).model();
						if (acc && acc.account_id == account.account_id) {
							$(node).find('.error_area').fadeOut('fast');
							return;
						}
					});
				}
			}
			carenet_view.find('.carenet_num_items').first().text(carenet.accounts.length);
			$('#known_accounts').find('.account').not('.new').removeClass('highlight');
			
			window.setTimeout(function() { carenet_view.removeClass('expanded'); }, 600);
		}
	},
	
	removeAccountFromCarenet: function(account, dragged_view) {
		dragged_view.draggable('destroy');
		
		// tell the server
		var carenet_view = dragged_view.parentsUntil('.carenet').last().parent();
		var carenet = carenet_view.model();
		
		if (carenet) {
			carenet_view.addClass('expanded');
			carenet_view.find('.carenet_num_items').first().text('~');
			carenet.remove_account(account.account_id, this.callback('didRemoveAccountFromCarenet', account, dragged_view, carenet_view));
		}
		else {
			dragged_view.remove();
		}
		
		// animate removal
		if (!dragged_view.hasClass('draggable_will_transfer')) {
			var parent = $('#app_content');
			//var p_off = parent.offset();		// '#app_content' is no offsetParent! Will this change? If so, subtract p_off from v_off
			var v_off = dragged_view.offset();
			
			UI.Controllers.MainController.poof(dragged_view);
		}
	},
	didRemoveAccountFromCarenet: function(account, account_view, carenet_view, data, textStatus, xhr) {
		if ('success' == textStatus) {
			
			// remove from accounts array
			var carenet = carenet_view.model();
			var acc_id = account.account_id;
			if (carenet && carenet.accounts && carenet.accounts.length > 0) {
				for (var i = 0; i < carenet.accounts.length; i++) {
					var acc = carenet.accounts[i];
					if (acc.account_id == acc_id) {
						carenet.accounts.splice(i, 1);
						break;
					}
				}
			}
			
			// update carenet view
			if (0 == carenet.accounts.length) {
				carenet_view.find('.carenet_content').first().append('<p class="hint">{% trans "No accounts" %}</p>');
			}
			account_view.remove();
			carenet_view.find('.carenet_num_items').first().text(carenet.accounts.length);
			$('#known_accounts').find('.account').not('.new').removeClass('highlight');
			
			// show warning when account is in no other carenet
			var found = false;
			$('#carenets').find('.account').each(function(i, node) {
				var acc = $(node).model();
				if (acc && acc.account_id == acc_id) {
					found = true;
					return;
				}
			});
			if (!found) {
				account.in_no_carenet = true;
				$('#known_accounts').find('.account').each(function(i, node) {
					var acc = $(node).model();
					if (acc && acc.account_id == acc_id) {
						$(node).find('.error_area').fadeIn('fast');
					}
				});
			}
			
			window.setTimeout(function() { carenet_view.removeClass('expanded'); }, 600);
		}
	},
	
	changeCarenetName: function(form) {
		$('body').unbind('click');
		
		var new_name = form.find('input').first().val();
		var carenet_view = form.parentsUntil('.carenet').last().parent();
		var carenet = carenet_view.model();
		
		this.record.rename_carenet(carenet.carenet_id, new_name, this.callback('didChangeCarenetName', form, new_name));
	},
	didChangeCarenetName: function(name_form, new_name, data, textStatus, xhr) {
		if ('success' == textStatus) {
			name_form.parent().find('b').show();
			
			// return the form to a link
			name_form.parent().find('a').text(new_name).show();		// would be cleaner to fetch the new name from the 'data' xml
			name_form.remove();
		}
		else {
			alert("There was an error changing the name, please try again\n\n" + data);
			name_form.find('button').removeAttr('disabled');
		}
	},
	
	
	/**
	 * Utilities
	 */
	setupCarenetName: function(carenet_name_view) {
		if (carenet_name_view) {
			var self = this;
			
			carenet_name_view.click(function(event) {
				event.stopPropagation();
				$(this).parent().find('b').hide();
				
				// insert an input field on link click
				var field = $('<input type="name" name="carenet_name" value="' + carenet_name_view.text() + '" />');
				var submit = $('<button type="submit">Save</button>');
				var form = $('<form/>', {'method': 'get', 'action': 'javascript:;'}).append(field).append(submit);
				form.submit(function() {
					var form = $(this);
					form.find('button').attr('disabled', 'disabled');
					self.changeCarenetName(form);
					return false;
				});
				carenet_name_view.before(form).hide();
				form.find('input').first().focus();
				form.parent().click(function(event) { event.stopPropagation(); });
				
				// cancel input if we click somewhere outside
				$('body').click(function(event) {
					$(this).unbind('click');
					var forms = $('#carenets').find('.carenet_inner').find('form');
					if (forms.length > 0) {
						forms.each(function(i) {
							$(this).siblings().show();
							$(this).remove();
						});
					}
				});
			});
		}
	},
	
	setupCarenetAccount: function(account_view) {
		if (account_view) {
			var self = this;
			
			//** show occount info on hover
			account_view.bind('mouseover', function(event) {
				var self_id = $(this).model().account_id;
				$('#known_accounts').find('.account').not('.new').each(function(i) {
					if ($(this).model().account_id == self_id) {
						$(this).addClass('highlight');
					}
				});
			})
			.bind('mouseout', function(event) {
				if (!$(this).hasClass('account_dragged')) {
					$('#known_accounts').find('.account').not('.new').removeClass('highlight');
				}
			})
			
			//** setup action on mouse up (can't use "stop" of draggable as this will first revert the item)
			.bind('mouseup', function(event) {
				var view = $(this);
				
				// remove from carenet
				if (view.hasClass('draggable_will_remove')) {
					view.draggable('destroy');
					var account = view.model();
					self.removeAccountFromCarenet(account, view);
				}
			})
			
			//** setup dragging
			.bind('selectstart', function () { return false; })		// needed for WebKit (unless we upgrade jQuery UI to 1.8.6+)
			.draggable({
				distance: 8,
				revert: true,
				revertDuration: 300,
				containment: '#app_content',
				start: function(event, ui) {
					var view = ui.helper;
					view.addClass('account_dragged');
					var carenet_view = view.parentsUntil('.carenet').last().parent();
					carenet_view.addClass('expanded');
					
					// indicate (im)possible targets
					var account_id = $(this).model().account_id;
					$('#carenets').find('.carenet').not('.expanded').not('.new').each(function(i, elem) {
						var account_arr = $(elem).model().accounts;
						if (account_arr && account_arr.length > 0 && _(account_arr).detect(function(a) { return a.account_id === account_id; })) {
							$(elem).css('opacity', 0.4);
						}
					});
				},
				drag: function(event, ui) {
					var view = ui.helper;
					var par = view.parent();
					var parpos = par.position();
					var parsize = {'width': par.outerWidth(true), 'height': par.outerWidth(true)};
					var x = parseInt(view.css('left')) + view.outerWidth(true) / 2;
					var y = parseInt(view.css('top')) + view.outerHeight(true) / 2;
					var minx = - parpos.left;
					var maxx = parsize.width + parpos.left;
					var miny = - parpos.top;
					var maxy = parsize.height;
					
					if (x < minx || x > maxx || y < miny || y > maxy) {
						view.addClass('draggable_will_remove');
					}
					else {
						view.removeClass('draggable_will_remove');
					}
				},
				stop: function(event, ui) {
					var view = ui.helper;
					view.removeClass('account_dragged');
					
					// revert UI (note: this may be called AFTER another 'start' if the user very quickly drags another app since this is only called once the move-back animation finished)
					$('#carenets').find('.carenet').each(function(i, elem) {
						$(elem).css('opacity', 1);
					});
					$('#known_accounts').find('.accounts').not('.new').removeClass('highlight');
					
					if (!view.hasClass('draggable_will_remove')) {
						view.parentsUntil('.carenet').last().parent().removeClass('expanded');
					}
				}
			});
		}
	}
});
