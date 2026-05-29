from django.urls import path

from . import views

urlpatterns = [
    path("", views.send_contact, name="contact_send"),
]