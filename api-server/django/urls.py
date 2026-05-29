from django.conf import settings
from django.urls import include, path
from django.views.static import serve

from reports.views import analyse_report

urlpatterns = [
    path("api/auth/", include("auth.urls")),
    path("api/analyse/", analyse_report, name="analyse_report"),
    path("api/reports/", include("reports.urls")),
    path("api/complaints/", include("complaints.urls")),
    path("api/avis/", include("avis.urls")),
    path("api/contact/", include("contact.urls")),
    path("api/csv/", include("csvapp.urls")),
    # path("api/transcribe/", include("transcription.urls")),  # Temporarily disabled — torch dependency missing
    path("api/audios/", include("audios.urls")),
    # Serve user avatars publicly. Audios stay behind their own JWT-protected views.
    path("media/avatars/<path:path>", serve, {"document_root": settings.MEDIA_ROOT / "avatars"}),
]
