"""
Views for Indivo JS UI

"""
# pylint: disable=W0311, C0301
# fixme: rm unused imports
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseBadRequest, HttpResponseForbidden, Http404, HttpRequest
from django.contrib.auth.models import User
from django.core.exceptions import *
from django.core.urlresolvers import reverse
from django.core import serializers
from django.db import transaction
from django.conf import settings

from django.views.static import serve
from django.template import Template, Context
from django.utils import simplejson
from django.utils.translation import ugettext as _

import xml.etree.ElementTree as ET
import urllib, re

import utils
from errors import ErrorStr

HTTP_METHOD_GET = 'GET'
HTTP_METHOD_POST = 'POST'
HTTP_METHOD_DELETE = 'DELETE'
LOGIN_PAGE = 'ui/login'
DEBUG = False

# init the IndivoClient python object
from indivo_client_py.lib.client import IndivoClient

# todo: safe for now, but revisit this (maybe make a global api object) later
def get_api(request=None):
    api = IndivoClient(settings.CONSUMER_KEY, settings.CONSUMER_SECRET, settings.INDIVO_SERVER_LOCATION)
    if request:
        api.update_token(request.session.get('oauth_token_set'))
    
    return api


def tokens_p(request):
    try:
        ########### FIXME CHECK SECURITY ######################
        if request.session['oauth_token_set']:
            return True
        else:
            return False
    except KeyError:
        return False


def tokens_get_from_server(request, username, password):
    """
    This method will not catch exceptions raised by create_session, be sure to catch them!
    """
    # hack! re-initing IndivoClient here
    api = get_api()
    tmp = api.create_session({'username' : username, 'user_pass' : password})
    
    request.session['username'] = username
    request.session['oauth_token_set'] = tmp
    request.session['account_id'] = urllib.unquote(tmp['account_id'])
    
    if DEBUG:
        utils.log('oauth_token: %(oauth_token)s outh_token_secret: %(oauth_token_secret)s' %
                            request.session['oauth_token_set'])
    
    return True


def index(request):
    if tokens_p(request):
        # get the realname here. we already have it in the js account model
        api = get_api()
        account_id = urllib.unquote(request.session['oauth_token_set']['account_id'])
        try:
            res = api.account_info(account_id = account_id)
        except:
            res = None
        
        # got account info from the server
        if res and res.response:
            if 200 == res.response.get('response_status', 0):
                e = ET.fromstring(res.response.get('response_data', '<xml/>'))
                fullname = e.findtext('fullName')
                return utils.render_template('ui/index', { 'ACCOUNT_ID': account_id,
                                                             'FULLNAME': fullname,
                                                   'HIDE_GET_MORE_APPS': settings.HIDE_GET_MORE_APPS,
                                                         'HIDE_SHARING': settings.HIDE_SHARING })
            # error
            err_msg = res.response.get('response_data', '500: Unknown Error')
            return utils.render_template(LOGIN_PAGE, {'ERROR': ErrorStr(err_msg), 'RETURN_URL': '/', 'SETTINGS': settings})
    
    return HttpResponseRedirect(reverse(login))


def login(request, status):
    """
    clear tokens in session, show a login form, get tokens from indivo_server, then redirect to index
    FIXME: make note that account will be disabled after 3 failed logins!!!
    """
    # generate a new session
    request.session.flush()
    
    # set up the template
    FORM_USERNAME = 'username'
    FORM_PASSWORD = 'password'
    FORM_RETURN_URL = 'return_url'
    params = {'SETTINGS': settings}
    if 'did_logout' == status:
        params['MESSAGE'] = _("You were logged out")
    elif 'changed' == status:
        params['MESSAGE'] = _("Your password has been changed")
    
    # process form vars
    if request.method == HTTP_METHOD_GET:
        params['RETURN_URL'] = request.GET.get(FORM_RETURN_URL, '/')
        return utils.render_template(LOGIN_PAGE, params)
    
    if request.method == HTTP_METHOD_POST:
        return_url = request.POST.get(FORM_RETURN_URL, '/')
        params['RETURN_URL'] = return_url
        if request.POST.has_key(FORM_USERNAME) and request.POST.has_key(FORM_PASSWORD):
            username = request.POST[FORM_USERNAME].lower().strip()
            password = request.POST[FORM_PASSWORD]
        else:
            # Also checked initially in js
            params['ERROR'] = ErrorStr('Name or password missing')
            return utils.render_template(LOGIN_PAGE, params)
    else:
        utils.log('error: bad http request method in login. redirecting to /')
        return HttpResponseRedirect('/')
    
    # get tokens from the backend server and save in this user's django session
    try:
        res = tokens_get_from_server(request, username, password)
    except IOError as e:
        if 403 == e.errno:
            params['ERROR'] = ErrorStr('Incorrect credentials')         # a 403 could also mean logging in to a disabled account!
        elif 400 == e.errno:
            params['ERROR'] = ErrorStr('Name or password missing')      # checked before; highly unlikely to ever arrive here
        else:
            params['ERROR'] = ErrorStr(e.strerror)
        return utils.render_template(LOGIN_PAGE, params)
    except Exception as e:
        params['ERROR'] = ErrorStr(e.value)                             # get rid of the damn IUtilsError things!
        return utils.render_template(LOGIN_PAGE, params)
    print 'LOGGED IN, GO TO %s' % (return_url or '/')
    return HttpResponseRedirect(return_url or '/')


