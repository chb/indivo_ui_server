"""
Human understandable error strings for Indivo UI

Upon initalization, pass the error key as first argument
If the error description for the error key is not found, the key itself is returned
"""


class ErrorStr:
    error_key = None
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
    
    
    def __init__(self, error_key):
        self.error_key = error_key
    
    
    def __str__(self):
        return self.errors.get(self.error_key, self.error_key)
    
    def __repr__(self):
        return self.__str__()
    
    def str(self):
        return self.__str__()


