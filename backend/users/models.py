from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    使用 email 作为登录标识，并增加 name 字段
    """
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=50, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]  # Django admin 仍需要 username

    def __str__(self) -> str:
        return self.email