def logout(request):
    request.session.flush()
    return HttpResponseRedirect('/login/did_logout')


def change_password(request):
    """
    http://localhost/change_password
    """
    params = {}
    
    if request.method == HTTP_METHOD_POST:
        account_id = request.POST.get('account_id')
        params['ACCOUNT_ID'] = account_id
        
        # get old password
        old_password = request.POST.get('old_pw')
        
        # check new passwords
        pw1 = request.POST.get('pw1')
        if len(pw1) >= (settings.REGISTRATION['min_password_length'] or 8):
            pw2 = request.POST.get('pw2')
            if pw1 == pw2:
                api = get_api(request)
                ret = api.account_change_password(account_id=account_id, data={'old': old_password, 'new': pw1})
                status = ret.response.get('response_status', 0)
                
                # password was reset, log the user in
                if 200 == status:
                    return HttpResponseRedirect('/login/changed')
                elif 403 == status:
                    params['ERROR'] = ErrorStr('Wrong old password')
                else:
                    params['ERROR'] = ErrorStr(ret.response.get('response_data') or 'Password change failed')
            else:
                params['ERROR'] = ErrorStr('Passwords do not match')
        else:
            params['ERROR'] = ErrorStr('Password too short')
    else:
        account_id = urllib.unquote(request.session['oauth_token_set']['account_id'])
        params['ACCOUNT_ID'] = account_id
    
    return utils.render_template('ui/change_password', params)


def register(request):
    """
    http://localhost/change_password
    Returns the register template (GET) or creates a new account (POST)
    """
    if HTTP_METHOD_POST == request.method:
        if not settings.REGISTRATION.get('enable', False):
            return utils.render_template('ui/error', {'error_message': ErrorStr('Registration disabled'), 'error_status': 403})
        
        # create the account
        post = request.POST
        set_primary = settings.REGISTRATION.get('set_primary_secret', 1)
        user_hash = {'account_id': post.get('account_id'),
                 'contact_email': post.get('contact_email'),        # this key is not present in the register form for now
                     'full_name': post.get('full_name'),
              'primary_secret_p': set_primary,
            'secondary_secret_p': settings.REGISTRATION.get('set_secondary_secret', 1)}
        api = IndivoClient(settings.CONSUMER_KEY, settings.CONSUMER_SECRET, settings.INDIVO_SERVER_LOCATION)
        res = api.create_account(user_hash)
        
        # on success, forward to page according to the secrets that were or were not generated
        if 200 == res.get('response_status', 0):
            account_xml = res.get('response_data', '<root/>')
            account = utils.parse_account_xml(account_xml)
            account_id = account.get('id')
            if not set_primary:
                return utils.render_template(LOGIN_PAGE, {'MESSAGE': _('You have successfully registered.') + ' ' + _('After an administrator has approved your account you may login.'), 'SETTINGS': settings})
            
            # display the secondary secret if there is one
            has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
            if has_secondary_secret:
                return utils.render_template('ui/register', {'SETTINGS': settings, 'ACCOUNT_ID': account_id, 'SECONDARY': account.get('secret'), 'MESSAGE': _('You have successfully registered.') + ' ' + _('At the link sent to your email address, enter the following activation code:')})
            return HttpResponseRedirect('/accounts/%s/send_secret/sent' % account_id)
        return utils.render_template('ui/register', {'ERROR': ErrorStr(res.get('response_data', 'Setup failed')), 'SETTINGS': settings})
    return utils.render_template('ui/register', {'SETTINGS': settings})


