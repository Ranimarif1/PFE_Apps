from django.urls import path

from . import views

urlpatterns = [
    path("", views.list_or_create_reports, name="reports_list_create"),
    path("<str:report_id>", views.get_or_update_report, name="report_detail"),
]

