from django.conf import settings
from django.urls import include, path
from django.views.static import serve

urlpatterns = [
    path("api/auth/", include("auth.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/complaints/", include("complaints.urls")),
    path("api/csv/", include("csvapp.urls")),
    path("api/transcribe/", include("transcription.urls")),
    path("api/audios/", include("audios.urls")),
    # Serve user avatars publicly. Audios stay behind their own JWT-protected views.
    path("media/avatars/<path:path>", serve, {"document_root": settings.MEDIA_ROOT / "avatars"}),
]
