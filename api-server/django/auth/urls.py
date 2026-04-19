from django.urls import path

from . import views

urlpatterns = [
    path("register", views.register, name="register"),
    path("send-verification-code", views.send_verification_code, name="send_verification_code"),
    path("verify-email-code", views.verify_email_code, name="verify_email_code"),
    path("login", views.login_view, name="login"),
    path("me", views.me, name="me"),
    path("users", views.list_users, name="list_users"),
    path("users/<str:user_id>/status", views.update_user_status, name="update_user_status"),
    path("users/<str:user_id>/role", views.change_user_role, name="change_user_role"),
    path("users/<str:user_id>", views.delete_user, name="delete_user"),
    path("profile", views.update_profile, name="update_profile"),
    path("forgot-password", views.forgot_password, name="forgot_password"),
    path("reset-password", views.reset_password, name="reset_password"),
]

