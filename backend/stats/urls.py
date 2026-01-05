from django.urls import path
from .views import CalendarStatsAPIView

urlpatterns = [
    path("calendar/", CalendarStatsAPIView.as_view(), name="calendar-stats"),
]
