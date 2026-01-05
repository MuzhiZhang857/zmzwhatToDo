import json
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse, HttpRequest
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

PASSWORD_MIN_LENGTH = 6  # 通用默认值；如需更严格可改成 8/10


def _json_error(message: str, status: int = 400, **extra) -> JsonResponse:
    payload = {"message": message}
    payload.update(extra)
    return JsonResponse(payload, status=status)


def _parse_json(request: HttpRequest) -> Optional[Dict[str, Any]]:
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _issue_tokens(user) -> Dict[str, str]:
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def _normalize_email(email: str) -> str:
    # 通用做法：去空格、统一小写（避免大小写造成重复账号）
    return (email or "").strip().lower()


def _validate_email_or_400(email: str) -> Optional[JsonResponse]:
    # 仅做“格式合法性”校验，不做域名白名单
    try:
        validate_email(email)
    except ValidationError:
        return _json_error("邮箱格式不正确", 400)
    return None


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(View):
    """
    POST /api/users/register/
    body: {username?, name?, email, password}
    resp: {message, user, access, refresh}
    """

    def post(self, request: HttpRequest) -> JsonResponse:
        data = _parse_json(request)
        if data is None:
            return _json_error("JSON格式错误", 400)

        username = (data.get("username") or "").strip()
        name = (data.get("name") or "").strip()
        email = _normalize_email(data.get("email") or "")
        password = (data.get("password") or "").strip()

        if not email or not password:
            return _json_error("邮箱和密码不能为空", 400)

        if len(password) < PASSWORD_MIN_LENGTH:
            return _json_error(f"密码至少 {PASSWORD_MIN_LENGTH} 位", 400)

        email_err = _validate_email_or_400(email)
        if email_err:
            return email_err

        # username 为空则自动生成：取邮箱 @ 前缀；并规避冲突
        if not username:
            base = email.split("@")[0] if "@" in email else email
            base = base or "user"
            candidate = base
            i = 1
            while User.objects.filter(username=candidate).exists():
                i += 1
                candidate = f"{base}{i}"
            username = candidate

        # 邮箱唯一：大小写不敏感
        if User.objects.filter(email__iexact=email).exists():
            return _json_error("邮箱已注册", 400)

        # 用户名唯一
        if User.objects.filter(username=username).exists():
            return _json_error("用户名已存在", 400)

        user = User.objects.create_user(username=username, email=email, password=password)

        # 可选字段 name：如果你的自定义 User 有这个字段就写入
        if name and hasattr(user, "name"):
            user.name = name
            user.save(update_fields=["name"])

        tokens = _issue_tokens(user)

        return JsonResponse(
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


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(View):
    """
    POST /api/users/login/
    body: {email or username, password}
    resp: {message, user, access, refresh}
    """

    def post(self, request: HttpRequest) -> JsonResponse:
        data = _parse_json(request)
        if data is None:
            return _json_error("JSON格式错误", 400)

        email = _normalize_email(data.get("email") or "")
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()

        if not password or (not email and not username):
            return _json_error("邮箱/用户名和密码不能为空", 400)

        user_obj = None

        # 优先 email 登录（大小写不敏感）
        if email:
            # 这里不强制 validate_email：允许用户输入用户名到 email 框也不至于直接 400
            user_obj = User.objects.filter(email__iexact=email).first()

        # 如果没找到，再用 username
        if user_obj is None and username:
            user_obj = User.objects.filter(username=username).first()

        if user_obj is None or not user_obj.check_password(password):
            return _json_error("账号或密码错误", 400)

        if not user_obj.is_active:
            return _json_error("账号已被禁用", 403)

        tokens = _issue_tokens(user_obj)

        return JsonResponse(
            {
                "message": "登录成功",
                "user": {
                    "id": user_obj.id,
                    "username": user_obj.username,
                    "email": user_obj.email,
                    "name": getattr(user_obj, "name", ""),
                },
                **tokens,
            },
            status=200,
        )


class MeAPIView(APIView):
    """
    GET /api/users/me/
    Header: Authorization: Bearer <access>
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "name": getattr(u, "name", ""),
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(View):
    """
    JWT 模式下无需服务端 logout：前端清 token 即可。
    这里保留接口是为了兼容你的前端按钮调用。
    """

    def post(self, request: HttpRequest) -> JsonResponse:
        return JsonResponse({"message": "已退出（JWT模式：请前端清除token）"}, status=200)
