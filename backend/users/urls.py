from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeAPIView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserPasswordResetView,
    SafeTokenRefreshView,
)


urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", MeAPIView.as_view()),
    path("admin/users/", AdminUserListView.as_view()),
    path("admin/users/<int:user_id>/", AdminUserDetailView.as_view()),
    path("admin/users/<int:user_id>/password/", AdminUserPasswordResetView.as_view()),
    path("token/refresh/", SafeTokenRefreshView.as_view()),


]
