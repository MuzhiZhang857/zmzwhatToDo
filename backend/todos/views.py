import json
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils.dateparse import parse_datetime
from django.utils import timezone

from .models import Todo

def require_login(request):
    if not request.user.is_authenticated:
        return JsonResponse({"message": "未登录"}, status=401)
    return None


@method_decorator(csrf_exempt, name="dispatch")
class TodoListCreateView(View):
    def get(self, request):
        err = require_login(request)
        if err: return err

        qs = Todo.objects.filter(owner=request.user).values(
            "id", "title", "done", "due_at", "completed_at", "created_at"
        )
        return JsonResponse({"data": list(qs)}, status=200)

    def post(self, request):
        err = require_login(request)
        if err: return err

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"message": "JSON格式错误"}, status=400)

        title = (data.get("title") or "").strip()
        if not title:
            return JsonResponse({"message": "title 不能为空"}, status=400)

        due_at = data.get("due_at")
        due_dt = parse_datetime(due_at) if due_at else None

        t = Todo.objects.create(owner=request.user, title=title, due_at=due_dt)
        return JsonResponse({"message": "创建成功", "id": t.id}, status=201)


@method_decorator(csrf_exempt, name="dispatch")
class TodoDetailView(View):
    def patch(self, request, todo_id: int):
        err = require_login(request)
        if err: return err

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"message": "JSON格式错误"}, status=400)

        try:
            t = Todo.objects.get(id=todo_id, owner=request.user)
        except Todo.DoesNotExist:
            return JsonResponse({"message": "不存在"}, status=404)

        # title
        if "title" in data:
            t.title = (data.get("title") or "").strip()

        # due_at
        if "due_at" in data:
            due_at = data.get("due_at")
            t.due_at = parse_datetime(due_at) if due_at else None

        # ✅ done + completed_at
        if "done" in data:
            new_done = bool(data.get("done"))
            if new_done and not t.done:
                # False -> True：记录完成时间
                t.done = True
                t.completed_at = timezone.now()
            elif (not new_done) and t.done:
                # True -> False：清空完成时间
                t.done = False
                t.completed_at = None
            # 如果 done 没变化，不改 completed_at

        t.save()
        return JsonResponse({"message": "已更新"}, status=200)

    def delete(self, request, todo_id: int):
        err = require_login(request)
        if err: return err

        deleted, _ = Todo.objects.filter(id=todo_id, owner=request.user).delete()
        if not deleted:
            return JsonResponse({"message": "不存在"}, status=404)
        return JsonResponse({"message": "已删除"}, status=200)
