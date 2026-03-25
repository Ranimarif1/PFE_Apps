from django.urls import path

from . import views

urlpatterns = [
    path("", views.list_or_create_complaints, name="complaints_list_create"),
    path("<str:complaint_id>", views.update_complaint, name="complaint_update"),
]

