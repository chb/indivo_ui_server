"""
Human understandable error strings for Indivo UI

Upon initalization, pass the error key as first argument
If the error description for the error key is not found, the key itself is returned
"""
from django.utils.translation import ugettext as _

class ErrorStr:
    error_key = None
    errors = {
                      'missing_name_pass': _("Either the username or password is missing. Please try again."),
                  'incorrect_credentials': _("Incorrect username or password. Please try again."),
                               'disabled': _("This account has been disabled/locked."),
                            'setup_error': _("There was a problem setting up your account. Please try again."),
                     'account_init_error': _("There was a problem updating your data. Please try again. If you are unable to change your password please contact support."),
                      'account_collision': _("That username is already taken. Please enter different one."),
                  'password_change_error': _("There was a problem updating your password. Please try again. If you are unable to set up your account please contact support."),
                   'password_reset_error': _("There was a problem resetting your password. Please try again. If you are unable to set up your account please contact support."),
                      'multiple_accounts': _("There was a problem resetting your password. Please contact support."),
       'Socket Error: Connection refused': _("The server is currently unavailable. Please try again in a few minutes.")
    }
    
    
    def __init__(self, error_key):
        self.error_key = error_key
    
    
    def __str__(self):
        return self.errors.get(self.error_key, self.error_key)
    
    def __repr__(self):
        return self.__str__()
    
    def str(self):
        return self.__str__()


