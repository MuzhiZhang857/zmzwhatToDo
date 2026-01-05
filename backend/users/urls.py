from django.urls import path
from .views import RegisterView, LoginView, LogoutView, MeAPIView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", MeAPIView.as_view()),
]