def send_secret(request, account_id, status):
    """
    http://localhost/accounts/[foo@bar.com/]send_secret/[(sent|wrong)]
    """
    params = {'ACCOUNT_ID': account_id}
    
    if HTTP_METHOD_GET == request.method:
        if account_id:
            if 'wrong' == status:
                params['ERROR'] = ErrorStr('Wrong secret')
            elif 'sent' == status:
                params['MESSAGE'] = _('Use the link sent to your email address to proceed with account activation')
    
    elif HTTP_METHOD_POST == request.method:
        account_id = request.POST.get('account_id', '')
        params['ACCOUNT_ID'] = account_id
        
        # re-send the primary secret and display the secondary, if needed
        if request.POST.get('re_send', False):
            api = IndivoClient(settings.CONSUMER_KEY, settings.CONSUMER_SECRET, settings.INDIVO_SERVER_LOCATION)
            ret = api.account_secret_resend(account_id=account_id)
            
            if 404 == ret.response.get('response_status', 0):
                params['ERROR'] = ErrorStr('Unknown account')
            elif 200 != ret.response.get('response_status', 0):
                params['ERROR'] = ErrorStr(ret.response.get('response_data', 'Server Error'))
            
            # re-sent the primary, display a secondary if there is one
            else:
                params['MESSAGE'] = _('The activation email has been sent')
                
                ret = api.account_info(account_id=account_id)
                status = ret.response.get('response_status', 500)
                if 404 == status:
                    params['ERROR'] = ErrorStr('Unknown account')
                elif 200 != status:
                    params['ERROR'] = ErrorStr(ret.response.get('response_data', 'Server Error'))
                else:
                    account_xml = ret.response.get('response_data', '<root/>')
                    account = utils.parse_account_xml(account_xml)
                    has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
                    if has_secondary_secret:
                        params['MESSAGE'] += '. ' + ('At the link sent to your email address, enter the following activation code:')
                        params['SECONDARY'] = account.get('secret')
        else:
            params['MESSAGE'] = _('Use the link sent to your email address to proceed with account activation')
    
    return utils.render_template('ui/send_secret', params)


def account_init(request, account_id, primary_secret):
    """
    http://localhost/accounts/foo@bar.com/init/icmloNHxQrnCQKNn
    Legacy: http://localhost/indivoapi/accounts/foo@bar.com/initialize/icmloNHxQrnCQKNn
    """
    api = IndivoClient(settings.CONSUMER_KEY, settings.CONSUMER_SECRET, settings.INDIVO_SERVER_LOCATION)
    try_to_init = False
    move_to_setup = False
    
    # is this account already initialized?
    ret = api.account_info(account_id=account_id)
    status = ret.response.get('response_status', 500)
    if 404 == status:
        return utils.render_template(LOGIN_PAGE, {'ERROR': ErrorStr('Unknown account')})
    if 200 != status:
        return utils.render_template('ui/error', {'error_status': status, 'error_message': ErrorStr(ret.response.get('response_data', 'Server Error'))})
    
    account_xml = ret.response.get('response_data', '<root/>')
    account = utils.parse_account_xml(account_xml)
    account_state = account.get('state')
    has_primary_secret = (len(primary_secret) > 0)      # TODO: Get this information from the server (API missing as of now)
    secondary_secret = ''
    has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
    
    # if the account is already active, show login IF at least one auth-system is attached
    if 'uninitialized' != account_state:
        if 'active' == account_state:
            if len(account['auth_systems']) > 0:
                return utils.render_template(LOGIN_PAGE, {'MESSAGE': _('Your account is now active, you may log in below'), 'SETTINGS': settings})
            else:
                move_to_setup = True
        else:
            return utils.render_template(LOGIN_PAGE, {'ERROR': ErrorStr('This account is %s' % account_state), 'SETTINGS': settings})
    
    # bail out if the primary secret is wrong
    if has_primary_secret:
        ret = api.check_account_secrets(account_id=account_id, primary_secret=primary_secret)
        if 200 != ret.response.get('response_status', 0):
            return HttpResponseRedirect('/accounts/%s/send_secret/wrong' % account_id)
    
    # GET the form; if we don't need a secondary secret, continue to the 2nd step automatically
    if HTTP_METHOD_GET == request.method:
        if not has_secondary_secret:
            try_to_init = True
    
    # POSTed the secondary secret
    if HTTP_METHOD_POST == request.method:
        secondary_secret = request.POST.get('conf1') + request.POST.get('conf2')
        try_to_init = True
    
    # try to initialize
    if try_to_init and not move_to_setup:
        data = {}
        if has_secondary_secret:
            data = {'secondary_secret': secondary_secret}
        ret = api.account_initialize(account_id = account_id,
                                 primary_secret = primary_secret,
                                           data = data)
        status = ret.response.get('response_status', 0)
        
        # on success also create the first record if we have a full_name
        if 200 == status:
            if account['fullName'] and len(account['fullName']) > 0:
                record = {'full_name': account['fullName']}
                res = api.create_record(record)
                if 200 != res.get('response_status', 0):
                    utils.log("account_init(): Error creating a record after initializing the account, failing silently. The error was: %s" % res.get('response_data'))
            move_to_setup = True
        elif 404 == status:
            return utils.render_template(LOGIN_PAGE, {'ERROR': ErrorStr('Unknown account')})
        elif 403 == status:
            return utils.render_template('ui/account_init', {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'ERROR': ErrorStr('Wrong confirmation code')})
        else:
            print '-----'
            print 'account_init failed:'
            print ret.response
            print '-----'
            return utils.render_template('ui/account_init', {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'ERROR': ErrorStr('Setup failed')})
    
    # proceed to setup if we have the correct secondary secret
    params = {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'SETTINGS': settings}
    if move_to_setup and (not has_secondary_secret or len(secondary_secret) > 0):
        ret = api.check_account_secrets(account_id=account_id, primary_secret=primary_secret, parameters={'secondary_secret': secondary_secret})
        status = ret.response.get('response_status', 0)
        if 200 == status:
            return HttpResponseRedirect('/accounts/%s/setup/%s/%s' % (account_id, primary_secret, secondary_secret))
        if 403 == status:
            params['ERROR'] = ErrorStr('Wrong confirmation code')
        else:
            params['ERROR'] = ret.response.get('response_data', 'Server Error')
    return utils.render_template('ui/account_init', params)


