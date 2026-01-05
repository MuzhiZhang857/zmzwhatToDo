from rest_framework import serializers
from .models import Post, PostComment, PostAttachment


class PostAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()

    class Meta:
        model = PostAttachment
        fields = ["id", "url", "original_name", "content_type", "size", "is_image", "created_at"]

    def get_url(self, obj):
        request = self.context.get("request")
        if not request:
            return ""
        # 受控下载接口（避免 /media/ 直出）
        return request.build_absolute_uri(f"/api/posts/attachments/{obj.id}/download/")

    def get_is_image(self, obj):
        return obj.is_image


class PostSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    like_count = serializers.IntegerField(read_only=True)
    liked_by_me = serializers.BooleanField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)  # ✅ 新增：评论数
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "type",
            "content",
            "tags",
            "meta",
            "checklist_items",
            "created_at",
            "author",
            "like_count",
            "liked_by_me",
            "comment_count",     # ✅ 新增
            "attachments",
        ]

    def get_author(self, obj):
        u = obj.author
        return {
            "id": u.id,
            "username": getattr(u, "username", ""),
            "email": getattr(u, "email", ""),
            "name": getattr(u, "name", ""),
        }

    def get_attachments(self, obj):
        request = self.context.get("request")
        qs = obj.attachments.all().order_by("id")
        return PostAttachmentSerializer(qs, many=True, context={"request": request}).data

    def validate(self, attrs):
        t = (attrs.get("type") or Post.TYPE_TEXT).strip().lower()

        meta = attrs.get("meta")
        if meta is None:
            attrs["meta"] = {}
            meta = attrs["meta"]
        elif not isinstance(meta, dict):
            raise serializers.ValidationError({"meta": "meta 必须是对象(JSON)"})

        if t == Post.TYPE_TEXT:
            content = (attrs.get("content") or "").strip()
            code = (meta.get("code") or "").strip()
            has_files = bool(self.context.get("has_files", False))

            # ✅ 允许“只发文件/只发代码”，但禁止完全空
            if not content and not code and not has_files:
                raise serializers.ValidationError({"content": "内容/附件/代码至少填写一项"})

            attrs["type"] = Post.TYPE_TEXT
            attrs["content"] = content
            attrs["checklist_items"] = []
            return attrs

        if t == Post.TYPE_CHECKLIST:
            raw_items = attrs.get("checklist_items") or []
            if not isinstance(raw_items, list):
                raise serializers.ValidationError({"checklist_items": "清单必须是数组(JSON)"})

            cleaned = []
            for it in raw_items:
                if not isinstance(it, dict):
                    continue
                text = (it.get("text") or "").strip()
                if not text:
                    continue
                cleaned.append({"text": text[:200], "done": bool(it.get("done", False))})

            if not cleaned:
                raise serializers.ValidationError({"checklist_items": "清单至少包含一条有效项"})

            attrs["type"] = Post.TYPE_CHECKLIST
            attrs["checklist_items"] = cleaned
            attrs["content"] = (attrs.get("content") or "").strip()
            return attrs

        raise serializers.ValidationError({"type": "未知的帖子类型"})


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = PostComment
        fields = ["id", "post", "content", "created_at", "author"]
        read_only_fields = ["id", "created_at", "author", "post"]

    def get_author(self, obj):
        u = obj.author
        return {
            "id": u.id,
            "username": getattr(u, "username", ""),
            "email": getattr(u, "email", ""),
            "name": getattr(u, "name", ""),
        }
