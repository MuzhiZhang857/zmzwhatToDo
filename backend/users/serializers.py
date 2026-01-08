from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User


class UserPublicSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "name", "email", "avatar_url")

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if not obj.avatar:
            return None
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request else url


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)

    def validate_email(self, value):
        if not value.lower().endswith(".edu.cn") and ".edu." not in value.lower():
            # 你也可以删掉这一条限制
            raise serializers.ValidationError("请使用学校邮箱（edu域名）")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("该邮箱已注册")
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        name = validated_data.get("name", "")
        password = validated_data["password"]

        # username 给一个默认值（不影响你用 email 登录）
        username = email.split("@")[0]

        user = User.objects.create_user(
            username=username,
            email=email,
            name=name,
            password=password,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(username=email, password=password)
        # 注意：因为 USERNAME_FIELD=email，所以 authenticate 传 username=email
        if not user:
            raise serializers.ValidationError("邮箱或密码错误")
        if not user.is_active:
            raise serializers.ValidationError("用户被禁用")
        attrs["user"] = user
        return attrs
