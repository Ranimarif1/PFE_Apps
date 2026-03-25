from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("auth.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/complaints/", include("complaints.urls")),
    path("api/csv/", include("csvapp.urls")),
]
