"""
Views for Indivo JS UI

"""
# pylint: disable=W0311, C0301
# fixme: rm unused imports
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden, HttpResponseServerError, Http404, HttpRequest
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

from indivo_client_py.oauth2 import Request as OauthRequest

import xml.etree.ElementTree as ET
from lxml import etree
import urllib, re, copy

import utils
from utils import HttpResponseRedirect
import urlparse
from errors import ErrorStr

HTTP_METHOD_GET = 'GET'
HTTP_METHOD_POST = 'POST'
HTTP_METHOD_DELETE = 'DELETE'
LOGIN_PAGE = 'ui/login'
DEBUG = False

# init the IndivoClient python object
from indivo_client_py import IndivoClient

SERVER_PARAMS = {"api_base":settings.INDIVO_SERVER_LOCATION,
                 "authorization_base":settings.INDIVO_UI_SERVER_BASE}
CONSUMER_PARAMS = {"consumer_key": settings.CONSUMER_KEY,
                   "consumer_secret": settings.CONSUMER_SECRET}

# todo: safe for now, but revisit this (maybe make a global api object) later
def get_api(request=None):
    
    api = IndivoClient(SERVER_PARAMS, CONSUMER_PARAMS)
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
    resp, content = api.session_create({'username' : username, 'password' : password})
    if resp['status'] == '200':
        params = dict(urlparse.parse_qsl(content))
        request.session['username'] = username
        request.session['oauth_token_set'] = params
        request.session['account_id'] = urllib.unquote(params['account_id'])
    else:
        try:
            request.session.pop('oauth_token_set')
            request.session.pop('account_id')
        except KeyError:
            pass
        
    if DEBUG:
        utils.log('oauth_token: %(oauth_token)s outh_token_secret: %(oauth_token_secret)s' %
                            request.session['oauth_token_set'])
    
    return (resp, content)

def store_connect_secret(request, raw_credentials):
    xml_etree = etree.XML(raw_credentials)

    credentials = {
        "app_id": xml_etree.find('App').get("id"),
        "connect_token": xml_etree.findtext("ConnectToken"),
        "api_base": xml_etree.findtext('APIBase'), 
        "rest_token":xml_etree.findtext('RESTToken'),          
        "rest_secret": xml_etree.findtext('RESTSecret'), 
        "oauth_header": xml_etree.findtext('OAuthHeader'),
        }
    
    request.session[credentials["connect_token"]] = xml_etree.findtext('ConnectSecret')
    return credentials

def retrieve_connect_secret(request, connect_token_str):
    if connect_token_str:
        return request.session.get(connect_token_str, None)
    return None

def get_connect_credentials(request, account_id, app_email):
    api = get_api(request)
    data = {'record_id': request.GET.get('record_id', ''), 'carenet_id': request.GET.get('carenet_id', '')}
    resp, content = api.get_connect_credentials(account_email=account_id, pha_email=app_email, body=data)
    credentials = store_connect_secret(request, content)
    return HttpResponse(simplejson.dumps(credentials), content_type="application/json")

def index(request):  #MERGE
    if tokens_p(request):
        account_id = urllib.unquote(request.session['oauth_token_set']['account_id'])

        return utils.render_template(request, 'ui/index', { 'ACCOUNT_ID': account_id,
                                                    'SETTINGS': settings})
    
    return HttpResponseRedirect(reverse(login))


def login(request, status):
    """
    clear tokens in session, show a login form, get tokens from indivo_server, then redirect to index or return_url
    FIXME: make note that account will be disabled after x failed logins!!!
    """
    
    # carry over login_return_url should we still have it
    return_url = request.session.get('login_return_url');
    request.session.flush()
    
    # generate a new session and get return_url
    if request.POST.has_key('return_url'):
        return_url = request.POST['return_url']
    elif request.GET.has_key('return_url'):
        return_url = request.GET['return_url']
    
    # save return_url
    if return_url:
        request.session['login_return_url'] = return_url
    
    # set up the template
    FORM_USERNAME = 'username'
    FORM_PASSWORD = 'password'
    params = {'SETTINGS': settings}
    if return_url:
        params['RETURN_URL'] = return_url
    
    if 'did_logout' == status:
        params['MESSAGE'] = _("You were logged out")
    elif 'changed' == status:
        params['MESSAGE'] = _("Your password has been changed")
    
    # process form vars
    if request.method == HTTP_METHOD_GET:
        return utils.render_template(request, LOGIN_PAGE, params)
    
    if request.method == HTTP_METHOD_POST:
        if request.POST.has_key(FORM_USERNAME) and request.POST.has_key(FORM_PASSWORD):
            username = request.POST[FORM_USERNAME].lower().strip()
            password = request.POST[FORM_PASSWORD]
        else:
            # Also checked initially in js
            params['ERROR'] = ErrorStr('Name or password missing')
            return utils.render_template(request, LOGIN_PAGE, params)
    else:
        utils.log('error: bad http request method in login. redirecting to /')
        return HttpResponseRedirect('/')
    
    # get tokens from the backend server and save in this user's django session
    try:
        res, content = tokens_get_from_server(request, username, password)
    except Exception as e:
        params['ERROR'] = ErrorStr(str(e))
        return utils.render_template(request, LOGIN_PAGE, params)
    if res['status'] != '200':
        if '403' == res['status']:
            params['ERROR'] = ErrorStr('Incorrect credentials')         # a 403 could also mean logging in to a disabled account!
        elif '400' == res['status']:
            params['ERROR'] = ErrorStr('Name or password missing')      # checked before; highly unlikely to ever arrive here
        else:
            params['ERROR'] = ErrorStr(content)
        return utils.render_template(request, LOGIN_PAGE, params)
    # we will now return to return_url and can thus delete the stored return url
    if request.session.has_key('login_return_url'):
        del request.session['login_return_url']
    return HttpResponseRedirect(return_url or '/')


