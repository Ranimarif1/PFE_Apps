from django.urls import path
from . import views

urlpatterns = [
    path("stats/",   views.lifecycle_stats,   name="lifecycle_stats"),
    path("run/",     views.lifecycle_run,     name="lifecycle_run"),
    path("history/", views.lifecycle_history, name="lifecycle_history"),
    path("config/",  views.lifecycle_config,  name="lifecycle_config"),
]
