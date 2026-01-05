from django.urls import path
from .views import PostListCreateAPIView, CommentListAPIView, CommentCreateAPIView, PostLikeToggleAPIView

urlpatterns = [
    path("", PostListCreateAPIView.as_view(), name="post-list-create"),
    path("<int:post_id>/comments/", CommentListAPIView.as_view(), name="comment-list"),
    path("<int:post_id>/comments/new/", CommentCreateAPIView.as_view(), name="comment-create"),
    path("<int:post_id>/like-toggle/", PostLikeToggleAPIView.as_view(), name="post-like-toggle"),

]