def logout(request):
    login_return_url = request.session.get('login_return_url')
    request.session.flush()
    
    # if we had a callback url stored, redirect to that one
    return HttpResponseRedirect(login_return_url or '/login/did_logout')
#    return HttpResponseRedirect('/login/did_logout')


def change_password(request):
    """
    http://localhost/change_password
    """
    params = {}
    
    # POST: Try to set a new password
    if request.method == HTTP_METHOD_POST:
        account_id = request.POST.get('account_id')
        if account_id:
            params['ACCOUNT_ID'] = account_id
            
            # get old password
            old_password = request.POST.get('old_pw')
            
            # check new passwords
            pw1 = request.POST.get('pw1')
            if len(pw1) >= (settings.REGISTRATION['min_password_length'] or 8):
                pw2 = request.POST.get('pw2')
                if pw1 == pw2:
                    api = get_api(request)
                    resp, content = api.account_password_change(account_email=account_id, body={'old': old_password, 'new': pw1})
                    status = resp['status']
                    
                    # password was reset, log the user in
                    if '200' == status:
                        return HttpResponseRedirect('/login/changed')
                    elif '403' == status:
                        params['ERROR'] = ErrorStr('Wrong old password')
                    else:
                        params['ERROR'] = ErrorStr(content or 'Password change failed')
                else:
                    params['ERROR'] = ErrorStr('Passwords do not match')
            else:
                params['ERROR'] = ErrorStr('Password too short')
        else:
            params['ERROR'] = 'No account_id present'
    
    # GET: Show the form, if we are logged in
    else:
        token = request.session.get('oauth_token_set')
        if not token:
            login_url = "%s?return_url=%s" % (reverse(login), urllib.quote(request.get_full_path()))
            return HttpResponseRedirect(login_url)
        
        account_id = urllib.unquote(token.get('account_id') if token else '')
        params['ACCOUNT_ID'] = account_id
    
    return utils.render_template(request, 'ui/change_password', params)


def register(request):
    """
    http://localhost/change_password
    Returns the register template (GET) or creates a new account (POST)
    """
    if HTTP_METHOD_POST == request.method:
        if not settings.REGISTRATION.get('enable', False):
            return utils.render_template(request, 'ui/error', {'error_message': ErrorStr('Registration disabled'), 'error_status': 403})
        
        # create the account
        post = request.POST
        set_primary = settings.REGISTRATION.get('set_primary_secret', 1)
        user_hash = {'account_id': post.get('account_id'),
                 'contact_email': post.get('account_id'),        # TODO:the contact_email key is not present in the register form for now, so use the account_id
                     'full_name': post.get('full_name'),
              'primary_secret_p': set_primary,
            'secondary_secret_p': settings.REGISTRATION.get('set_secondary_secret', 1)}
        api = get_api()
        res, content = api.account_create(body=user_hash)
        
        # on success, forward to page according to the secrets that were or were not generated
        if '200' == res['status']:
            account_xml = content or '<root/>'
            account = utils.parse_account_xml(account_xml)
            account_id = account.get('id')
            if not set_primary:
                return utils.render_template(request, LOGIN_PAGE, {'MESSAGE': _('You have successfully registered.') + ' ' + _('After an administrator has approved your account you may login.'), 'SETTINGS': settings})
            
            # display the secondary secret if there is one
            has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
            if has_secondary_secret:
                return utils.render_template(request, 'ui/register', {'SETTINGS': settings, 'ACCOUNT_ID': account_id, 'SECONDARY': account.get('secret'), 'MESSAGE': _('You have successfully registered.') + ' ' + _('At the link sent to your email address, enter the following confirmation code:')})
            return HttpResponseRedirect('/accounts/%s/send_secret/sent' % account_id)
        return utils.render_template(request, 'ui/register', {'ERROR': ErrorStr((content or 'Setup failed')), 'SETTINGS': settings})
    return utils.render_template(request, 'ui/register', {'SETTINGS': settings})


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
            api = get_api()
            resp, content = api.account_resend_secret(account_email=account_id)
            
            if '404' == resp['status']:
                params['ERROR'] = ErrorStr('Unknown account')
            elif '200' != resp['status']:
                params['ERROR'] = ErrorStr(content or 'Error')
            
            # re-sent the primary, display a secondary if there is one
            else:
                params['MESSAGE'] = _('The activation email has been sent')
                
                resp, content = api.account_info(account_email=account_id)
                status = resp['status']
                if '404' == status:
                    params['ERROR'] = ErrorStr('Unknown account')
                elif '200' != status:
                    params['ERROR'] = ErrorStr(resp.response.get('response_data', 'Server Error'))
                else:
                    account_xml = content or '<root/>'
                    account = utils.parse_account_xml(account_xml)
                    has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
                    if has_secondary_secret:
                        params['MESSAGE'] += '. ' + ('At the link sent to your email address, enter the following confirmation code:')
                        params['SECONDARY'] = account.get('secret')
        else:
            params['MESSAGE'] = _('Use the link sent to your email address to proceed with account activation')
    
    return utils.render_template(request, 'ui/send_secret', params)


