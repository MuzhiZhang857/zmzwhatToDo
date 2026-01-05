// frontend/comment-system.js
// 评论系统：展开/收起、加载评论、发表评论、即时渲染
// 依赖：window.API（api.js 提供 API.apiFetch / API.getAccessToken）

(function () {
  if (!window.API || !API.apiFetch) {
    console.error("评论系统初始化失败：API 未加载。请确认先引入 js/api.js");
    return;
  }

  function escapeHtml(s) {
    return (s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPostCard(el) {
    return el.closest(".post-card");
  }

  function getPanelByPostId(postId) {
    return document.querySelector(`.comments-panel[data-post-id="${postId}"]`);
  }

  function setHint(panel, msg, show) {
    const hint = panel.querySelector(".comment-hint");
    if (!hint) return;
    hint.textContent = msg || "";
    hint.classList.toggle("hidden", !show);
  }

  function renderCommentItem(c) {
    const author =
      c.author?.name || c.author?.username || c.author?.email || "匿名";
    const time = c.created_at ? new Date(c.created_at).toLocaleString() : "";
    return `
      <div class="border rounded p-2">
        <div class="flex items-center justify-between mb-1">
          <div class="font-medium">${escapeHtml(author)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(time)}</div>
        </div>
        <div class="text-sm text-gray-700">${escapeHtml(c.content)}</div>
      </div>
    `;
  }

  async function loadComments(postId, panel) {
    const list = panel.querySelector(".comments-list");
    if (!list) return;

    list.innerHTML = `<div class="text-xs text-gray-500">加载中…</div>`;
    setHint(panel, "", false);

    try {
      const comments = await API.apiFetch(`/api/posts/${postId}/comments/`, {
        method: "GET",
      });

      if (!Array.isArray(comments) || comments.length === 0) {
        list.innerHTML = `<div class="text-xs text-gray-500">暂无评论，来做第一个评论的人。</div>`;
      } else {
        list.innerHTML = comments.map(renderCommentItem).join("");
      }

      // 更新评论数显示
      const countEl = document.querySelector(`.comment-count[data-post-id="${postId}"]`);
      if (countEl) countEl.textContent = String(Array.isArray(comments) ? comments.length : 0);
    } catch (e) {
      list.innerHTML = "";
      setHint(panel, e.message || "评论加载失败", true);
    }
  }

  async function submitComment(postId, panel) {
    const input = panel.querySelector(".comment-input");
    const btn = panel.querySelector(".comment-submit");
    const list = panel.querySelector(".comments-list");

    if (!input || !btn || !list) return;

    const content = (input.value || "").trim();
    if (!content) {
      setHint(panel, "评论内容不能为空", true);
      return;
    }

    // JWT 必须存在
    if (!API.getAccessToken()) {
      setHint(panel, "请先登录后再评论", true);
      return;
    }

    btn.disabled = true;
    setHint(panel, "", false);

    try {
      const created = await API.apiFetch(`/api/posts/${postId}/comments/new/`, {
        method: "POST",
        body: { content },
      });

      // 如果原来是“暂无评论”，先清掉
      if (list.textContent.includes("暂无评论")) {
        list.innerHTML = "";
      }

      list.insertAdjacentHTML("beforeend", renderCommentItem(created));
      input.value = "";

      // 更新评论计数：直接 +1（再严谨可以 reload）
      const countEl = document.querySelector(`.comment-count[data-post-id="${postId}"]`);
      if (countEl) {
        const cur = parseInt(countEl.textContent || "0", 10);
        countEl.textContent = String(Number.isFinite(cur) ? cur + 1 : 1);
      }
    } catch (e) {
      setHint(panel, e.message || "发表评论失败", true);
    } finally {
      btn.disabled = false;
    }
  }

  function togglePanel(postId) {
    const panel = getPanelByPostId(postId);
    if (!panel) return;

    const willOpen = panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !willOpen);

    // 展开时才加载（避免每次渲染都请求）
    if (willOpen) {
      // 避免重复拉取：你也可以加 cache 标记
      loadComments(postId, panel);
    }
  }

  // 事件代理：只需要绑定一次
  document.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest(".comment-toggle");
    if (toggleBtn) {
      const postId = toggleBtn.getAttribute("data-post-id");
      if (postId) togglePanel(postId);
      return;
    }

    const submitBtn = e.target.closest(".comment-submit");
    if (submitBtn) {
      const card = getPostCard(submitBtn);
      if (!card) return;
      const postId = card.getAttribute("data-post-id");
      const panel = getPanelByPostId(postId);
      if (postId && panel) submitComment(postId, panel);
    }
  });

  // 回车发送（输入框内按 Enter）
  document.addEventListener("keydown", (e) => {
    const input = e.target.closest(".comment-input");
    if (!input) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const card = getPostCard(input);
      if (!card) return;
      const postId = card.getAttribute("data-post-id");
      const panel = getPanelByPostId(postId);
      if (postId && panel) submitComment(postId, panel);
    }
  });

  console.log("评论系统已加载");
})();
