"""
Widget Views for Indivo JS UI
"""

# todo: rm unused
from django.http import HttpResponse, HttpResponseRedirect, Http404, HttpRequest
from django.contrib.auth.models import User
from django.core.exceptions import *
from django.core.urlresolvers import reverse
from django.core import serializers
from django.db import transaction
from django.conf import settings

import xml.etree.ElementTree as ET
import urllib,logging

import copy

import utils
HTTP_METHOD_GET   = 'GET'
HTTP_METHOD_POST  = 'POST'

DEBUG = True

from views import get_api

def _verify_surl(request):
  url = request.get_full_path()
  api = get_api(request)
  result = ET.fromstring(api.call("GET", "/oauth/internal/surl-verify", {'parameters': {'url': url}}))
  if result.text == "ok":
    return
  else:
    raise Exception("bad signature")

def document_access(request):
  _verify_surl(request)
  return utils.render_template('widgets/document_access', copy.copy(request.GET))
