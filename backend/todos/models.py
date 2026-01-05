from django.db import models
from django.conf import settings

class Todo(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="todos")
    title = models.CharField(max_length=120)
    done = models.BooleanField(default=False)
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)  # ✅新增：完成时间
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["done", "-created_at"]