def account_setup(request, account_id, primary_secret, secondary_secret):
    """
    http://localhost/accounts/foo@bar.com/setup/taOFzInlYlDKLbiM
    """
    api = IndivoClient(settings.CONSUMER_KEY, settings.CONSUMER_SECRET, settings.INDIVO_SERVER_LOCATION)
    
    # is this account already initialized?
    ret = api.account_info(account_id=account_id)
    status = ret.response.get('response_status', 500)
    if 404 == status:
        return utils.render_template(LOGIN_PAGE, {'ERROR': ErrorStr('Unknown account')})
    if 200 != status:
        return utils.render_template('ui/error', {'error_status': status, 'error_message': ErrorStr(ret.response.get('response_data', 'Server Error'))})
    
    account_xml = ret.response.get('response_data', '<root/>')
    account = utils.parse_account_xml(account_xml)
    account_state = account.get('state')
    has_primary_secret = (len(primary_secret) > 0)      # TODO: Get this information from the server (API missing as of now)
    has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
    
    # if the account is already active, show login IF at least one auth-system is attached
    if 'active' == account_state:
        if len(account['auth_systems']) > 0:
            return utils.render_template(LOGIN_PAGE, {'MESSAGE': _('Your account is now active, you may log in below'), 'SETTINGS': settings})
    elif 'uninitialized' != account_state:
        return utils.render_template(LOGIN_PAGE, {'ERROR': ErrorStr('This account is %s' % account_state), 'SETTINGS': settings})
    
    # received POST data, try to setup
    params = {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'SECONDARY_SECRET': secondary_secret, 'SETTINGS': settings}
    if HTTP_METHOD_POST == request.method:
        post = request.POST
        username = post.get('username', '').lower().strip()
        password = post.get('pw1')
        secondary_secret = post.get('secondary_secret', '')
        
        # verify PRIMARY secret first and send back to "resend secret" page if it is wrong
        ret = api.check_account_secrets(account_id=account_id, primary_secret=primary_secret)
        if 200 != ret.response.get('response_status', 0):
            return HttpResponseRedirect('/accounts/%s/send_secret/wrong' % account_id)
        
        # verify SECONDARY secret as well, if there is one
        if has_secondary_secret:
            ret = api.check_account_secrets(account_id=account_id, primary_secret=primary_secret, parameters={'secondary_secret': secondary_secret})
            if 200 != ret.response.get('response_status', 0):
                params['ERROR'] = ErrorStr('Wrong confirmation code')
                return utils.render_template('ui/account_init', params)
        
        # verify passwords
        error = None
        if len(username) < 1:
            error = ErrorStr("Username too short")
        if len(password) < (settings.REGISTRATION['min_password_length'] or 8):
            error = ErrorStr("Password too short")
        elif password != post.get('pw2'):
            error = ErrorStr("Passwords do not match")
        if error is not None:
            params['ERROR'] = error
            return utils.render_template('ui/account_setup', params)
        
        # secrets are ok, passwords check out: Attach the login credentials to the account
        ret = api.add_auth_system(
            account_id = account_id,
            data = {
                  'system': 'password',
                'username': username,
                'password': password
            })
        
        if 200 == ret.response['response_status']:
            # everything's OK, log this person in, hard redirect to change location
            try:
                tokens_get_from_server(request, username, password)
            except IOError as e:
                return utils.render_template(LOGIN_PAGE, {'ERROR': ErrorStr(e.strerror), 'RETURN_URL': request.POST.get('return_url', '/'), 'SETTINGS': settings})
            return HttpResponseRedirect('/')
        elif 400 == ret.response['response_status']:
            params['ERROR'] = ErrorStr('Username already taken')
            return utils.render_template('ui/account_setup', params)
        params['ERROR'] = ErrorStr('account_init_error')
        return utils.render_template('ui/account_setup', params)
    
    # got no secondary_secret, go back to init step which will show a prompt for the secondary secret
    if has_secondary_secret and not secondary_secret:
        return HttpResponseRedirect('/accounts/%s/init/%s' % (account_id, primary_secret))
    return utils.render_template('ui/account_setup', params)


