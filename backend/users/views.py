from typing import Any, Dict, Optional
import json

from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
PASSWORD_MIN_LENGTH = 6


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}

        email = normalize_email(data.get("email"))
        password = (data.get("password") or "").strip()
        username = (data.get("username") or "").strip()
        name = (data.get("name") or "").strip()

        if not email or not password:
            return Response({"message": "邮箱和密码不能为空"}, status=400)

        if len(password) < PASSWORD_MIN_LENGTH:
            return Response({"message": f"密码至少 {PASSWORD_MIN_LENGTH} 位"}, status=400)

        try:
            validate_email(email)
        except ValidationError:
            return Response({"message": "邮箱格式不正确"}, status=400)

        if User.objects.filter(email__iexact=email).exists():
            return Response({"message": "邮箱已注册"}, status=400)

        if not username:
            base = email.split("@")[0]
            username = base
            i = 1
            while User.objects.filter(username=username).exists():
                i += 1
                username = f"{base}{i}"

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        if hasattr(user, "name"):
            user.name = name
            user.save(update_fields=["name"])

        tokens = issue_tokens(user)

        return Response(
            {
                "message": "注册成功",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": getattr(user, "name", ""),
                },
                **tokens,
            },
            status=201,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}

        email = normalize_email(data.get("email"))
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        role = (data.get("role") or "user").strip().lower()

        if not password or (not email and not username):
            return Response({"message": "邮箱/用户名和密码不能为空"}, status=400)

        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()
        if not user and username:
            user = User.objects.filter(username=username).first()

        if not user or not user.check_password(password):
            return Response({"message": "账号或密码错误"}, status=400)

        if not user.is_active:
            return Response({"message": "账号已被禁用"}, status=403)

        if role == "admin" and not (user.is_staff or user.is_superuser):
            return Response({"message": "该账号没有管理员权限"}, status=403)

        tokens = issue_tokens(user)

        return Response(
            {
                "message": "登录成功",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": getattr(user, "name", ""),
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                },
                **tokens,
            }
        )


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "name": getattr(u, "name", ""),
                "is_staff": u.is_staff,
                "is_superuser": u.is_superuser,
            }
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"message": "已退出（JWT 模式）"})
