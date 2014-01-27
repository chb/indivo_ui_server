"""
Utilities for Indivo

Ben Adida
ben.adida@childrens.harvard.edu
"""


from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.template import RequestContext, loader
from django.conf import settings
from django import http

from xml.dom import minidom
from xml.etree import ElementTree

try:
    from django.forms.fields import email_re
except:
    from django.core.validators import email_re

import django.core.mail as mail
import logging, string, random, types

# taken from pointy-stick.com with some modifications
class MethodDispatcher(object):
    def __init__(self, method_map):
        self.methods= method_map

    def resolve(self, request):
        view_func = self.methods.get(request.method, None)
        return view_func

    def __call__(self, request, *args, **kwargs):
        view_func = self.resolve(request)
        if view_func:
            return view_func(request, *args, **kwargs)
        return http.HttpResponseNotAllowed(self.methods.keys())

def is_valid_email(email):
    return True if email_re.match(email) else False

def random_string(length, choices=[string.letters]):
    # FIXME: seed!
    return "".join([random.choice(''.join(choices)) for i in xrange(length)])

def send_mail(subject, body, sender, recipient):
    # if send mail?
    if settings.SEND_MAIL:
        mail.send_mail(subject, body, sender, recipient)
    else:
        logging.debug("send_mail to set to false, would have sent email to %s" % recipient)

def render_template_raw(request, template_name, vars, type="html"):
    t_obj = loader.get_template('%s.%s' % (template_name, type))
    c_obj = RequestContext(request, vars)
    return t_obj.render(c_obj)

def render_template(request, template_name, vars, type="html"):
    # if hasattr(settings, 'BRANDING') \
    #    and isinstance(settings.BRANDING, types.DictType) \
    #    and len(settings.BRANDING) > 0:
    
    if hasattr(settings, 'BRANDING'):
        vars['branding'] = settings.BRANDING
    content = render_template_raw(request, template_name, vars, type)
    
    if type == "html":
        mimetype = "text/html"
    elif type == "xml":
        mimetype = "application/xml"
    else:
        mimetype = 'text/plain'
    
    return HttpResponse(content, mimetype=mimetype)


def parse_account_xml(xml):
    """
    Parses one node of <Account> type
    """
    if xml is None or 0 == len(xml):
        return {}
    
    tree = ElementTree.fromstring(xml)
    account = { 'id': tree.attrib.get('id', 0), 'type': 'meta' }
    auth_systems = []
    for node in tree:
        if 'authSystem' == node.tag:
            system = {'name': node.attrib['name'], 'username': node.attrib['username']}
            auth_systems.append(system)
        else:
            account[node.tag] = node.text.strip() if node.text else ''
    
    account['auth_systems'] = auth_systems
    return account


# xml stuff
def get_element_value(dom, el):
    try:
        return dom.getElementsByTagName(el)[0].firstChild.nodeValue
    except:
        return ""

# url interpolation
def url_interpolate(url_template, vars):
    """
    interpolate a URL template
    
    TODO: security review this
    """
    result_url = url_template

    # go through the vars and replace
    for var_name in vars.keys():
        result_url = result_url.replace("{%s}" % var_name, vars[var_name])

    return result_url

# is this a browser or a machine?
def is_browser(request):
    """
    determine if the request accepts text/html, in which case
    it's a user at a browser.
    """
    accept_header = request.META.get('HTTP_ACCEPT', False) or request.META.get('ACCEPT', False)
    if accept_header and isinstance(accept_header, str):
      return "text/html" in accept_header.split(',')
    return False

# content type from Django?
def get_content_type(request):
    content_type = None
    if request.META.has_key('CONTENT_TYPE'):
        content_type = request.META['CONTENT_TYPE']
    if not content_type and request.META.has_key('HTTP_CONTENT_TYPE'):
        content_type = request.META['HTTP_CONTENT_TYPE']
    return content_type

logging.basicConfig(
    level = logging.DEBUG,
    format = '%(asctime)s %(levelname)s %(message)s',
)

def log(s):
    logging.debug('\n\n>>> ' + s + '\n\n')