def account_init(request, account_id, primary_secret):
    """
    http://localhost/accounts/foo@bar.com/init/icmloNHxQrnCQKNn
    Legacy: http://localhost/indivoapi/accounts/foo@bar.com/initialize/icmloNHxQrnCQKNn
    """
    api = get_api()
    try_to_init = False
    move_to_setup = False
    
    # is this account already initialized?
    resp, content = api.account_info(account_email=account_id)
    status = resp['status']
    if '404' == status:
        return utils.render_template(request, LOGIN_PAGE, {'ERROR': ErrorStr('Unknown account')})
    if '200' != status:
        return utils.render_template(request, 'ui/error', {'error_status': status, 'error_message': ErrorStr(content or 'Server Error')})
    
    account_xml = content or '<root/>'
    account = utils.parse_account_xml(account_xml)
    account_state = account.get('state')
    account_is_uninitialized = ('uninitialized' == account_state)		# TODO: Rewrite server to not set uninitialized upon password reset
    has_auth_system = (len(account.get('auth_systems', [])) > 0)		# TODO: Try to avoid upon account-init rewrite
    has_primary_secret = (len(primary_secret) > 0)      				# TODO: Get this information from the server (API missing as of now)
    secondary_secret = ''
    has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
    can_autocreate_record = True if 'uninitialized' == account_state else False     # TODO: Better: check whether the account has no records
    
    # if the account is already active, show login IF at least one auth-system is attached
    if not account_is_uninitialized:
        if 'active' == account_state:
            if has_auth_system:
                return utils.render_template(request, LOGIN_PAGE, {'MESSAGE': _('Your account is now active, you may log in below'), 'SETTINGS': settings})
            else:
                move_to_setup = True
        else:
            return utils.render_template(request, LOGIN_PAGE, {'ERROR': ErrorStr('This account is %s' % account_state), 'SETTINGS': settings})
    
    # bail out if the primary secret is wrong
    if has_primary_secret:
        resp, content = api.account_check_secrets(account_email=account_id, primary_secret=primary_secret)
        if '200' != resp['status']:
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
        resp, content = api.account_initialize(account_email = account_id,
                                 primary_secret = primary_secret,
                                           body = data)
        status = resp['status']
        
        # on success also create the first record if we have a full_name and is enabled in settings
        if '200' == status:
            if can_autocreate_record and settings.REGISTRATION['autocreate_record'] and account.has_key('fullName') and len(account['fullName']) > 0:
                full_name = account['fullName']
                email = account['contactEmail']
                try:
                    split_index = full_name.index(' ')
                    given_name = full_name[0:split_index]
                    family_name = full_name[split_index:]
                except ValueError:
                    given_name = full_name
                    family_name = full_name
                demographics = '''<Demographics xmlns="http://indivo.org/vocab/xml/documents#">
                                    <dateOfBirth>1939-11-15</dateOfBirth>
                                    <gender>female</gender>
                                    <email>%s</email>
                                    <Name>
                                        <familyName>%s</familyName>
                                        <givenName>%s</givenName>
                                    </Name>
                                </Demographics>''' % (email, family_name, given_name)
                res = _record_create(account_id, demographics)
                if 200 != res.status_code:
                    utils.log("account_init(): Error creating a record after initializing the account, failing silently. The error was: %s" % res.content)
            move_to_setup = True
        elif '404' == status:
            return utils.render_template(request, LOGIN_PAGE, {'ERROR': ErrorStr('Unknown account')})
        elif '403' == status:
            return utils.render_template(request, 'ui/account_init', {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'ERROR': ErrorStr('Wrong confirmation code')})
        else:
            utils.log("account_init(): Error initializing an account: %s" % content)
            return utils.render_template(request, 'ui/account_init', {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'ERROR': ErrorStr('Setup failed')})
    
    # proceed to setup if we have the correct secondary secret
    params = {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'SETTINGS': settings}
    if move_to_setup and (not has_secondary_secret or len(secondary_secret) > 0):
        resp, content = api.account_check_secrets(account_email=account_id, primary_secret=primary_secret, body={'secondary_secret': secondary_secret})
        status = resp['status']
        if '200' == status:
            return HttpResponseRedirect('/accounts/%s/setup/%s/%s' % (account_id, primary_secret, secondary_secret))
        if '403' == status:
            params['ERROR'] = ErrorStr('Wrong confirmation code')
        else:
            params['ERROR'] = content or 'Server Error'
    return utils.render_template(request, 'ui/account_init', params)


