from django.conf.urls import patterns, include

urlpatterns = patterns('',
    # HARDCODED APP PATHS!! (keep in alpha order)
    (r'^apps/allergies/',       include('apps.allergies.urls')),
    (r'^apps/labs/',            include('apps.labs.urls')),
    (r'^apps/medications/',     include('apps.medications.urls')),
    (r'^apps/problems/',        include('apps.problems.urls')),
    (r'^', include('ui.urls'))  # Everything else to indivo
)
