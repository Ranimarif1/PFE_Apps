from django.urls import path

from . import views

urlpatterns = [
    path("", views.list_or_create_reports, name="reports_list_create"),
    path("check-exam-id/", views.check_exam_id, name="check_exam_id"),
    path("<str:report_id>", views.get_or_update_report, name="report_detail"),
]

