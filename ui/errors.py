"""
Human understandable error strings for Indivo UI

Upon initalization, pass the string key as first argument and a custom message as an optional second argument.
If the error for the error key is not found, the custom message is returned, if it is set, otherwise the key itself.
"""


class ErrorStr:
    error_key = None
    error_message = None
    errors = {
                      'missing_name_pass': '{% trans "Either the username or password is missing. Please try again." %}',
                  'incorrect_credentials': '{% trans "Incorrect username or password. Please try again." %}',
                               'disabled': '{% trans "This account has been disabled/locked." %}',
                            'setup_error': '{% trans "There was a problem setting up your account. Please try again." %}',
                     'account_init_error': '{% trans "There was a problem updating your data. Please try again. If you are unable to change your password please contact support." %}',
                      'account_collision': '{% trans "That username is already taken. Please enter different one." %}',
                  'password_change_error': '{% trans "There was a problem updating your password. Please try again. If you are unable to set up your account please contact support." %}',
                   'password_reset_error': '{% trans "There was a problem resetting your password. Please try again. If you are unable to set up your account please contact support." %}',
                      'multiple_accounts': '{% trans "There was a problem resetting your password. Please contact support." %}',
       'Socket Error: Connection refused': '{% trans "The server is currently unavailable. Please try again in a few minutes." %}'
    }
    
    
    def __init__(self, error_key, error_message=None):
        self.error_key = error_key
        if error_message:
            self.error_message = error_message
    
    
    def __str__(self):
        reserve_message = self.error_message if self.error_message is not None else self.error_key
        err = self.errors.get(self.error_key, None)
        if err is not None:
            return err
        return reserve_message
    
    def __repr__(self):
        return self.__str__()


