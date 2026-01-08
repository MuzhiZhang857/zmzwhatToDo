import json

from django.db import IntegrityError
from django.db.models import Count, Exists, OuterRef, Value, BooleanField
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Post, PostComment, PostLike, PostAttachment
from .serializers import PostSerializer, CommentSerializer
from .validators import validate_upload


MAX_FILES_PER_POST = 10
MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024  # 20MB


def parse_json_maybe(v, default):
    if v is None:
        return default
    if isinstance(v, (dict, list)):
        return v
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return default
        try:
            return json.loads(s)
        except Exception:
            return default
    return default


class PostListCreateAPIView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        if not user:
            return Response([])

        base_qs = (
            Post.objects.select_related("author")
            .prefetch_related("attachments")
            .filter(author_id=user.id)
            .order_by("-created_at")
        )

        qs = base_qs.annotate(
            like_count=Count("likes", distinct=True),
            liked_by_me=Exists(PostLike.objects.filter(post_id=OuterRef("pk"), user_id=user.id)),
            comment_count=Count("comments", distinct=True),  # ✅ 新增
        )

        return Response(PostSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        # 1) files
        files = request.FILES.getlist("files")
        has_files = bool(files)

        # 2) ✅ 关键：multipart 下 request.data 可能是 QueryDict，转成普通 dict
        raw = request.data
        data = {k: raw.get(k) for k in raw.keys()}

        # 3) multipart 时 meta/checklist_items 可能是字符串 JSON
        data["meta"] = parse_json_maybe(data.get("meta"), {})
        data["checklist_items"] = parse_json_maybe(data.get("checklist_items"), [])

        # 4) 附件限制：数量 / 大小 / 类型（白名单 + 拒绝可执行）
        if files:
            if len(files) > MAX_FILES_PER_POST:
                raise ValidationError({"attachments": [f"附件最多 {MAX_FILES_PER_POST} 个"]})

            for f in files:
                if f.size > MAX_SINGLE_FILE_BYTES:
                    raise ValidationError(
                        {"attachments": [f"单个文件不能超过 {MAX_SINGLE_FILE_BYTES // (1024 * 1024)}MB"]}
                    )

                try:
                    validate_upload(f)
                except ValueError as e:
                    raise ValidationError({"attachments": [str(e)]})

        # 5) 校验帖子主体（允许只发文件/只发代码，但禁止完全空）
        ser = PostSerializer(data=data, context={"has_files": has_files})
        ser.is_valid(raise_exception=True)

        post = Post.objects.create(
            author=request.user,
            type=ser.validated_data.get("type", Post.TYPE_TEXT),
            content=ser.validated_data.get("content", ""),
            tags=ser.validated_data.get("tags", ""),
            meta=ser.validated_data.get("meta", {}),
            checklist_items=ser.validated_data.get("checklist_items", []),
        )

        # 6) 保存附件（已校验，安全落库）
        if files:
            for f in files:
                PostAttachment.objects.create(
                    post=post,
                    file=f,
                    original_name=getattr(f, "name", ""),
                    content_type=getattr(f, "content_type", "") or "",
                    size=getattr(f, "size", 0) or 0,
                )

        # 7) 返回序列化：让前端无需二次请求也有 like/comment 信息
        post.like_count = 0
        post.liked_by_me = False
        post.comment_count = 0  # ✅ 新增

        return Response(
            PostSerializer(post, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CommentListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, post_id: int):
        qs = PostComment.objects.select_related("author").filter(post_id=post_id).all()
        return Response(CommentSerializer(qs, many=True, context={"request": request}).data)


class CommentCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id: int):
        content = (request.data.get("content") or "").strip()
        if not content:
            raise ValidationError({"content": ["评论内容不能为空"]})

        try:
            Post.objects.only("id").get(id=post_id)
        except Post.DoesNotExist:
            raise Http404("帖子不存在")

        comment = PostComment.objects.create(post_id=post_id, author=request.user, content=content)
        return Response(
            CommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PostLikeToggleAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id: int):
        try:
            Post.objects.only("id").get(id=post_id)
        except Post.DoesNotExist:
            raise Http404("帖子不存在")

        existing_like = PostLike.objects.filter(post_id=post_id, user_id=request.user.id).first()

        if existing_like:
            existing_like.delete()
            liked = False
        else:
            try:
                PostLike.objects.create(post_id=post_id, user_id=request.user.id)
                liked = True
            except IntegrityError:
                liked = True

        like_count = PostLike.objects.filter(post_id=post_id).count()
        return Response({"post_id": post_id, "liked": liked, "like_count": like_count})


class ChecklistToggleAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id: int):
        post = get_object_or_404(Post, id=post_id)

        if post.author_id != request.user.id:
            raise PermissionDenied("无权限")

        if post.type != Post.TYPE_CHECKLIST:
            raise ValidationError({"type": ["该帖子不是清单类型"]})

        idx = request.data.get("index", None)
        try:
            idx = int(idx)
        except Exception:
            raise ValidationError({"index": ["index 非法"]})

        items = post.checklist_items or []
        if idx < 0 or idx >= len(items):
            raise ValidationError({"index": ["index 越界"]})

        items[idx]["done"] = not bool(items[idx].get("done", False))
        post.checklist_items = items
        post.save(update_fields=["checklist_items"])

        return Response({"checklist_items": post.checklist_items})


class PostDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, post_id: int):
        post = get_object_or_404(Post, id=post_id)
        if post.author_id != request.user.id:
            raise PermissionDenied("无权限删除")
        post.delete()
        return Response({"message": "已删除"}, status=status.HTTP_200_OK)


class AttachmentDownloadAPIView(APIView):
    """
    受控下载接口：避免 /media/ 直出导致隐私泄露。
    当前策略：仅帖子作者可下载。
    未来做 Team 权限时，在此扩展“团队成员可下载”。
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, attachment_id: int):
        att = (
            PostAttachment.objects.select_related("post", "post__author")
            .filter(id=attachment_id)
            .first()
        )
        if not att:
            raise Http404("附件不存在")

        if att.post.author_id != request.user.id:
            raise PermissionDenied("无权下载该附件")

        resp = FileResponse(att.file.open("rb"), as_attachment=True, filename=att.original_name)
        resp["X-Content-Type-Options"] = "nosniff"
        if att.content_type:
            resp["Content-Type"] = att.content_type
        return resp
