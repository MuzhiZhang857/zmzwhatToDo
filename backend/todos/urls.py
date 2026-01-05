from django.urls import path
from .views import TodoListCreateView, TodoDetailView

urlpatterns = [
    path("", TodoListCreateView.as_view()),
    path("<int:todo_id>/", TodoDetailView.as_view()),
]
