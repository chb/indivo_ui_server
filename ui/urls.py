from django.conf.urls.defaults import *
from django.conf import settings
from ui.views import *
from ui.utils import MethodDispatcher
from widget_views import *

# maps url patterns to methods in views.py
urlpatterns = patterns(
    '',
    # testing
    (r'^$', index),
    
    # auth
    (r'^login$', login, {'status': None}),
    (r'^login/(?P<status>[^/]*)', login),
    (r'^logout$', logout),
    (r'^register$', register),
    (r'^change_password$', change_password),
    (r'^forgot_password$', forgot_password),
    
    # Launch an app by its id
    (r'^apps/(?P<app_id>[^/]*)', launch_app),
    
    # account init emails
    # http://localhost/accounts/catherine800@indivohealth.org/init/icmloNHxQrnCQKNn
    # Legacy: http://localhost/indivoapi/accounts/catherine800@indivohealth.org/initialize/icmloNHxQrnCQKNn
    (r'^accounts/send_secret', send_secret, {'account_id': '', 'status': None}),
    (r'^accounts/(?P<account_id>[^/]+)/send_secret$', send_secret, {'status': None}),
    (r'^accounts/(?P<account_id>[^/]+)/send_secret/(?P<status>[^/]*)', send_secret),
    (r'^accounts/(?P<account_id>[^/]+)/init/(?P<primary_secret>[^/]*)', account_init),
    (r'^accounts/(?P<account_id>[^/]+)/setup/(?P<primary_secret>[^/]+)$', account_setup, {'secondary_secret': ''}),
    (r'^accounts/(?P<account_id>[^/]+)/setup/(?P<primary_secret>[^/]+)/(?P<secondary_secret>[^/]*)', account_setup),
    (r'^accounts/(?P<account_id>[^/]+)/reset_password/(?P<primary_secret>[^/]+)', reset_password),
    (r'^accounts/(?P<account_id>[^/]+)/name$', account_name),
    
    # record and carenet handling
    (r'^records/$', record_create),
    (r'^records/(?P<record_id>[^/]+)/carenets/$', record_carenet_create),
    
    # carenet handling
    (r'^carenets/(?P<carenet_id>[^/]+)/rename$', carenet_rename),
    (r'^carenets/(?P<carenet_id>[^/]+)$', MethodDispatcher({'DELETE': carenet_delete})),

    # indivo api calls
    (r'^indivoapi/delete_record_app/$', indivo_api_call_delete_record_app),
    (r'^indivoapi/(?P<relative_path>.+)$', indivo_api_call_get),

    # oauth
    (r'^oauth/authorize$', authorize),
    (r'^accounts/(?P<account_id>[^/]+)/apps/(?P<app_email>[^/]+)/connect_credentials', get_connect_credentials),

    # widgets
    (r'^lib/(?P<path>[^/]*)$', 'django.views.static.serve', {'document_root': settings.SERVER_ROOT_DIR + '/ui/lib'}),
    (r'^widgets/DocumentAccess$', document_access),

    # this could be improved: we could provide shortcuts for things like css, js, etc for less
    # verbose paths in templates, etc., but for now let's keep things very literal
    # for instance:
    # <script type="text/javascript" src="/jmvc/ui/resources/js/jquery-x.js"></script>
    # could be
    # "/js/jquery-x.js" -> /jmvc/ui/resources/js/jquery-x.js

    # This servers JMVC view templates, but passes them trough django's template engine.
    # This allows localization with standart django template tags - trangs, blocktrans
    (r'^jmvc/(?P<path>.*ejs)$', localize_jmvc_template, {'document_root': settings.SERVER_ROOT_DIR + '/ui/jmvc/'}),
    (r'^jmvc/(?P<path>ui/controllers/.*js)$', localize_jmvc_template, {'document_root': settings.SERVER_ROOT_DIR + '/ui/jmvc/'}),
    
    # this just prepends /ui/ to and /jmvc/ path so that we can ignore the django dir structure
    (r'^jmvc/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.SERVER_ROOT_DIR + '/ui/jmvc/'}),
)
