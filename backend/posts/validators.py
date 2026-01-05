# posts/validators.py
import os

ALLOWED_EXTS = {
    ".png", ".jpg", ".jpeg", ".webp", ".gif",
    ".pdf", ".docx", ".zip",
}

DENY_EXTS = {
    ".exe", ".bat", ".cmd", ".com",
    ".js", ".vbs", ".ps1", ".sh",
    ".jar", ".msi", ".dll",
}

ALLOWED_MIME_PREFIX = ("image/",)
ALLOWED_MIME_EXACT = {
    "application/pdf",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def validate_upload(file_obj):
    name = file_obj.name or ""
    ext = os.path.splitext(name.lower())[1]

    if ext in DENY_EXTS:
        raise ValueError(f"不允许上传可执行或脚本文件：{ext}")

    if ext not in ALLOWED_EXTS:
        raise ValueError(f"文件类型不在白名单中：{ext}")

    content_type = getattr(file_obj, "content_type", "") or ""
    if content_type.startswith(ALLOWED_MIME_PREFIX):
        return
    if content_type in ALLOWED_MIME_EXACT:
        return

    raise ValueError(f"不允许的文件类型：{content_type}")
