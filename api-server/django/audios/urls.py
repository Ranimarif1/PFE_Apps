from django.urls import path
from . import views

urlpatterns = [
    path("",                    views.list_or_upload,    name="audios_list_upload"),
    path("training/",           views.training_dataset,  name="training_dataset"),
    path("training/download/",  views.training_download, name="training_download"),
    path("<str:audio_id>/",     views.audio_detail,      name="audio_detail"),
]