def account_setup(request, account_id, primary_secret, secondary_secret):
    """
    http://localhost/accounts/foo@bar.com/setup/taOFzInlYlDKLbiM
    """
    api = get_api()
    
    # is this account already initialized?
    resp, content = api.account_info(account_email=account_id)
    status = resp['status']
    if '404' == status:
        return utils.render_template(request, LOGIN_PAGE, {'ERROR': ErrorStr('Unknown account')})
    if '200' != status:
        return utils.render_template(request, 'ui/error', {'error_status': status, 'error_message': ErrorStr(content or 'Server Error')})
    
    account_xml = content or '<root/>'
    account = utils.parse_account_xml(account_xml)
    account_state = account.get('state')
    has_primary_secret = (len(primary_secret) > 0)      # TODO: Get this information from the server (API missing as of now)
    has_secondary_secret = (None != account.get('secret') and len(account.get('secret')) > 0)
    
    # if the account is already active, show login IF at least one auth-system is attached
    if 'active' == account_state:
        if len(account['auth_systems']) > 0:
            return utils.render_template(request, LOGIN_PAGE, {'MESSAGE': _('Your account is now active, you may log in below'), 'SETTINGS': settings})
    elif 'uninitialized' != account_state:
        return utils.render_template(request, LOGIN_PAGE, {'ERROR': ErrorStr('This account is %s' % account_state), 'SETTINGS': settings})
    
    # received POST data, try to setup
    params = {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'SECONDARY_SECRET': secondary_secret, 'SETTINGS': settings}
    if HTTP_METHOD_POST == request.method:
        post = request.POST
        username = post.get('username', '').lower().strip()
        password = post.get('pw1')
        secondary_secret = post.get('secondary_secret', '')
        
        # verify PRIMARY secret first and send back to "resend secret" page if it is wrong
        resp, content = api.account_check_secrets(account_email=account_id, primary_secret=primary_secret)
        if '200' != resp['status']:
            return HttpResponseRedirect('/accounts/%s/send_secret/wrong' % account_id)
        
        # verify SECONDARY secret as well, if there is one
        if has_secondary_secret:
            resp, content = api.account_check_secrets(account_email=account_id, primary_secret=primary_secret, body={'secondary_secret': secondary_secret})
            if '200' != resp['status']:
                params['ERROR'] = ErrorStr('Wrong confirmation code')
                return utils.render_template(request, 'ui/account_init', params)
        
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
            return utils.render_template(request, 'ui/account_setup', params)
        
        # secrets are ok, passwords check out: Attach the login credentials to the account
        resp, content = api.account_authsystem_add(
            account_email = account_id,
            body = {
                  'system': 'password',
                'username': username,
                'password': password
            })
        
        if '200' == resp['status']:
            # everything's OK, log this person in, hard redirect to change location
            resp, content = tokens_get_from_server(request, username, password)
            if resp['status'] != '200':
                return utils.render_template(request, LOGIN_PAGE, {'ERROR': ErrorStr(content or 'Error Creating Indivo Session'), 'RETURN_URL': request.POST.get('return_url', '/'), 'SETTINGS': settings})
            return HttpResponseRedirect('/')
        elif '400' == resp['status']:
            params['ERROR'] = ErrorStr('Username already taken')
            return utils.render_template(request, 'ui/account_setup', params)
        params['ERROR'] = ErrorStr('account_init_error')
        return utils.render_template(request, 'ui/account_setup', params)
    
    # got no secondary_secret, go back to init step which will show a prompt for the secondary secret
    if has_secondary_secret and not secondary_secret:
        return HttpResponseRedirect('/accounts/%s/init/%s' % (account_id, primary_secret))
    return utils.render_template(request, 'ui/account_setup', params)


def forgot_password(request):
    """
    http://localhost/forgot_password
    """
    params = {'SETTINGS': settings}
    
    if request.method == HTTP_METHOD_POST:
        email = request.POST.get('account_id')
        #MERGE dev_landing did more secondary secret handling
        api = get_api()
        # get account id from email (which we are assuming is contact email)
        resp, content = api.account_forgot_password(account_email=email)
        status = resp['status']
        
        # password was reset, show secondary secret
        if '200' == status:
            e = ET.fromstring(content or '<root/>')
            params['SECONDARY_SECRET'] = e.text
        
        # password was reset, show secondary secret if needed
        if '200' == status:
            params['EMAIL_SENT'] = True
            if settings.PASSWORD_RESET_REQUIRE_SECONDARY:
                e = ET.fromstring(content or '<root/>')
                if not e.text or 'None' == e.text:
                    utils.log('Password reset requires a secondary secret, but this account currently does not have one!')
                    # TODO: Tell the server to generate a secondary secret!
                    # If you arrive here, account generation was not setup properly because it should have created a secondary secret
                    # We return an arbitrary secondary secret as the server will accept any secondary secret in this case
                    e.text = 290385
                
                params['SECONDARY_SECRET'] = e.text
                
        # error resetting, try to find out why
        else:
            if '404' == status:
                params['ERROR'] = ErrorStr('Unknown account')
            else:
                params['ERROR'] = ErrorStr(content or 'Password reset failed')
            params['ACCOUNT_ID'] = email
            if 'Account has not been initialized' == content:
                params['UNINITIALIZED'] = True
    
    return utils.render_template(request, 'ui/forgot_password', params)