def forgot_password(request):
    """
    http://localhost/forgot_password
    """
    params = {'SETTINGS': settings}
    
    if request.method == HTTP_METHOD_POST:
        email = request.POST.get('account_id')
        
        api = IndivoClient(settings.CONSUMER_KEY, settings.CONSUMER_SECRET, settings.INDIVO_SERVER_LOCATION)
        # get account id from email (which we are assuming is contact email)
        ret = api.account_forgot_password(parameters={'contact_email': email})
        
        # password was reset, show secondary secret
        if 200 == ret.response.get('response_status', 0):
            e = ET.fromstring(ret.response.get('response_data', '<root/>'))
            params['SECONDARY_SECRET'] = e.text
        
        # error resetting, try to find out why
        else:
            params['ERROR'] = ErrorStr(ret.response.get('response_data') or 'Password reset failed')
            params['ACCOUNT_ID'] = email
            if 'Account has not been initialized' == ret.response.get('response_data'):
                params['UNINITIALIZED'] = True
            
    return utils.render_template('ui/forgot_password', params)


def reset_password(request, account_id, primary_secret):
    """
    http://localhost/accounts/foo@bar.com/reset_password/taOFzInlYlDKLbiM
    """
    params = {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'SETTINGS': settings}
    
    if HTTP_METHOD_POST == request.method:
        secondary_secret = request.POST.get('conf1') + request.POST.get('conf2')
        
        # check the validity of the primary and secondary secrets
        api = IndivoClient(settings.CONSUMER_KEY, settings.CONSUMER_SECRET, settings.INDIVO_SERVER_LOCATION)
        ret = api.check_account_secrets(account_id=account_id, primary_secret=primary_secret, parameters={
            'secondary_secret': secondary_secret
        })
        
        # secrets are valid, set the new password:
        if 200 == ret.response.get('response_status', 0):
            params['SECONDARY_SECRET'] = secondary_secret
            
            # get account info
            ret = api.account_info(account_id = account_id)
            account = utils.parse_account_xml(ret.response.get('response_data') or '<root/>')
            
            # check passwords
            pw1 = request.POST.get('pw1')
            if len(pw1) >= (settings.REGISTRATION['min_password_length'] or 8):
                pw2 = request.POST.get('pw2')
                if pw1 == pw2:
                    ret = api.account_set_password(account_id=account_id, data={'password': pw1})
                    
                    # password was reset, log the user in
                    if 200 == ret.response.get('response_status', 0):
                        try:
                            try:
                                username = account['auth_systems'][0]['username']      # TODO: I don't like this...
                                tokens_get_from_server(request, username, pw1)
                            except Exception as e:
                                params['ERROR'] = ErrorStr(str(e))                     # We'll never see this
                            return HttpResponseRedirect(reverse(index))
                        except IOError as e:
                            params['ERROR'] = ErrorStr(e.strerror)
                    else:
                        params['ERROR'] = ErrorStr(ret.response.get('response_data') or 'Password reset failed')
                else:
                    params['ERROR'] = ErrorStr('Passwords do not match')
            else:
                params['ERROR'] = ErrorStr('Password too short')
        
        # wrong secrets (primary or secondary)
        else:
            params['ERROR'] = ErrorStr(ret.response.get('response_data') or 'Wrong confirmation code')
    
    return utils.render_template('ui/reset_password', params)


def account_name(request, account_id):
    """
    http://localhost/accounts/foo@bar.com/name
    """
    api = get_api()
    ret = api.account_info(account_id=account_id)
    status = ret.response.get('response_status', 500)
    dict = {'account_id': account_id}
    if 404 == status:
        dict['error'] = ErrorStr('Unknown account').str()
    elif 200 != status:
        dict['error'] = ErrorStr(ret.response.get('response_data', 'Server Error')).str()
    else:
        account_xml = ret.response.get('response_data', '<root/>')
        account = utils.parse_account_xml(account_xml)
        dict['name'] = account.get('fullName')
    
    return HttpResponse(simplejson.dumps(dict))


