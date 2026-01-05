from rest_framework import serializers
from .models import Post, PostComment


class PostSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    like_count = serializers.IntegerField(read_only=True)
    liked_by_me = serializers.BooleanField(read_only=True)

    class Meta:
        model = Post
        fields = ["id", "content", "tags", "created_at", "author", "like_count", "liked_by_me"]

    def get_author(self, obj):
        u = obj.author
        return {
            "id": u.id,
            "username": getattr(u, "username", ""),
            "email": getattr(u, "email", ""),
            "name": getattr(u, "name", ""),
        }

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = PostComment
        fields = ["id", "post", "content", "created_at", "author"]
        read_only_fields = ["id", "created_at", "author", "post"]

    def get_author(self, obj):
        u = obj.author
        return {
            "id": u.id,
            "username": getattr(u, "username", ""),
            "email": getattr(u, "email", ""),
            "name": getattr(u, "name", ""),
        }