def reset_password(request, account_id, primary_secret):
    """
    http://localhost/accounts/foo@bar.com/reset_password/taOFzInlYlDKLbiM
    """
    params = {'ACCOUNT_ID': account_id, 'PRIMARY_SECRET': primary_secret, 'SETTINGS': settings}
    
    if HTTP_METHOD_POST == request.method:
        secondary_secret = request.POST.get('conf1', '') + request.POST.get('conf2', '')
        check_params = {}
        if settings.PASSWORD_RESET_REQUIRE_SECONDARY:
            check_params = { 'secondary_secret': secondary_secret }
        
        # check the validity of the primary and secondary secrets
        api = get_api()
        resp, content = api.account_check_secrets(account_email=account_id, primary_secret=primary_secret, body={
            'secondary_secret': secondary_secret
        })
        
        # secrets are valid, set the new password:
        if '200' == resp['status']:
            params['SECONDARY_SECRET'] = secondary_secret
            
            # get account info
            resp, content = api.account_info(account_email = account_id)
            account = utils.parse_account_xml(content or '<root/>')
            
            # check passwords
            pw1 = request.POST.get('pw1')
            if len(pw1) >= (settings.REGISTRATION['min_password_length'] or 8):
                pw2 = request.POST.get('pw2')
                if pw1 == pw2:
                    resp, content = api.account_password_set(account_email=account_id, body={'password': pw1})
                    #MERGE dev_landing scramble comment
                    # password was reset, log the user in
                    if '200' == resp['status']:
                        # reset the primary secret to void the reset email
                        api.put('/accounts/%s/primary-secret' % account_id)
                        
                        try:
                            try:
                                username = account['auth_systems'][0]['username']      # TODO: I don't like this...
                                tokens_get_from_server(request, username, pw1)
                            except Exception as e:
                                params['ERROR'] = ErrorStr(str(e))                     # We'll never see this
                            return HttpResponseRedirect(reverse(index))
                        
                        except Exception as e:
                            params['ERROR'] = ErrorStr(str(e))
                        except IOError as e:
                            params['ERROR'] = ErrorStr(e.strerror)
                    else:
                        params['ERROR'] = ErrorStr(content or 'Password reset failed')
                else:
                    params['ERROR'] = ErrorStr('Passwords do not match')
            else:
                params['ERROR'] = ErrorStr('Password too short')
        
        # wrong secrets (primary or secondary)
        elif '403' == resp['status']:
            if settings.PASSWORD_RESET_REQUIRE_SECONDARY:
                params['ERROR'] = ErrorStr('Wrong confirmation code')
            else:
                params['ERROR'] = ErrorStr('Wrong secret')
        else:
            params['ERROR'] = ErrorStr(content or 'Wrong confirmation code')
    
    return utils.render_template(request, 'ui/reset_password', params)


def account_name(request, account_id):
    """
    http://localhost/accounts/foo@bar.com/name
    """
    api = get_api()
    resp, content = api.account_info(account_email=account_id)
    status = resp['status']
    dict = {'account_id': account_id}
    if '404' == status:
        dict['error'] = ErrorStr('Unknown account').str()
    elif '200' != status:
        dict['error'] = ErrorStr(ret.response.get('response_data', 'Server Error')).str()
    else:
        account = utils.parse_account_xml(content)
        dict['name'] = account.get('fullName')
    
    return HttpResponse(simplejson.dumps(dict))


##
##  Record Carenet Handling
##
def record_create(request):
    """
    GET+POST to /records/
    GET:  Show the "record_create" template
    POST: Try to create a record
    """
    # is adding records enabled?
    if not settings.ALLOW_ADDING_RECORDS:
        return HttpResponseForbidden(ErrorStr('Adding records is disabled').str())
    
    # are we logged in?
    account_id = request.session.get('account_id')
    if not account_id:
        url = "%s?return_url=%s" % (reverse(login), urllib.quote(request.get_full_path()))
        return HttpResponseRedirect(url)
    
    after_create_url = request.POST.get('after_create_url', request.GET.get('after_create_url', ''))
    params = {'AFTER_CREATE_URL': after_create_url, 'ALLOW_ADDING_RECORDS': settings.ALLOW_ADDING_RECORDS}
    
    # POST, try to create a record
    if HTTP_METHOD_POST == request.method:
        ret = _record_create(account_id, request.body)
        if 200 == ret.status_code:
            if after_create_url:
                return HttpResponseRedirect(after_create_url)
            elif 'json' == request.POST.get('dataType'):
                return ret
            
            params['MESSAGE'] = _('Successfully created new record')
        else:
            params['ERROR'] = ErrorStr(ret.content).str()
    
    # Not POST and not GET
    elif HTTP_METHOD_GET != request.method:
        return HttpResponseBadRequest()
    
    return utils.render_template(request, 'ui/record_create', params)


