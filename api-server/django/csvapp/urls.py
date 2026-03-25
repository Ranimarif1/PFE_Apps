from django.urls import path

from . import views

urlpatterns = [
    path("download", views.download_global_csv, name="download_global_csv"),
]

