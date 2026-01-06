from django.urls import path
from .views import TeamListCreateView, JoinTeamByCodeView, TeamPostView

urlpatterns = [
    path('', TeamListCreateView.as_view(), name='team-list'),
    path('join/', JoinTeamByCodeView.as_view(), name='team-join'),
    path('<int:team_id>/posts/', TeamPostView.as_view(), name='team-posts'),
]