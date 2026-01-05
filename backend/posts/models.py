from django.db import models
from django.conf import settings


class Post(models.Model):
    TYPE_TEXT = "text"
    TYPE_CHECKLIST = "checklist"
    TYPE_CHOICES = [
        (TYPE_TEXT, "Text"),
        (TYPE_CHECKLIST, "Checklist"),
    ]

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )

    content = models.TextField(blank=True, default="")
    tags = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_TEXT)
    meta = models.JSONField(blank=True, default=dict)
    checklist_items = models.JSONField(blank=True, default=list)

    def __str__(self):
        return f"Post({self.id}) by {self.author_id}"


def upload_to_post(instance, filename: str) -> str:
    # media/posts/<post_id>/<filename>
    return f"posts/{instance.post_id}/{filename}"


class PostAttachment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=upload_to_post)
    original_name = models.CharField(max_length=255, blank=True, default="")
    content_type = models.CharField(max_length=120, blank=True, default="")
    size = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_image(self) -> bool:
        ct = (self.content_type or "").lower()
        return ct.startswith("image/")

    def __str__(self):
        return f"Attach({self.id}) post={self.post_id}"


class PostComment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_comments")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class PostLike(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["post", "user"], name="uniq_post_user_like")
        ]

    def __str__(self):
        return f"Like(user={self.user_id}, post={self.post_id})"
