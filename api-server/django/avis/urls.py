from django.urls import path

from . import views

urlpatterns = [
    path("", views.list_avis, name="avis_list"),
    path("create/", views.create_avis, name="avis_create"),
]