def _record_create(account_id, demographics):
    """
    Returns an HttpResponse according to the result
    """
    api = get_api()
    res, content = api.record_create(body=demographics)
    status = res['status']
    
    # success, parse XML and change owner to current user
    if '200' == status:
        tree = ET.fromstring(content or '<Record/>')
        if tree is not None:
            record_id = tree.attrib.get('id')
            res, content = api.record_set_owner(record_id=record_id, body=account_id, content_type='text/plain')
            status = res['status']
            if '200' == status:
                record = {'record_id': record_id, 'label': tree.attrib.get('label')}
                return HttpResponse(simplejson.dumps(record))
    
    # failed
    if '403' == status:
        return HttpResponseForbidden()
    return HttpResponseBadRequest(ErrorStr(content or 'Error creating record').str())


def record_carenet_create(request, record_id):
    """
    Create a new carenet for the given record. POST data must have a name, which must not yet exist for this record
    POST /records/{record_id}/carenets/
    """
    if HTTP_METHOD_POST == request.method:
        name = request.POST.get('name')
        if name:
            api = get_api(request)
            resp, content = api.carenet_create(record_id=record_id, body={'name': name})
            status = resp['status']
            default_name = _('New carenet')
            has_default_name = (default_name == name)
            
            # if we tried to create a carenet with "New carenet" and it already existed, try again with "New carenet-1" and so on to not annoy the user
            if has_default_name:
                i = 0
                while '200' != status and 'Carenet name is already taken' == content:       # todo: Hardcoded server resp here, improve (server should return a 409, maybe?)
                    i += 1
                    name = '%s-%d' % (default_name, i)
                    resp, content = api.carenet_create(record_id=record_id, body={'name': name})
                    status = resp['status']
            
            # success
            if '200' == status:
                nodes = ET.fromstring(content or '<root/>').findall('Carenet')
                tree = nodes[0] if len(nodes) > 0 else None
                if tree is not None:
                    tree.attrib['has_default_name'] = '1' if has_default_name else '0'
                    return HttpResponse(ET.tostring(tree))
            
            return HttpResponseBadRequest(ErrorStr(content or 'Error creating carenet').str())
    
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
            resp, content = api.carenet_rename(carenet_id=carenet_id, body={'name': name})
            status = resp['status']
            if '200' == status:
                return HttpResponse(content);
            elif '403' == status:
                return HttpResponseForbidden('You do not have permission to rename carenets')
            return HttpResponseBadRequest(ErrorStr(content or 'Error renaming carenet').str())
    
    return HttpResponseBadRequest()


def carenet_delete(request, carenet_id):
    """
    DELETE /carenets/{carenet_id}
    """
    if HTTP_METHOD_DELETE == request.method:
        api = get_api(request)
        resp, content = api.carenet_delete(carenet_id=carenet_id)
        status = resp['status']
        if '200' == status:
            return HttpResponse('ok')
        if '403' == status:
            return HttpResponseForbidden('You do not have permission to delete carenets')
        return HttpResponseBadRequest(ErrorStr(content or 'Error deleting carenet').str())
    
    return HttpResponseBadRequest()


##
##  Apps
##
def launch_app(request, app_id):
    """ Entry point for a given app.

    If the app does not exist (or another exception occurrs), will render /ui/error with the given error message. On
    success, renders /ui/record_select after the user has logged in. Selecting a record will redirect to launch_app_complete.
    
    """
    
    # make the user login first
    login_url = "%s?return_url=%s" % (reverse(login), urllib.quote(request.get_full_path()))
    account_id = urllib.unquote(request.session.get('account_id', ''))
    if not account_id:
        return HttpResponseRedirect(login_url)
        
    # logged in, check for existence of app
    api = get_api(request)
    resp, content = api.pha(pha_email=app_id)
    status = resp['status']
    if '404' == status:
        return utils.render_template(request, 'ui/error', {'error_message': ErrorStr('No such App').str(), 'error_status': status})
        
    # read account records
    error_message = None
    resp, content = api.record_list(account_email=account_id)
    status = resp['status']
    
    if '404' == status:
        error_message = ErrorStr('Unknown account').str()
    elif '403' == status:
        return HttpResponseRedirect(login_url)
    elif '200' != status:
        error_message = ErrorStr(content or 'Error getting account records').str()
    if error_message:
        return utils.render_template(request, 'ui/error', {'error_message': error_message, 'error_status': status})
    
    # parse records XML
    records_xml = content or '<root/>'
    records_extracted = [[r.get('id'), r.get('label')] for r in ET.fromstring(records_xml).findall('Record')]
    records = []
    for rec_id, rec_label in records_extracted:
        rec_dict = { 'record_id': rec_id, 'carenet_id' : '' }           # TODO: Carenets are not yet supported
        records.append([rec_id, rec_label])

    return utils.render_template(request, 'ui/record_select', {'SETTINGS': settings, 'APP_ID': app_id, 'RECORD_LIST': records})


