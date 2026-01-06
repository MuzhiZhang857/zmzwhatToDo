import uuid
import random
import string
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


def generate_invite_code():
    """生成 8 位随机大写字母加数字的邀请码"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Team(models.Model):
    """
    团队模型：支持邀请码、链接分享基础
    """
    name = models.CharField(max_length=100, verbose_name="团队名称")
    description = models.TextField(blank=True, default="", verbose_name="团队描述")

    # 系统自动生成的唯一邀请码
    invite_code = models.CharField(
        max_length=20,
        unique=True,
        default=generate_invite_code,
        verbose_name="邀请码"
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_teams",
        verbose_name="创建者"
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    class Meta:
        verbose_name = "团队"
        verbose_name_plural = "团队"

    def __str__(self):
        return f"{self.name} ({self.invite_code})"

    @property
    def join_url(self):
        """生成分享链接（前端地址需根据实际部署环境配置）"""
        # 假设前端路由为 /join-team?code=XXXX
        return f"{settings.FRONTEND_URL}/join-team?code={self.invite_code}"


class TeamMember(models.Model):
    """
    团队成员关系模型
    """

    class Role(models.TextChoices):
        ADMIN = 'admin', _('管理员')
        MEMBER = 'member', _('普通成员')

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_joins")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'user')
        verbose_name = "团队成员"
        verbose_name_plural = "团队成员"


class TeamPost(models.Model):
    """
    团队专属帖子：与个人 Post 隔离
    """
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="posts", verbose_name="所属团队")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="发布者")

    title = models.CharField(max_length=200, verbose_name="标题")
    content = models.TextField(verbose_name="正文内容")

    # 保持与个人 Post 类似的 JSONField 扩展性
    meta = models.JSONField(default=dict, blank=True, verbose_name="扩展元数据")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="发布时间")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "团队帖子"
        verbose_name_plural = "团队帖子"

    def __str__(self):
        return f"[{self.team.name}] {self.title}"