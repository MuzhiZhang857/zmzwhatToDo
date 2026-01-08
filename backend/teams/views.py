from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Team, TeamMember, TeamPost
from .serializers import TeamSerializer, TeamMemberSerializer, TeamPostSerializer


class TeamListCreateView(APIView):
    """
    获取我的团队列表 / 创建新团队
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 获取用户创建或加入的所有团队
        memberships = TeamMember.objects.filter(user=request.user)
        teams = [m.team for m in memberships]
        serializer = TeamSerializer(teams, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        try:
            serializer = TeamSerializer(data=request.data, context={"request": request})
            if serializer.is_valid():
                # 保存时自动指定当前用户为 owner
                team = serializer.save(owner=request.user)
                # 创建者默认成为团队的 Admin/Owner 成员
                TeamMember.objects.create(
                    team=team,
                    user=request.user,
                    role=TeamMember.Role.ADMIN
                )
                return Response(
                    TeamSerializer(team, context={"request": request}).data,
                    status=status.HTTP_201_CREATED,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"创建失败: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class JoinTeamByCodeView(APIView):
    """
    通过邀请码加入团队
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('invite_code', '').upper().strip()
        if not code:
            return Response({"error": "请输入邀请码"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            team = get_object_or_404(Team, invite_code=code)

            # 检查是否已经在团队中
            if TeamMember.objects.filter(team=team, user=request.user).exists():
                return Response({"error": "你已经是该团队成员了"}, status=status.HTTP_400_BAD_REQUEST)

            # 加入团队
            TeamMember.objects.create(team=team, user=request.user, role=TeamMember.Role.MEMBER)
            return Response({"message": f"成功加入团队: {team.name}"}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": "邀请码无效或系统错误"}, status=status.HTTP_400_BAD_REQUEST)


class TeamPostView(APIView):
    """
    团队帖子：获取某个团队的所有帖子 / 在团队内发布帖子
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id):
        # 安全检查：只有成员能看帖
        if not TeamMember.objects.filter(team_id=team_id, user=request.user).exists():
            return Response({"error": "你不是该团队成员，无权查看"}, status=status.HTTP_403_FORBIDDEN)

        posts = TeamPost.objects.filter(team_id=team_id)
        serializer = TeamPostSerializer(posts, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request, team_id):
        team = get_object_or_404(Team, id=team_id)

        # 安全检查：只有成员能发帖
        if not TeamMember.objects.filter(team=team, user=request.user).exists():
            return Response({"error": "你不是该团队成员，无权发帖"}, status=status.HTTP_403_FORBIDDEN)

        serializer = TeamPostSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            post = serializer.save(author=request.user, team=team)
            return Response(
                TeamPostSerializer(post, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
