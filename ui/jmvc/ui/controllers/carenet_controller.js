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
},
/* @Prototype */
{
	
	init: function() {
		this.record = this.options.account.attr("activeRecord");
		this.accounts = [];
		this.carenets = [];
		
		if (this.record) {
			this.element.html($.View('//ui/views/carenet/show', {'label': this.record.label}));
	    	this.didReloadRecord(this.record);
	    }
	},
	
    /**
     * Reload the record, then load carenets
     */
    reloadRecord: function() {
    	//TODO: still needed? TF
		UI.Models.Record.get(this.record.id, this.record.carenet_id, this.callback('didReloadRecord'));
	},
	
    didReloadRecord: function(record) {
    	//this.record = record;
    	this.accounts = [];
    	this.carenets = [];
    	this.record.get_carenets(null, this.callback('didLoadCarenets'));
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
				carenet.get_accounts(self.callback('didGetAccounts', carenet));
			});
		}
		else {
			this.didGetAccounts(null, []);
		}
	},
	
	didGetAccounts: function(carenet, c_accounts) {
		this.waitingForCarenetAccounts--;
		
		// store accounts
		if (carenet) {
			if (c_accounts && c_accounts.length > 0) {
				carenet.accounts = c_accounts;
				for (var i = 0; i < c_accounts.length; i++) {		// can't use "concat" here as this wraps the accounts into some jquery element, stupidly :P
					if (!_(this.accounts).detect(function(a) { return a.id === c_accounts[i].id; })) {
						this.accounts.push(c_accounts[i]);
					}
				}
			}
			else {
				carenet.accounts = []
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
			distance: 4,
			revert: 'invalid',
			revertDuration: 300,
			helper: 'clone',
			containment: '#app_content',
			start: function(event, ui) {
				ui.helper.addClass('account_dragged');
				
				// indicate (im)possible targets
				var account = $(this).model();
				var account_id = account ? account.id : 0;
				$('#carenets').find('.carenet').not('.new').each(function(i, elem) {
					if (!account_id) {
						$(elem).css('opacity', 0.4);
					}
					else {
						var carenet = $(elem).model();
						if (carenet) {
							var account_arr = carenet.accounts;
							if (account_arr && account_arr.length > 0 && _(account_arr).detect(function(a) { return a.id === account_id; })) {
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
					var account_id = account.id;
					$('#carenets').find('.carenet').not('.new').each(function(i, elem) {
						
						// get accounts of this carenet
						var account_arr = $(elem).model().accounts;
						if (account_arr && account_arr.length > 0 && _(account_arr).detect(function(a) { return a.id === account_id; })) {
							$(elem).addClass('highlight');
							
							// also highlight the dragged account in the list
							$(elem).find('.account').each(function(j, node) {
								var acc = $(node).model();
								if (acc && acc.id == account_id) {
									$(node).addClass('highlight');
									
									// scroll visible
									if (node.offsetTop < node.parentNode.scrollTop) {
										node.parentNode.scrollTop = node.offsetTop;
									}
									else if (node.offsetTop + node.offsetHeight > node.parentNode.offsetHeight + node.parentNode.scrollTop) {
										node.parentNode.scrollTop = node.offsetTop + node.offsetHeight - node.parentNode.offsetHeight;
									}
									return;
								}
							});
						}
					});
				}
			},
			'mouseout': function(event) {
				$('#carenets').find('.account').removeClass('highlight');
				$('#carenets').find('.carenet').removeClass('highlight');
			}
		});
	},
	
	showCarenets: function() {
		var self = this;
		var nets = $('#carenets');
		
		// show and setup existing accounts
		nets.show().html(this.view('carenets', {'carenets': this.carenets, 'controller': this}));
		nets.children().last().before(this.view('new_carenet'));
		nets.find('.account').each(function(i, node) {
			self.setupCarenetAccount($(node));
		});
		
		// setup droppable and name editing
		nets.find('.carenet').each(function(i) {
			self.setupCarenetView($(this));
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
				if (account && account.id == acc_id) {
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
	 * Account Handling
	 */
	getAccountName: function(account_id) {
		if (account_id) {
			var new_account = new UI.Models.Account({'id': account_id});
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
		var new_acc_view = $(this.view('carenet_account', {'account': account}));
		var carenet_content = carenet_view.find('.carenet_content_scroller').first();
		var pos_parent = carenet_content.offset();
		var pos_acc = dragged_view.offset();
		var cur_coords = {'top': pos_acc.top - pos_parent.top, 'left': pos_acc.left - pos_parent.left};
		
		// add the view
		dragged_view.remove();
		carenet_content.find('p.hint').remove();
		carenet_content.append(new_acc_view);
		new_acc_view.addClass('highlight');
		window.setTimeout(function() { new_acc_view.removeClass('highlight'); }, 1500);
		this.setupCarenetAccount(new_acc_view);
		
		// animate to final position
		var coords = {'top': 0, 'left': 0};
		// TODO: coords = ...
		new_acc_view.animate({'left': coords.left, 'top': coords.top}, 'fast');
		
		// scroll into view
		var vis_height = carenet_content.get(0).offsetHeight;
		var full_height = carenet_content.get(0).scrollHeight;
		if (full_height > vis_height) {
			carenet_content.scrollTop(full_height - vis_height);
		}
		
		// dropped on new carenet, create it first
		var carenet = carenet_view.model();
		if (!carenet) {
			var self = this;
			this.createCarenet('{% trans "New carenet" %}', carenet_view, function(new_carenet, textStatus, xhr) {
				if ('success' == textStatus) {
					
					// on success, add the account to the newly created carenet
					carenet_view.find('.carenet_num_items').first().text('~');
					new_carenet.add_account(account.id, self.callback('didAddAccountToCarenet', account, carenet_view));
				}
				else {
					// if we end up here after dragging an account from another carenet, that
					// account will be removed from the other carenet, but not added to the
					// new one because the new one could not be created. This is bad, change
					// this behavior.
					new_acc_view.fadeOut('fast', function() { $(this).remove(); });
				}
			});
		}
		
		// add account to existing carenet
		else {
			carenet_view.find('.carenet_num_items').first().text('~');
			carenet.add_account(account.id, this.callback('didAddAccountToCarenet', account, carenet_view));
		}
	},
	didAddAccountToCarenet: function(account, carenet_view, data, textStatus, xhr) {
		if ('success' == textStatus) {
			var carenet = carenet_view.model();
			
			// add to carenet array
			if (account) {
				if (!carenet.accounts) {
					carenet.accounts = [];
				}
				carenet.accounts.push(account);
				
				// remove warning
				if (account.in_no_carenet) {
					account.in_no_carenet = false;
					$('#known_accounts').find('.account').each(function(i, node) {
						var acc = $(node).model();
						if (acc && acc.id == account.id) {
							$(node).find('.error_area').fadeOut('fast');
							return;
						}
					});
				}
			}
			
			// update view
			carenet_view.find('.carenet_num_items').first().text(carenet.accounts.length);
			carenet_view.find('p.hint').remove();
			$('#known_accounts').find('.account').not('.new').removeClass('highlight');
			
			window.setTimeout(function() { carenet_view.removeClass('expanded'); }, 600);
		}
	},
	
	removeAccountFromCarenet: function(account_view, dragged_view) {
		var carenet_view = dragged_view.closest('.carenet');
		var carenet = carenet_view.model();
		
		// tell the server
		if (carenet) {
			dragged_view.append('<div class="spinner_cover"></div>');
			carenet_view.addClass('expanded');
			carenet_view.find('.carenet_num_items').first().text('~');
			var account = account_view.model();
			carenet.remove_account(account.id, this.callback('didRemoveAccountFromCarenet', account, account_view, carenet_view));
		}
		else {
			dragged_view.remove();
		}
		
		// animate removal
		if (!dragged_view.hasClass('draggable_will_transfer')) {
			var parent = $('#app_content');
			//var p_off = parent.offset();		// '#app_content' is no offsetParent! Will this change? If so, subtract p_off from v_off
			var v_off = dragged_view.offset();
			
			// use a clone of the draggable helper, and set the draggable revert 
			// option to false.  This prevents a race condition where the draggable
			// element gets removed, but the "stop" event still tries to get call
			// data("draggable") on it.  
			UI.Controllers.MainController.poof(dragged_view.clone().appendTo(dragged_view.parent()));
			account_view.draggable( "option", "revert", false );
		}
	},
	didRemoveAccountFromCarenet: function(account, account_view, carenet_view, data, textStatus, xhr) {
		if ('success' == textStatus) {
			
			// remove from accounts array
			var carenet = carenet_view.model();
			var acc_id = account.id;
			if (carenet && carenet.accounts && carenet.accounts.length > 0) {
				for (var i = 0; i < carenet.accounts.length; i++) {
					var acc = carenet.accounts[i];
					if (acc.id == acc_id) {
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
				if (acc && acc.id == acc_id) {
					found = true;
					return;
				}
			});
			if (!found) {
				account.in_no_carenet = true;
				$('#known_accounts').find('.account').each(function(i, node) {
					var acc = $(node).model();
					if (acc && acc.id == acc_id) {
						$(node).find('.error_area').fadeIn('fast');
					}
				});
			}
			
			window.setTimeout(function() { carenet_view.removeClass('expanded'); }, 600);
		}
	},
	
	
	/**
	 * Carenet Handling
	 */
	
	// callback takes three arguments: the new carenet, the textStatus and the xhr object
	createCarenet: function(name, carenet_view, callback) {
		this.record.create_carenet(name, this.callback('didCreateCarenet', carenet_view, callback), this.callback('didNotCreateCarenet', carenet_view, callback));
	},
	didCreateCarenet: function(carenet_view, callback, new_carenet, textStatus, xhr) {
		
		// did create the new carenet
		if (new_carenet && new_carenet.id) {
			if (!new_carenet.accounts) {
				new_carenet.accounts = [];
			}
			this.carenets.push(new_carenet);
			
			carenet_view.model(new_carenet);
			carenet_view.removeClass('new');
			carenet_view.find('.carenet_remove_disabled').addClass('carenet_remove').removeClass('carenet_remove_disabled');
			carenet_view.find('.carenet_name').text(new_carenet.name);
			carenet_view.find('.carenet_num_items').text(new_carenet.accounts.length);
			this.setupCarenetView(carenet_view);
			
			// jump to name edit mode if the carenet has the standard name (or no name)
			if (!new_carenet.name || 0 != new_carenet.has_default_name) {
				carenet_view.find('a.carenet_name').click();
			}
			
			// insert the "Create Carenet" carenet
			var create_view = $(this.view('new_carenet'));
			$('#carenets').children().last().before(create_view);
			this.setupCarenetView(create_view);
			
			if (callback) {
				callback(new_carenet, textStatus, xhr);
			}
			return;
		}
		
		// error
		if (callback) {
			callback(null, 'error', xhr);
		}
	},
	didNotCreateCarenet: function(carenet_view, callback, errXHR) {		// error callback for createCarenet
		try {
			if (errXHR.responseText.length > 0) {
				alert('{% trans "There was an error creating your new carenet: " %}' + errXHR.responseText);
			}
			else {
				throw('No response text');
			}
		}
		catch (exc) {
			alert('{% trans "There was an error creating your new carenet, please try again" %}');
		}
		
		carenet_view.find('button').removeAttr('disabled');
		if (callback) {
			callback(null, 'error', errXHR);
		}
	},
	
	deleteCarenet: function(carenet_view) {
		if (carenet_view) {
			var carenet = carenet_view.model();
			
			// ask to really delete
			if (carenet) {
				carenet_view.addClass('highlight');
				if (confirm("{% trans 'Delete this carenet?\n\nThis action cannot be undone' %}")) {
					carenet_view.find('.carenet_remove').addClass('carenet_remove_disabled').removeClass('carenet_remove');
					carenet_view.find('.carenet_border').append('<div class="spinner_cover"></div>');
					
					// delete!
					carenet.destroy(this.callback('didDeleteCarenet', carenet, carenet_view), this.callback('didNotDeleteCarenet', carenet, carenet_view));
				}
				carenet_view.removeClass('highlight');
			}
			else {
				steal.dev.log('deleteCarenet: carenet_view has no model!');
			}
		}
		else {
			steal.dev.log('deleteCarenet: carenet_view was null!');
		}
	},
	didDeleteCarenet: function(carenet, carenet_view, data, textStatus, xhr) {
		if (carenet_view) {
			var clone = this.carenets.slice(0);
			for (var i = 0; i < clone.length; i++) {
				if (clone[i].id == carenet.id) {
					this.carenets.splice(i, 1);
					break;
				}
			}
			
			// for all accounts in this carenet, show warning when account is in no other carenet
			if (carenet.accounts.length > 0) {
				for (var i = 0; i < carenet.accounts.length; i++) {
					var acc = carenet.accounts[i];
					var found = false;
					
					// is this account in another carenet? Loop through all accounts of all carenets
					for (var j = 0; j < this.carenets.length; j++) {
						var carenet_acc = this.carenets[j].accounts;
						if (carenet_acc && carenet_acc.length > 0) {
							for (var k = 0; k < carenet_acc.length; k++) {
								var c_acc = carenet_acc[k];
								if (c_acc.id == acc.id) {
									found = true;
									break;
								}
							}
						}
						if (found) {
							break;
						}
					}
					
					// no, it's not! warn the user
					if (!found) {
						acc.in_no_carenet = true;
						$('#known_accounts').find('.account').each(function(i, node) {
							var known_acc = $(node).model();
							if (known_acc && known_acc.id == acc.id) {
								$(node).find('.error_area').fadeIn('fast');
							}
						});
					}
				}
			}
			
			// fade out the carenet
			carenet_view.fadeOut('fast', function() { $(this).remove(); });
		}
	},
	didNotDeleteCarenet: function(carenet, carenet_view, errXHR) {
		try {
			if (errXHR.responseText.length > 0) {
				alert(errXHR.responseText);
			}
			else {
				throw('No response text');
			}
		}
		catch (exc) {
			steal.dev.log('didNotDeleteCarenet:', exc);
			alert('{% trans "There was an error deleting the carenet, please try again" %}');
		}
		
		// restore UI
		carenet_view.find('.spinner_cover').remove();
		carenet_view.find('.carenet_remove_disabled').addClass('carenet_remove').removeClass('carenet_remove_disabled');
	},
	
	
	changeCarenetName: function(form) {
		var new_name = form.find('input').first().val();
		var carenet_view = form.closest('.carenet');
		var carenet = carenet_view.model();
		
		// rename existing carenet
		if (carenet) {
			carenet.rename(new_name, this.callback('didChangeCarenetName', form, carenet), this.callback('didNotChangeCarenetName', form, carenet));
		}
		
		// "rename" new carenet by creating it
		else {
			this.createCarenet(new_name, carenet_view, this.callback('didChangeCarenetName', form));
		}
	},
	didChangeCarenetName: function(name_form, carenet, textStatus, xhr) {
		if (carenet) {
			$('body').unbind('click');
			
			// revert the form to a link
			var siblings = name_form.siblings();
			name_form.remove();
			siblings.filter('.carenet_name').text(carenet.name);
			if (siblings.filter('form').length < 1) {
				siblings.show();						// it's possible we arrive here via "didCreateCarenet" which might have added a new "change name" form. So only show siblings if this is NOT the case
			}
		}
	},
	didNotChangeCarenetName: function(name_form, carenet, xhr, textStatus, status) {
		var msg = (xhr && xhr.responseText) ? xhr.responseText : status;
		if (msg) {
			alert(msg);
		}
		name_form.find('button').removeAttr('disabled');
	},
	
	carenetViewForCarenet: function(carenet) {
		var carenets = $('#carenets').find('.carenet');
		for (var i = 0; i < carenets.length; i++) {
			var node = $(carenets[i]);
			if (node.model() && node.model().id == carenet.id) {
				return node;
			}
		}
		return null;
	},
	
	
	/**
	 * View Setup
	 */
	setupCarenetView: function(carenet_view) {
		if (carenet_view) {
			var self = this;
			
			// setup jQuery droppable
			carenet_view.droppable('destroy');
			carenet_view.droppable({
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
						return ! _(carenet.accounts).detect(function(a) { return a.id === dragged_acc.id; });
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
				
				// add or transfer account on drop
				drop: function(event, ui) {
					self.addAccountToCarenet(ui.draggable.model(), ui.helper, $(this));
					
					if (ui.helper.hasClass('draggable_will_remove')) {
						self.removeAccountFromCarenet(ui.draggable, ui.helper);
					}
				}
			});
			
			// setup delete button
			carenet_view.find('.carenet_remove').first().unbind('click').click(function(event) {
				self.deleteCarenet($(this).parent());
			});
			
			// setup carenet name editing
			carenet_view.find('a.carenet_name').first().unbind('click').click(function(event) {
				var name_view = $(this);
				event.stopPropagation();
				name_view.parent().find('b').hide();
				
				// insert an input field in a form on link click
				var rand_form_id = 'carenet_name_form_' + Math.round(100000000 * Math.random());
				var field = $('<input type="name" name="carenet_name" value="' + name_view.text() + '" />');
				var cancel = $('<button class="small" type="reset">Cancel</button>').click(function(event) {
					var form = $('#' + rand_form_id);
					form.siblings().show();
					form.remove();
				});
				var submit = $('<button type="submit">Save</button>');
				var form = $('<form/>', {'id': rand_form_id, 'method': 'get', 'action': 'javascript:;'}).append(field).append(cancel).append(submit);
				form.submit(function() {
					var form = $(this);
					form.find('button').attr('disabled', 'disabled');
					self.changeCarenetName(form);
					return false;
				});
				name_view.before(form).hide();
				form.find('input').first().select();
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
			
			// hack needed to insert the draggable into the parent's parent-node (could not figure out a suitable 'appendTo' filter...)
			var drag_parent = account_view.closest('.carenet_content');
			var rand_id = drag_parent.attr('id');
			if (!rand_id) {
				rand_id = 'draggable_parent_' + Math.round(100000000 * Math.random());
				drag_parent.attr('id', rand_id);
			}
			
			//** show account info on hover
			account_view.bind('mouseover', function(event) {
				try {
					var self_id = $(this).model().id;
					$('#known_accounts').find('.account').not('.new').each(function(i) {
						if ($(this).model().id == self_id) {
							$(this).addClass('highlight');
						}
					});
				}
				catch (exc) {}
			})
			.bind('mouseout', function(event) {
				if (!$(this).hasClass('account_dragged')) {
					$('#known_accounts').find('.account').not('.new').removeClass('highlight');
				}
			})
			
			//** setup dragging
			.bind('selectstart', function () { return false; })		// needed for WebKit (unless we upgrade jQuery UI to 1.8.6+)
			.draggable({
				distance: 4,
				revert: true,
				revertDuration: 300,
				helper: 'clone',
				appendTo: '#' + rand_id,
				cursorAt: {top: 21},
				containment: '#app_content',
				start: function(event, ui) {
					var acc_view = $(this);
					acc_view.addClass('account_being_dragged');
					ui.helper.addClass('account_dragged');
					var carenet_view = ui.helper.closest('.carenet');
					carenet_view.addClass('expanded');
					
					// indicate (im)possible targets
					var account = acc_view.model();
					var account_id = account.id;
					$('#carenets').find('.carenet').not('.expanded').not('.new').each(function(i, elem) {
						var account_arr = $(elem).model().accounts;
						if (account_arr && account_arr.length > 0 && _(account_arr).detect(function(a) { return a.id === account_id; })) {
							$(elem).css('opacity', 0.4);
						}
					});
					
					// setup action on mouse up (can't use "stop" of draggable as this will first revert the item)
					ui.helper.bind('mouseup', function(event) {
						var dragged = $(this);
						
						// remove from carenet if dragged outside
						if (dragged.hasClass('draggable_will_remove')) {
							self.removeAccountFromCarenet(acc_view, dragged);
						}
					})
				},
				drag: function(event, ui) {
					var view = ui.helper;
					var par = ui.helper.parent();
					var parpos = par.position();
					var parsize = {'width': par.outerWidth(true), 'height': par.outerWidth(true)};
					var x = parseInt(ui.helper.css('left')) + ui.helper.outerWidth(true) / 2;
					var y = parseInt(ui.helper.css('top')) + ui.helper.outerHeight(true) / 2;
					var minx = - parpos.left;
					var maxx = parsize.width + parpos.left;
					var miny = - parpos.top;
					var maxy = parsize.height;
					
					if (x < minx || x > maxx || y < miny || y > maxy) {
						ui.helper.addClass('draggable_will_remove');
					}
					else {
						ui.helper.removeClass('draggable_will_remove');
					}
				},
				stop: function(event, ui) {
					var view = ui.helper;
					$(this).removeClass('account_being_dragged');
					ui.helper.removeClass('account_dragged');
					
					// revert UI (note: this may be called AFTER another 'start' if the user very quickly drags another app since this is only called once the move-back animation finished)
					$('#carenets').find('.carenet').each(function(i, elem) {
						$(elem).css('opacity', 1);
					});
					$('#known_accounts').find('.accounts').not('.new').removeClass('highlight');
					
					if (!ui.helper.hasClass('draggable_will_remove')) {
						ui.helper.closest('.carenet').removeClass('expanded');
					}
				}
			});
		}
	}
});
