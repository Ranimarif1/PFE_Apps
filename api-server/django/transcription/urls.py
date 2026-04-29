from django.urls import path
from . import views

urlpatterns = [
    path("", views.transcribe),
    path("suggest/", views.suggest),
]