def launch_app_complete(request, app_id):
    """ Prepare an app's start url for launch, and redirect to it. 

    If this is a POST, then enable the app first (because it was just authorized)
    """

    # make the user login first
    login_url = "%s?return_url=%s" % (reverse(login), urllib.quote(request.get_full_path()))
    account_id = urllib.unquote(request.session.get('account_id', ''))
    if not account_id:
        return HttpResponseRedirect(login_url)

    # If we were just authorized, enable the app
    if request.method == 'POST':
        record_id = request.POST.get('record_id', '')
        carenet_id = ''
        api = get_api(request)
        if record_id and not settings.DISABLE_APP_SETTINGS:
            resp, content = api.record_pha_enable(record_id=record_id, pha_email=app_id)
            status = resp['status']
            if status != '200':
                error_message = ErrorStr("Error enabling the app")
                return utils.render_template(request, 'ui/error', {'error_message': error_message, 'error_status': status})
            
    if request.method == 'GET':
        record_id = request.GET.get('record_id', '')
        carenet_id = request.GET.get('carenet_id', '')

    params_dict = {'record_id':record_id, 'carenet_id':carenet_id}

    # logged in, get information about the desired app
    api = get_api(request)
    resp, content = api.pha(pha_email=app_id)
    status = resp['status']
    error_message = None
    if '404' == status:
        error_message = ErrorStr('No such App').str()
    elif '200' != status:
        error_message = ErrorStr(content or 'Error getting app info').str()
    
    # success, find start URL template
    else:
        app_info_json = content or ''
        app_info = simplejson.loads(app_info_json)
        if not app_info:
            error_message = ErrorStr('Error getting app info')
        else:
            start_url = app_info.get('index')    
            start_url = _interpolate_url_template(app_info.get('index'), params_dict)
            if not start_url:
                error_message = ErrorStr('Error getting app info: no start URL')

    if error_message is not None:
        return utils.render_template(request, 'ui/error', {'error_message': error_message, 'error_status': status})

    # get SMART credentials for the request
    api = get_api(request)
    resp, content = api.get_connect_credentials(account_email=account_id, pha_email=app_id, body=params_dict)
    status = resp['status']
    if status == '403':
        if carenet_id:
            error_message = ErrorStr("This app is not enabled to be run in the selected carenet.")
        elif settings.DISABLE_APP_SETTINGS:
            error_message = ErrorStr("This app is not available")
        elif record_id:
            return utils.render_template(request, 'ui/authorize_record_launch_app',
                                         {'CALLBACK_URL': '/apps/%s/complete/'%app_id,
                                          'RECORD_ID': record_id,
                                          'TITLE': _('Authorize "{{name}}"?').replace('{{name}}', app_info['name'])
})
    elif status != '200':
        error_message = ErrorStr("Error getting account credentials")
    else:
        oauth_header = etree.XML(content).findtext("OAuthHeader")
        if not oauth_header:
            error_message = ErrorStr("Error getting account credentials")

    if error_message is not None:
        return utils.render_template(request, 'ui/error', {'error_message': error_message, 'error_status': status})

    # append the credentials and redirect
    querystring_sep = '&' if '?' in start_url else '?'
    start_url += querystring_sep + "oauth_header=" + oauth_header
    return HttpResponseRedirect(start_url)
    
##
##  Helpers
##
def indivo_api_call_get(request, relative_path):
    """
    take the call, forward it to the Indivo server with oAuth signature using
    the session-stored oAuth tokens OR connect tokens passed in via the request
    """
    
    if DEBUG:
        utils.log('indivo_api_call_get: ' + request.path)
    if not tokens_p(request):
        utils.log('indivo_api_call_get: No oauth_token or oauth_token_secret... sending to login')
        res = HttpResponse("Unauthorized")
        res.status_code = 401
        return res

    # Add a leading slash onto the relative path
    relative_path = "/" + relative_path
    method = request.method

    # Pull in the GET / POST data
    query_dict = copy.copy(request.GET)
    post_dict = copy.copy(request.POST)
    post_data = post_dict or request.body
    
    # Parse the Authorization headers for a connect token, if available
    oauth_request = OauthRequest.from_request('GET', settings.INDIVO_UI_SERVER_BASE, headers=request.META)
    if oauth_request:
        connect_token = oauth_request['connect_token'] or None
        connect_secret = retrieve_connect_secret(request, connect_token)
    else:
        connect_token = connect_secret = None

    # Get the API, signed with a connect token if available, and the session token otherwise
    if connect_token and connect_secret:
        oauth_token = {
            'oauth_token': connect_token,
            'oauth_token_secret': connect_secret
            }
        api = get_api()
        api.update_token(oauth_token)
    else:
        api = get_api(request)

    # Read out content-type from the request.  Apache uses HTTP_CONTENT_TYPE
    content_type = request.META.get('CONTENT_TYPE') or request.META.get('HTTP_CONTENT_TYPE')

    # Make the call, and return the response
    if method == 'GET':
        resp, content = api.get(relative_path, body=query_dict, **(query_dict or {}))       # the body=query_dict is needed to actually have GET params forwarded to the server (pp, 9/24/2012)
    elif method == 'POST':
        resp, content = api.post(relative_path, body=post_data, content_type=content_type, **(query_dict or {}))
    elif method == 'PUT':
        resp, content = api.put(relative_path, body=post_data, content_type=content_type, **(query_dict or {}))
    elif method == 'DELETE':
        resp, content = api.delete(relative_path, **(query_dict or {}))
    
    return HttpResponse(content, status=resp['status'], content_type=resp['content-type'])

