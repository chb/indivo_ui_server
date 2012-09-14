"""
Human understandable error strings for Indivo UI

Upon initalization, pass the error key as first argument
If the error description for the error key is not found, the key itself is returned
"""
from django.utils.translation import ugettext as _
import warnings

class ErrorStr:
    error_key = None
    errors = {
                              'Login required': _("You need to login first"),
                    'Name or password missing': _("Either the username or password is missing. Please try again."),
                       'Incorrect credentials': _("Incorrect username or password. Please try again."),
               'Failed to claim request token': _("Failed to claim request token"),
                                    'disabled': _("This account has been disabled/locked."),
                             'Unknown account': _("This account does not exist on the server."),
                       'Registration disabled': _("Online registration is not available."),
                                'Wrong secret': _("The confirmation code was wrong. Please try again."),
                     'Wrong confirmation code': _("The confirmation code was wrong. Please try again."),
                                'Setup failed': _("There was a problem setting up your account. Please try again."),
                          'account_init_error': _("There was a problem updating your data. Please try again. If you are unable to change your password please contact support."),
                          'Username too short': _("This username is too short, please choose a different one"),
                      'Username already taken': _("That username is already taken, please enter a different one"),
                          'Password too short': _("The password is too short"),
                      'Passwords do not match': _("Your passwords do not match, please try again"),
                          'Wrong old password': _("The current password is wrong, please try again"),
                      'Password change failed': _("There was a problem updating your password. Please try again. If you are unable to set up your account please contact support."),
                       'Password reset failed': _("There was a problem resetting your password. Please try again. If you are unable to set up your account please contact support."),
                  'Adding records is disabled': _("Adding records has been disabled by the administrator"),
                        'Record name required': _("Please provide a name if you wish to create a record"),
               'Carenet name is already taken': _("This carenet name is already taken, please choose a different one"),
                           'multiple accounts': _("There was a problem resetting your password. Please contact support."),
                      'Error getting app info': _("There was a problem retrieving app information. Please try again."),
        'Error getting app info: no start URL': _("There was a problem retrieving app information (Start URL missing). Please contact support."),
                                 'No such App': _("This App does not exist"),
                           'Permission Denied': _("You are not authorized"),
                                'Socket Error': _("The server is currently unavailable. Please try again in a few minutes."),
                          'Connection refused': _("The server is currently unavailable. Please try again in a few minutes."),
            'Socket Error: Connection refused': _("The server is currently unavailable. Please try again in a few minutes.")
    }
    
    
    def __init__(self, error_key):
        self.error_key = error_key
 
    def __unicode__(self):
        return self.__str__()
    
    def __str__(self):
        return self.errors.get(self.error_key, self.error_key)
    
    def __repr__(self):
        return self.__str__()
    
    def str(self):
        warnings.warn("ErrorStr.str() is deprecated, and will be removed: use str(ErrorStr) instead",
                      DeprecationWarning)
        return self.__str__()