##
##  Record Carenet Handling
##
def record_carenet_create(request, record_id):
    """
    Create a new carenet for the given record. POST data must have a name, which must not yet exist for this record
    POST /records/{record_id}/carenets/
    """
    if HTTP_METHOD_POST == request.method:
        name = request.POST.get('name')
        if name:
            api = get_api(request)
            ret = api.create_carenet(record_id=record_id, data={'name': name})
            status = ret.response.get('response_status', 500)
            default_name = _('New carenet')
            has_default_name = (default_name == name)
            
            # if we tried to create a carenet with "New carenet" and it already existed, try again with "New carenet-1" and so on to not annoy the user
            if has_default_name:
                i = 0
                while 200 != status and 'Carenet name is already taken' == ret.response.get('response_data'):
                    i += 1
                    name = '%s-%d' % (default_name, i)
                    ret = api.create_carenet(record_id=record_id, data={'name': name})
                    status = ret.response.get('response_status', 500)
            
            # success
            if 200 == status:
                nodes = ET.fromstring(ret.response.get('response_data', '<root/>')).findall('Carenet')
                tree = nodes[0] if len(nodes) > 0 else None
                if tree is not None:
                    carenet = {'record_id': record_id, 'carenet_id': tree.attrib.get('id'), 'name': tree.attrib.get('name'), 'accounts': [], 'has_default_name': has_default_name}
                    return HttpResponse(simplejson.dumps(carenet))
            
            return HttpResponseBadRequest(ErrorStr(ret.response.get('response_data', 'Error creating carenet')).str())
    
    return HttpResponseBadRequest()


##
##  Carenet Handling
##
def carenet_rename(request, carenet_id):
    """
    POST 'name' to /carenets/{carenet_id}/rename
    """
    if HTTP_METHOD_POST == request.method:
        name = request.POST.get('name')
        if name:
            api = get_api(request)
            ret = api.rename_carenet(carenet_id=carenet_id, data={'name': name})
            status = ret.response.get('response_status', 500)
            if 200 == status:
                nodes = ET.fromstring(ret.response.get('response_data', '<root/>')).findall('Carenet')
                tree = nodes[0] if len(nodes) > 0 else None
                if tree is not None:
                    carenet = {'carenet_id': tree.attrib.get('id'), 'name': tree.attrib.get('name')}
                    return HttpResponse(simplejson.dumps(carenet))
            elif 403 == status:
                return HttpResponseForbidden('You do not have permission to rename carenets')
            return HttpResponseBadRequest(ErrorStr(ret.response.get('response_data', 'Error renaming carenet')).str())
    
    return HttpResponseBadRequest()


def carenet_delete(request, carenet_id):
    """
    DELETE /carenets/{carenet_id}
    """
    if HTTP_METHOD_DELETE == request.method:
        api = get_api(request)
        ret = api.delete_carenet(carenet_id=carenet_id)
        status = ret.response.get('response_status', 500)
        if 200 == status:
            return HttpResponse('ok')
        if 403 == status:
            return HttpResponseForbidden('You do not have permission to delete carenets')
        return HttpResponseBadRequest(ErrorStr(ret.response.get('response_data', 'Error deleting carenet')).str())
    
    return HttpResponseBadRequest()


##
##  Helpers
##
def indivo_api_call_get(request):
    """
    take the call, forward it to the Indivo server with oAuth signature using
    the session-stored oAuth tokens
    """
    if DEBUG:
        utils.log('indivo_api_call_get: ' + request.path)
    
    if not tokens_p(request):
        utils.log('indivo_api_call_get: No oauth_token or oauth_token_secret.. sending to login')
        return HttpResponseRedirect('/login')
    
    # update the IndivoClient object with the tokens stored in the django session
    api = get_api(request)
    
    # strip the leading /indivoapi, do API call, and return result
    if request.method == "POST":
        data = dict((k,v) for k,v in request.POST.iteritems())
    else:
        data = {}
    
    return HttpResponse(api.call(request.method, request.path[10:], options= {'data': data}), mimetype="application/xml")

