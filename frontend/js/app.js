// frontend/js/app.js
// 发布 + 动态流渲染（依赖 API.apiFetch 与 API.getAccessToken）

(function () {
  if (!window.API || !API.apiFetch) {
    console.error("API 未加载：请确认 index.html 中先引入 js/api.js 再引入 js/app.js");
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

  function normalizeTags(raw) {
    const s = (raw || "").trim();
    if (!s) return "";
    return s
      .replaceAll("，", ",")
      .replaceAll("#", "")
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .join(",");
  }

  function renderPostCard(post) {
  const authorName =
    post.author?.name || post.author?.username || post.author?.email || "匿名";
  const createdAt = post.created_at ? new Date(post.created_at).toLocaleString() : "";

  const tagsArr = (post.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const tagHtml = tagsArr.length
    ? `<div class="flex flex-wrap gap-2 mb-4">
        ${tagsArr
          .map((t) => `<span class="tag text-xs px-2 py-1 rounded-md">#${escapeHtml(t)}</span>`)
          .join("")}
      </div>`
    : "";

  return `
    <div class="post-card mb-6 p-4" data-post-id="${post.id}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <div class="comment-avatar rounded-full mr-3"></div>
          <div>
            <div class="font-medium">${escapeHtml(authorName)}</div>
            <div class="text-xs text-gray-500">${escapeHtml(createdAt)}</div>
          </div>
        </div>
      </div>

      <div class="mb-3">
        <p>${escapeHtml(post.content)}</p>
      </div>

      ${tagHtml}

      <div class="border-t pt-3">
        <div class="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div>
            <button class="hover:text-gray-700 mr-4" type="button">
              <i class="far fa-heart mr-1"></i> 0
            </button>

            <!-- 评论按钮：必须有 comment-toggle class + data-post-id -->
            <button
              class="hover:text-gray-700 comment-toggle"
              type="button"
              data-post-id="${post.id}"
            >
              <i class="far fa-comment mr-1"></i>
              <span class="comment-count" data-post-id="${post.id}">0</span>
            </button>
          </div>
        </div>

        <!-- 评论面板：默认隐藏，由 comment-system.js 控制 -->
        <div class="comments-panel hidden" data-post-id="${post.id}">
          <div class="comments-list text-sm text-gray-700 space-y-2 mb-3"></div>

          <div class="flex items-center gap-2">
            <input
              class="comment-input flex-1 border rounded p-2 text-sm"
              type="text"
              placeholder="写下你的评论…"
              maxlength="300"
            />
            <button class="comment-submit bg-black text-white px-3 py-2 rounded text-sm" type="button">
              发送
            </button>
          </div>

          <div class="comment-hint text-xs text-gray-500 mt-2 hidden"></div>
        </div>
      </div>
    </div>
  `;
}


  async function loadFeed() {
    const feed = document.getElementById("memo-feed");
    if (!feed) {
      console.warn("未找到 #memo-feed，无法渲染动态流");
      return;
    }

    const posts = await API.apiFetch("/api/posts/", { method: "GET" });

    feed.innerHTML = "";
    if (!Array.isArray(posts) || posts.length === 0) {
      feed.innerHTML = `
        <div class="post-card mb-6 p-4">
          <div class="text-gray-600">暂无动态。发布第一条备忘吧。</div>
        </div>
      `;
      return;
    }

    feed.innerHTML = posts.map(renderPostCard).join("");
  }

  function bindPublish() {
    const textarea = document.getElementById("post-content");
    const tagInput = document.getElementById("post-tags");
    const btn = document.getElementById("publish-btn");

    if (!textarea || !btn) {
      console.warn("未找到发布控件：请确认 index.html 有 #post-content 与 #publish-btn");
      return;
    }

    btn.addEventListener("click", async () => {
      const content = (textarea.value || "").trim();
      const tags = normalizeTags(tagInput ? tagInput.value : "");

      if (!content) {
        alert("内容不能为空");
        return;
      }

      if (!API.getAccessToken()) {
        alert("请先登录");
        window.location.href = "login.html";
        return;
      }

      btn.disabled = true;

      try {
        const created = await API.apiFetch("/api/posts/", {
          method: "POST",
          body: { content, tags },
        });

        // 便于你调试：确认前端拿到了后端返回
        window.__lastCreatedPost = created;
        console.log("发布成功：", created);

        // 清空输入
        textarea.value = "";
        if (tagInput) tagInput.value = "";

        // 插入到顶部
        const feed = document.getElementById("memo-feed");
        if (feed) {
          if (feed.textContent.includes("暂无动态")) {
            feed.innerHTML = "";
          }
          feed.insertAdjacentHTML("afterbegin", renderPostCard(created));
        }
      } catch (e) {
        alert(e.message || "发布失败");
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadFeed();
    } catch (e) {
      console.warn("加载动态失败：", e);
    }
    bindPublish();
  });
})();
