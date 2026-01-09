from rest_framework import serializers
from .models import User


class MeSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "name",
            "bio",
            "location",
            "gender",
            "contact",
            "theme_color",
            "avatar",
            "avatar_url",
            "cover",
            "cover_url",
            "date_joined",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "date_joined",
        ]

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None

    def get_cover_url(self, obj):
        if obj.cover:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.cover.url) if request else obj.cover.url
        return None