def indivo_api_call_delete_record_app(request):
    """
    sort of like above but for app delete
    """
    if request.method != HTTP_METHOD_POST:
        return HttpResponseRedirect('/')
    
    if DEBUG:
        utils.log('indivo_api_call_delete_record_app: ' + request.path + ' ' + request.POST['app_id'] + ' ' + request.POST['record_id'])
    
    if not tokens_p(request):
        utils.log('indivo_api_call_delete_record_app: No oauth_token or oauth_token_secret... sending to login')
        return HttpResponseRedirect('/login')
    
    # update the IndivoClient object with the tokens stored in the django session
    api = get_api(request)
    
    # get the app id from the post, and return to main
    resp, content = api.pha_record_delete(record_id=request.POST['record_id'], pha_email=request.POST['app_id'])
    
    return HttpResponse(resp['status'])


##
##  Authorization
##
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
    
    # process GETs (initially adding an app and a normal call for this app)
    if request.method == HTTP_METHOD_GET and request_token is not None:
        
        # claim request token and check return value
        resp, content = api.request_token_claim(reqtoken_id=request_token)
# TODO: check into case of no response.  Does this make sense now?
#        if not resp or not resp.response: 
#            return utils.render_template(request, 'ui/error', {'error_message': 'no response to claim_request_token'})
        
        response_status = resp['status']
        if response_status != '200':
            response_message = content or 'bad response to claim_request_token'
            return utils.render_template(request, 'ui/error', {'error_status': response_status, 'error_message': ErrorStr(response_message)})
        
        # get info on the request token
        resp, app_info = api.request_token_info(reqtoken_id=request_token)
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
                resp, record_xml = api.record(record_id = record_id)
                record_node = ET.fromstring(record_xml)
                RECORDS = [[record_node.attrib['id'], record_node.attrib['label']]]
                
                #carenet_els = ET.fromstring(api.get_record_carenets(record_id = record_id).response['response_data']).findall('Carenet')
                #carenets = [{'id': c.attrib['id'], 'name': c.attrib['name']} for c in carenet_els]
                carenets = None
            else:
                resp, records_xml = api.record_list(account_email=urllib.unquote(request.session['account_id']))
                RECORDS = [[r.get('id'), r.get('label')] for r in ET.fromstring(records_xml).findall('Record')]
                carenets = None
            
            # render a template if we have a callback and thus assume the request does not come from chrome UI
            request.session['oauth_callback'] = callback_url
            return utils.render_template(request, 'ui/authorize_record', {'REQUEST_TOKEN': request_token,
                                                                      'CALLBACK_URL': callback_url,
                                                                         'RECORD_ID': record_id,
                                                                             'TITLE': title})
        
        elif kind == 'same':
            # return HttpResponse('fixme: kind==same not implimented yet')
            # in this case we will have record_id in the app_info
            return _approve_and_redirect(request, request_token, record_id, carenet_id)
            
        else:
            return utils.render_template(request, 'ui/error', {'error_message': 'bad value for kind parameter'})
    
    
    # process POST -- authorize the given token for the given record_id
    elif request.method == HTTP_METHOD_POST \
        and request.POST.has_key('oauth_token') \
        and request.POST.has_key('record_id'):
        
        resp, content = api.request_token_info(reqtoken_id=request_token)
        e = ET.fromstring(content)
        
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
            api.carenet_apps_create(carenet_id = approved_carenet_id, app_email = app_id)
        
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
    
    resp, content = api.request_token_approve(reqtoken_id=request_token, body=data)
    status = resp['status']
    if '200' == status:
        # strip location= (note: has token and verifer)
        location = urllib.unquote(content[9:])
        return HttpResponseRedirect(location)
    if '403' == status:
        return HttpResponseForbidden(content)
    return HttpResponseBadRequest(content)


def _interpolate_url_template(url, variables):
    """ Interpolates variables into a url which has placeholders enclosed by curly brackets """
    
    new_url = url
    for key in variables:
        new_url = re.sub('{\s*' + key + '\s*}', variables.get(key), new_url)
    
    return new_url


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
