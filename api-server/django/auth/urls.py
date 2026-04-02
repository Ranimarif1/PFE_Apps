from django.urls import path

from . import views

urlpatterns = [
    path("register", views.register, name="register"),
    path("login", views.login_view, name="login"),
    path("me", views.me, name="me"),
    path("users", views.list_users, name="list_users"),
    path("users/<str:user_id>/status", views.update_user_status, name="update_user_status"),
    path("users/<str:user_id>", views.delete_user, name="delete_user"),
    path("profile", views.update_profile, name="update_profile"),
]

