from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Team, TeamMember, TeamPost

User = get_user_model()

class TeamMemberSerializer(serializers.ModelSerializer):
    """团队成员序列化"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'username', 'email', 'role', 'joined_at']
        read_only_fields = ['joined_at']

class TeamSerializer(serializers.ModelSerializer):
    """团队详情序列化"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    member_count = serializers.IntegerField(source='memberships.count', read_only=True)
    # 自动计算分享链接返回给前端
    share_url = serializers.ReadOnlyField(source='join_url')

    class Meta:
        model = Team
        fields = ['id', 'name', 'description', 'invite_code', 'owner', 'owner_name', 'member_count', 'share_url', 'created_at']
        read_only_fields = ['invite_code', 'owner', 'created_at']

class TeamPostSerializer(serializers.ModelSerializer):
    """团队帖子序列化"""
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = TeamPost
        fields = ['id', 'team', 'author', 'author_name', 'title', 'content', 'meta', 'created_at']
        # ✅ 关键：team 不应由前端提交，author 也不应由前端提交
        read_only_fields = ['team', 'author', 'created_at']
