from typing import Any, Dict, Optional
import json

from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .utils import build_avatar_url

from .utils import build_avatar_url

User = get_user_model()
PASSWORD_MIN_LENGTH = 6
ADMIN_PAGE_SIZE = 10


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def build_avatar_url(request, user):
    if not getattr(user, "avatar", None):
        return None
    try:
        url = user.avatar.url
    except ValueError:
        return None
    return request.build_absolute_uri(url) if request else url


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
                    "avatar_url": build_avatar_url(request, user),
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
                    "avatar_url": build_avatar_url(request, user),
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
                "avatar_url": build_avatar_url(request, u),
            }
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"message": "已退出（JWT 模式）"})


class SafeTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except User.DoesNotExist:
            return Response({"message": "用户不存在"}, status=status.HTTP_401_UNAUTHORIZED)


class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        page_str = (request.query_params.get("page") or "1").strip()
        try:
            page = max(int(page_str), 1)
        except ValueError:
            page = 1

        queryset = User.objects.order_by("-date_joined")
        total = queryset.count()
        total_pages = max((total + ADMIN_PAGE_SIZE - 1) // ADMIN_PAGE_SIZE, 1)
        if page > total_pages:
            page = total_pages
        start = (page - 1) * ADMIN_PAGE_SIZE
        end = start + ADMIN_PAGE_SIZE

        results = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": getattr(user, "name", ""),
                "password_mask": "********",
                "date_joined": user.date_joined.isoformat(),
                "is_superuser": user.is_superuser,
                "avatar_url": build_avatar_url(request, user),
            }
            for user in queryset[start:end]
        ]

        return Response(
            {
                "results": results,
                "pagination": {
                    "page": page,
                    "page_size": ADMIN_PAGE_SIZE,
                    "total": total,
                    "total_pages": total_pages,
                },
            }
        )


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id: int):
        if request.user.id == user_id:
            return Response({"message": "不能删除当前登录账号"}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"message": "用户不存在"}, status=404)

        if user.is_superuser and not request.user.is_superuser:
            return Response({"message": "无权限删除超级管理员"}, status=403)

        user.delete()
        return Response({"message": "已删除"})


class AdminUserPasswordResetView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id: int):
        data = request.data or {}
        password = (data.get("password") or "").strip()

        if len(password) < PASSWORD_MIN_LENGTH:
            return Response({"message": f"密码至少 {PASSWORD_MIN_LENGTH} 位"}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"message": "用户不存在"}, status=404)

        if user.is_superuser and not request.user.is_superuser:
            return Response({"message": "无权限修改超级管理员密码"}, status=403)

        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"message": "密码已更新"})
