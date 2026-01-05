from django.contrib import admin
from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "created_at", "content_short")
    search_fields = ("content", "tags", "author__username", "author__email")
    list_filter = ("created_at",)

    def content_short(self, obj):
        return (obj.content[:30] + "…") if len(obj.content) > 30 else obj.content