def indivo_api_call_delete_record_app(request):
    """
    sort of like above but for app delete
    """
    if request.method != HTTP_METHOD_POST:
        return HttpResponseRedirect('/')
    
    if DEBUG:
        utils.log('indivo_api_call_delete_record_app: ' + request.path + ' ' + request.POST['app_id'] + ' ' + request.POST['record_id'])
    
    if not tokens_p(request):
        utils.log('indivo_api_call_delete_record_app: No oauth_token or oauth_token_secret.. sending to login')
        return HttpResponseRedirect('/login')
    
    # update the IndivoClient object with the tokens stored in the django session
    api = get_api(request)
    
    # get the app id from the post, and return to main
    status = api.delete_record_app(record_id=request.POST['record_id'],app_id=request.POST['app_id']).response['response_status']
    
    return HttpResponse(str(status))


##
##  Authorization
##
def record_select(request):
    """
    Displays an account's records when visiting:
    http://localhost/oauth/record_select
    Upon selecting a record, the callback URL is called with the record label and udid attached
    """
    #import pdb; pdb.set_trace()
    api = get_api(request)
    account_id = urllib.unquote(request.session.get('account_id', ''))
    if account_id:
        res = api.read_records(account_id = account_id)
        status = res.response.get('response_status', 500)
        if 404 == status:
            return Http404(ErrorStr('Unknown account').str())
        elif 403 == status:
            return HttpResponseForbidden(ErrorStr('Permission Denied').str())
        elif 200 != status:
            return HttpResponseBadRequest(ErrorStr(res.response.get('response_data', 'Server Error')).str())
        else:
            records_xml = res.response.get('response_data', '<root/>')
            records = [[r.get('id'), r.get('label')] for r in ET.fromstring(records_xml).findall('Record')]
            callback_url = request.GET.get('callback_url')
            return utils.render_template('ui/record_select', {'ACCOUNT_ID': account_id, 'CALLBACK_URL': callback_url, 'RECORD_LIST': records})
    
    url = "%s?return_url=%s" % (reverse(login), urllib.quote(request.get_full_path()))
    return HttpResponseRedirect(url)


