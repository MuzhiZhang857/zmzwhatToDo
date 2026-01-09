from typing import Any

from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
User = get_user_model()
PASSWORD_MIN_LENGTH = 6
ADMIN_PAGE_SIZE = 10


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


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


def build_cover_url(request, user):
    if not getattr(user, "cover", None):
        return None
    try:
        url = user.cover.url
    except ValueError:
        return None
    return request.build_absolute_uri(url) if request else url


def user_to_dict(request, user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": getattr(user, "name", "") or "",
        "bio": getattr(user, "bio", "") or "",
        "location": getattr(user, "location", "") or "",
        "gender": getattr(user, "gender", "") or "",
        "contact": getattr(user, "contact", "") or "",
        "theme_color": getattr(user, "theme_color", "") or "",
        "avatar_url": build_avatar_url(request, user),
        "cover_url": build_cover_url(request, user),
        "date_joined": user.date_joined,
        "is_staff": bool(getattr(user, "is_staff", False)),
        "is_superuser": bool(getattr(user, "is_superuser", False)),
    }


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

        user = User.objects.create_user(username=username, email=email, password=password)

        if hasattr(user, "name"):
            user.name = name
            user.save(update_fields=["name"])

        tokens = issue_tokens(user)
        return Response(
            {"message": "注册成功", "user": user_to_dict(request, user), **tokens},
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
            if user:
                user = authenticate(request, username=user.username, password=password)
        else:
            user = authenticate(request, username=username, password=password)

        if not user:
            return Response({"message": "账号或密码错误"}, status=401)

        if role == "admin" and not (user.is_staff or user.is_superuser):
            return Response({"message": "该账号没有管理员权限"}, status=403)

        tokens = issue_tokens(user)
        return Response({"message": "登录成功", "user": user_to_dict(request, user), **tokens})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # JWT 无状态，前端清 token 即可；这里保持接口存在，方便前端调用
        return Response({"message": "已退出"})


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        return Response(user_to_dict(request, request.user))

    def patch(self, request):
        u = request.user
        data = request.data or {}

        allow_fields = ["name", "bio", "location", "gender", "contact", "theme_color"]
        update_fields = []

        for f in allow_fields:
            if f in data:
                setattr(u, f, data.get(f) or "")
                update_fields.append(f)

        # 文件字段：必须从 request.FILES 取
        if "avatar" in request.FILES:
            u.avatar = request.FILES["avatar"]
            update_fields.append("avatar")

        if "cover" in request.FILES:
            u.cover = request.FILES["cover"]
            update_fields.append("cover")

        if update_fields:
            u.save(update_fields=list(set(update_fields)))

        return Response(user_to_dict(request, u))

class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = User.objects.all().order_by("-id")[:ADMIN_PAGE_SIZE]
        return Response({"results": [user_to_dict(request, u) for u in qs]})


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id: int):
        u = User.objects.filter(id=user_id).first()
        if not u:
            return Response({"message": "用户不存在"}, status=404)
        return Response(user_to_dict(request, u))


class AdminUserPasswordResetView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id: int):
        u = User.objects.filter(id=user_id).first()
        if not u:
            return Response({"message": "用户不存在"}, status=404)

        new_password = (request.data or {}).get("password") or ""
        new_password = str(new_password).strip()
        if len(new_password) < PASSWORD_MIN_LENGTH:
            return Response({"message": f"密码至少 {PASSWORD_MIN_LENGTH} 位"}, status=400)

        u.set_password(new_password)
        u.save(update_fields=["password"])
        return Response({"message": "密码已重置"})


class SafeTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
