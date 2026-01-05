# backend/exceptions.py
import logging
from django.conf import settings
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def _extract_message(details):
    if isinstance(details, str):
        return details
    if isinstance(details, list) and details:
        return str(details[0])
    if isinstance(details, dict):
        if "non_field_errors" in details and details["non_field_errors"]:
            return str(details["non_field_errors"][0])
        for k, v in details.items():
            if isinstance(v, list) and v:
                return f"{k}: {v[0]}"
            if isinstance(v, str):
                return f"{k}: {v}"
    return "请求参数不合法"


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is not None:
        details = response.data
        message = _extract_message(details)

        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            message = "未登录或登录已过期"
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            message = "无权限执行该操作"
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            message = "资源不存在"

        response.data = {
            "message": message,
            "details": details,
        }
        return response

    logger.exception("Unhandled exception", exc_info=exc)

    if settings.DEBUG:
        return Response(
            {
                "message": "服务器内部错误",
                "details": {"type": exc.__class__.__name__, "error": str(exc)},
            },
            status=500,
        )

    return Response({"message": "服务器内部错误", "details": None}, status=500)
