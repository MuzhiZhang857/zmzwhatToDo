from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    扩展用户模型：用于个人中心
    """

    name = models.CharField(max_length=50, blank=True, verbose_name="昵称")

    avatar = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
        verbose_name="头像"
    )

    # ===== 新增字段 =====
    bio = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="一句话简介"
    )

    location = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="所在地"
    )

    gender = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="性别"
    )

    contact = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="联系方式"
    )

    theme_color = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="主题色"
    )

    cover = models.ImageField(
        upload_to="covers/",
        blank=True,
        null=True,
        verbose_name="封面图"
    )

    class Meta:
        verbose_name = "用户"
        verbose_name_plural = "用户"

    def __str__(self):
        return self.username
