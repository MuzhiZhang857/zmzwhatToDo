from django.urls import path
from .views import (
    PostListCreateAPIView,
    CommentListAPIView,
    CommentCreateAPIView,
    PostLikeToggleAPIView,
    ChecklistToggleAPIView,
    PostDetailAPIView,
    AttachmentDownloadAPIView,
)

urlpatterns = [
    path("", PostListCreateAPIView.as_view(), name="post-list-create"),
    path("<int:post_id>/comments/", CommentListAPIView.as_view(), name="comment-list"),
    path("<int:post_id>/comments/new/", CommentCreateAPIView.as_view(), name="comment-create"),
    path("<int:post_id>/", PostDetailAPIView.as_view(), name="post-detail"),
    path("<int:post_id>/like-toggle/", PostLikeToggleAPIView.as_view(), name="post-like-toggle"),
    path("<int:post_id>/checklist/toggle/", ChecklistToggleAPIView.as_view(), name="checklist-toggle"),

    # 受控下载：避免 /media/ 直出
    path("attachments/<int:attachment_id>/download/", AttachmentDownloadAPIView.as_view(), name="attachment-download"),
]
