from datetime import datetime, date
from django.utils.timezone import make_aware
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from posts.models import Post


def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


class CalendarStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/stats/calendar/?from=YYYY-MM-DD&to=YYYY-MM-DD

        返回：
        {
          "activity": [["2026-01-01", 3], ...],     # 发帖数
          "completion": [["2026-01-01", 5], ...],   # 完成项数（checklist done）
          "meta": {...}
        }
        """
        qs_from = (request.query_params.get("from") or "").strip()
        qs_to = (request.query_params.get("to") or "").strip()

        if not qs_from or not qs_to:
            return Response(
                {"message": "缺少 from/to 参数", "details": {"from": qs_from, "to": qs_to}},
                status=400,
            )

        d1 = _parse_date(qs_from)
        d2 = _parse_date(qs_to)

        # inclusive -> [d1 00:00, d2+1 00:00)
        start = make_aware(datetime(d1.year, d1.month, d1.day, 0, 0, 0))
        end = make_aware(datetime(d2.year, d2.month, d2.day, 0, 0, 0))  # midnight of d2
        # end should be next day
        end = end.replace(day=end.day)  # no-op, clarity

        # 用 ORM 拉出范围内帖子（只算本人，避免隐私争议；你以后做团队再扩展）
        posts = (
            Post.objects.filter(author=request.user, created_at__date__gte=d1, created_at__date__lte=d2)
            .only("id", "type", "checklist_items", "created_at")
            .order_by("created_at")
        )

        activity_map = {}
        completion_map = {}

        for p in posts:
          day = p.created_at.date().isoformat()

          # 活动：发帖数
          activity_map[day] = activity_map.get(day, 0) + 1

          # 完成：仅清单 done 项数（目前系统里唯一“完成语义”）
          if (p.type or "").lower() == "checklist":
              items = p.checklist_items or []
              done_cnt = sum(1 for it in items if isinstance(it, dict) and it.get("done") is True)
              if done_cnt:
                  completion_map[day] = completion_map.get(day, 0) + done_cnt

        activity = [[k, activity_map[k]] for k in sorted(activity_map.keys())]
        completion = [[k, completion_map.get(k, 0)] for k in sorted(set(activity_map.keys()) | set(completion_map.keys()))]

        return Response(
            {
                "activity": activity,
                "completion": completion,
                "meta": {
                    "activity_label": "发帖数",
                    "completion_label": "完成项数（清单勾选）",
                    "scope": "me",
                },
            }
        )
