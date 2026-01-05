from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import (
    IsAuthenticated,
    AllowAny,
    IsAuthenticatedOrReadOnly,
)
# 合并导入，包含你需要的全部字段
from django.db.models import Count, Exists, OuterRef, Value, BooleanField
from django.db import IntegrityError

from .models import Post, PostComment, PostLike
from .serializers import PostSerializer, CommentSerializer

class PostListCreateAPIView(APIView):
    """
    GET  /api/posts/        获取动态流（公开）- 包含 like_count & liked_by_me
    POST /api/posts/        发布新备忘（需JWT）
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        # 提前判断用户是否登录，避免在 queryset 里重复判断
        user = request.user if request.user.is_authenticated else None

        base_qs = Post.objects.select_related("author").all()

        if user:
            qs = base_qs.annotate(
                like_count=Count("likes", distinct=True),
                liked_by_me=Exists(
                    PostLike.objects.filter(
                        post_id=OuterRef("pk"),
                        user_id=user.id
                    )
                ),
            )
        else:
            qs = base_qs.annotate(
                like_count=Count("likes", distinct=True),
                liked_by_me=Value(False, output_field=models.BooleanField()),
            )

        serializer = PostSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        content = (request.data.get("content") or "").strip()
        tags = (request.data.get("tags") or "").strip()

        if not content:
            return Response({"message": "内容不能为空"}, status=status.HTTP_400_BAD_REQUEST)

        post = Post.objects.create(
            author=request.user,
            content=content,
            tags=tags,
        )

        # 为新建的帖子手动补齐前端期望的字段，保持列表和创建返回格式一致
        post.like_count = 0
        post.liked_by_me = True  # 因为是自己发的，可以视为已“喜欢”（可选：也可设为 False 看产品需求）

        return Response(PostSerializer(post).data, status=status.HTTP_201_CREATED)


class CommentListAPIView(APIView):
    """
    GET /api/posts/<post_id>/comments/   获取某帖评论（公开）
    """
    permission_classes = [AllowAny]

    def get(self, request, post_id: int):
        qs = PostComment.objects.select_related("author").filter(post_id=post_id).all()
        return Response(CommentSerializer(qs, many=True).data)


class CommentCreateAPIView(APIView):
    """
    POST /api/posts/<post_id>/comments/  发表评论（需JWT）
    body: {content}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id: int):
        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"message": "评论内容不能为空"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            Post.objects.only("id").get(id=post_id)
        except Post.DoesNotExist:
            return Response({"message": "帖子不存在"}, status=status.HTTP_404_NOT_FOUND)

        comment = PostComment.objects.create(
            post_id=post_id,
            author=request.user,
            content=content,
        )
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class PostLikeToggleAPIView(APIView):
    """
    POST /api/posts/<post_id>/like-toggle/   点赞/取消点赞（需登录）
    返回: { "post_id": , "liked": bool, "like_count": int }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id: int):
        # 验证帖子存在
        try:
            Post.objects.only("id").get(id=post_id)
        except Post.DoesNotExist:
            return Response({"message": "帖子不存在"}, status=status.HTTP_404_NOT_FOUND)

        # 尝试查找是否已点赞
        existing_like = PostLike.objects.filter(
            post_id=post_id,
            user_id=request.user.id
        ).first()

        if existing_like:
            # 已赞 → 取消
            existing_like.delete()
            liked = False
        else:
            # 未赞 → 创建
            try:
                PostLike.objects.create(
                    post_id=post_id,
                    user_id=request.user.id
                )
                liked = True
            except IntegrityError:
                # 极少见的高并发重复创建情况，视为已赞
                liked = True

        # 重新计算真实的点赞数
        like_count = PostLike.objects.filter(post_id=post_id).count()

        return Response({
            "post_id": post_id,
            "liked": liked,
            "like_count": like_count
        }, status=status.HTTP_200_OK)