def authorize(request):
    """
    If we arrive here via GET:
        If user has no valid token:
            Redirect to login with return_url set to the request URL
        For not yet approved apps:
            Return JSON with some info data, ui_server will then have the user click "OK"
        For already approved apps:
            Silently approve and proceed
    
    If we arrive here via POST:
        Approve the request token in 'oauth_token' for the record id in 'record_id' and redirect to:
        after_auth?oauth_token=<access_token>&oauth_verifier=<oauth_verifier>
    
    app_info (the response_data from the get_request_token_info call) looks something like:
    
    <RequestToken token="LNrHRM1OA6ExcSyq22O0">
        <record id="cface90b-6ca0-4368-827a-2ccd5979ffb7"/>
        <carenet />
        <kind>new</kind>
        <App id="indivoconnector@apps.indivo.org">
            <name>Indivo Connector</name>
            <description>None</description>
            <autonomous>True</autonomous>
    
            <autonomousReason>This app connects to your record to load new data into it while you sleep.</autonomousReason>
    
            <frameable>True</frameable>
            <ui>True</ui>
        </App>
    
        <Permissions>
        </Permissions>
    
    </RequestToken>
    """
    
    # if we don't have a valid token then go to login
    if not tokens_p(request):
        url = "%s?return_url=%s" % (reverse(login), urllib.quote(request.get_full_path()))
        return HttpResponseRedirect(url)
    
    api = get_api(request)
    request_token = request.REQUEST.get('oauth_token')
    callback_url = request.REQUEST.get('oauth_callback')
    
    # process GETs (initial adding and a normal call for this app)
    if request.method == HTTP_METHOD_GET and request.GET.has_key('oauth_token'):
        
        # claim request token and check return value
        res = api.claim_request_token(request_token=request_token)
        if not res or not res.response:
            return utils.render_template('ui/error', {'error_message': 'no response to claim_request_token'})
        
        response_status = res.response.get('response_status', 500)
        if response_status != 200:
            response_message = res.response.get('response_data', 'bad response to claim_request_token')
            return utils.render_template('ui/error', {'error_status': response_status, 'error_message': ErrorStr(response_message)})
        
        # get info on the requent token
        app_info = api.get_request_token_info(request_token=request_token).response['response_data']
        e = ET.fromstring(app_info)
        record_id = e.find('record').attrib.get('id', None)
        carenet_id = e.find('carenet').attrib.get('id', None)
        name = e.findtext('App/name')
        app_id = e.find('App').attrib['id']
        kind = e.findtext('kind')
        description = e.findtext('App/description')
        if description == 'None': description = None # remove me after upgrade of template if tags in django 1.2
        autonomous = e.findtext('App/autonomous')
        if autonomous == 'True': 
            autonomous = True
            autonomousReason = e.findtext('App/autonomousReason')
        else:
            autonomous = False
            autonomousReason = ''
        
        # the "kind" param lets us know if this is app setup or a normal call
        if kind == 'new':
            title = _('Authorize "{{name}}"?').replace('{{name}}', name)
            
            if record_id:
                # single record
                record_xml = api.read_record(record_id = record_id).response['response_data']
                record_node = ET.fromstring(record_xml)
                RECORDS = [[record_node.attrib['id'], record_node.attrib['label']]]
                
                #carenet_els = ET.fromstring(api.get_record_carenets(record_id = record_id).response['response_data']).findall('Carenet')
                #carenets = [{'id': c.attrib['id'], 'name': c.attrib['name']} for c in carenet_els]
                carenets = None
            else:
                records_xml = api.read_records(account_id = urllib.unquote(request.session['account_id'])).response['response_data']
                RECORDS = [[r.get('id'), r.get('label')] for r in ET.fromstring(records_xml).findall('Record')]
                carenets = None
            
            # render a template if we have a callback and thus assume the request does not come from chrome UI
            if callback_url is not None:
                # what to do when we don't have a record_id at this point?
                return utils.render_template('ui/authorize_record', {'REQUEST_TOKEN': request_token,
                                                                      'CALLBACK_URL': callback_url,
                                                                         'RECORD_ID': record_id,
                                                                             'TITLE': title})
            
            # return JSON
            data = {      'app_id': app_id,
                            'name': name,
                           'title': title,
                     'description': description,
                   'request_token': request_token,
                         'records': RECORDS,
                        'carenets': carenets,
                      'autonomous': autonomous,
                'autonomousReason': autonomousReason}
            return HttpResponse(simplejson.dumps(data))
            
        elif kind == 'same':
            # return HttpResponse('fixme: kind==same not implimented yet')
            # in this case we will have record_id in the app_info
            return _approve_and_redirect(request, request_token, record_id, carenet_id)
            
        else:
            return utils.render_template('ui/error', {'error_message': 'bad value for kind parameter'})
    
    
    # process POST -- authorize the given token for the given record_id
    elif request.method == HTTP_METHOD_POST \
        and request.POST.has_key('oauth_token') \
        and request.POST.has_key('record_id'):
        
        app_info = api.get_request_token_info(request_token=request_token).response['response_data']
        e = ET.fromstring(app_info)
        
        record_id = e.find('record').attrib.get('id', None)
        carenet_id = e.find('carenet').attrib.get('id', None)
        #name = e.findtext('App/name')
        app_id = e.find('App').attrib['id']
        #kind = e.findtext('kind')
        #description = e.findtext('App/description')
        
        offline_capable = request.POST.get('offline_capable', False)
        if offline_capable == "0":
            offline_capable = False
        
        # authenticate for this record
        if request.POST.has_key('record_id'):
            location = _approve_and_redirect(request, request_token, request.POST['record_id'], offline_capable = offline_capable)
        
        approved_carenet_ids = request.POST.getlist('carenet_id')
        
        # go through the carenets and add the app to the record
        for approved_carenet_id in approved_carenet_ids:
            api.post_carenet_app(carenet_id = approved_carenet_id, app_id = app_id)
        
        return location
    
    return HttpResponse('bad request method or missing param in request to authorize')


def authorize_cancel(request):
    """docstring for authorize_cancel"""
    pass


def _approve_and_redirect(request, request_token, record_id=None, carenet_id=None, offline_capable=False):
    """
    carenet_id is the carenet that an access token is limited to.
    """
    api = get_api(request)
    data = {}
    if record_id:
        data['record_id'] = record_id
    if carenet_id:
        data['carenet_id'] = carenet_id
    if offline_capable:
        data['offline'] = 1
    
    print 'TRY TO APPROVE %s FOR %s' % (request_token, data.get('record_id'))
    result = api.approve_request_token(request_token=request_token, data=data)
    status = result.response.get('response_status', 0) if result and result.response else 0
    if 200 == status:
        # strip location= (note: has token and verifer)
        location = urllib.unquote(result.response.get('prd')[9:])
        print 'SUCCESS, REDIRECTING TO %s' % location
        return HttpResponseRedirect(location)
    if 403 == status:
        return HttpResponseForbidden(result.response.get('prd'))
    return HttpResponseBadRequest(result.response.get('prd'))


def localize_jmvc_template(request, *args, **kwargs):
    """
    localize JMVC's .ejs templates using django's template engine
    """
    # get static response
    response = serve(request, *args, **kwargs)
    
    # pass it to the template engine
    response_text = response.content
    template = Template(response_text)
    response_localized = template.render(Context({}))
     
    return HttpResponse(response_localized)
