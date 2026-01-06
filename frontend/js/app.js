// frontend/js/app.js
(function () {
  if (!window.API || !API.apiFetch) {
    console.error("API 未加载：请确认先引入 js/api.js");
    return;
  }

window.__postScope = {
  type: "public", // public | team
  teamId: null
};
  function escapeHtml(s) {
    return (s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function splitToTags(raw) {
    const s = (raw || "").trim();
    if (!s) return [];
    return s
      .replaceAll("，", ",")
      .replaceAll("#", "")
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function unique(arr) {
    return Array.from(new Set(arr));
  }

  function safeAlert(err, fallback) {
    alert((err && err.message) || fallback || "操作失败");
  }

  // 发布状态
  let tagChips = [];
  let checklistItems = [];

  function setPostTypeUI(type) {
    const isChecklist = type === "checklist";
    const editor = document.getElementById("checklist-editor");
    const content = document.getElementById("post-content");

    if (editor) editor.classList.toggle("hidden", !isChecklist);

    if (content) {
      content.placeholder = isChecklist ? "清单标题（可选）" : "普通帖：这里写内容…";
      content.classList.toggle("bg-gray-50", isChecklist);
      content.classList.toggle("border-2", isChecklist);
      content.classList.toggle("border-blue-400", isChecklist);
    }
  }

  function renderTagChips() {
    const box = document.getElementById("tags-container");
    if (!box) return;
    box.innerHTML = tagChips
      .map(
        (t) => `
      <span class="chip">
        #${escapeHtml(t)}
        <button type="button" class="tag-remove" data-tag="${escapeHtml(t)}">x</button>
      </span>
    `
      )
      .join("");
  }

  function renderChecklistEditor() {
    const box = document.getElementById("checklist-container");
    if (!box) return;
    if (!checklistItems.length) {
      box.innerHTML = `<div class="text-xs text-gray-500">暂无清单项</div>`;
      return;
    }
    box.innerHTML = checklistItems
      .map(
        (it, idx) => `
      <div class="flex items-center gap-2">
        <span class="text-sm flex-1">${escapeHtml(it.text)}</span>
        <button type="button" class="check-del px-2 py-1 border rounded text-xs" data-idx="${idx}">删除</button>
      </div>
    `
      )
      .join("");
  }

  function renderFilePreview(files) {
    const box = document.getElementById("file-preview");
    if (!box) return;
    if (!files || !files.length) {
      box.innerHTML = `<div class="text-xs text-gray-500">未选择文件</div>`;
      return;
    }

    const imgs = [];
    const others = [];
    for (const f of files) {
      if ((f.type || "").startsWith("image/")) imgs.push(f);
      else others.push(f);
    }

    const imgHtml = imgs.length
      ? `
      <div class="img-grid mb-2">
        ${imgs
          .map((f) => {
            const url = URL.createObjectURL(f);
            return `<img src="${url}" alt="${escapeHtml(f.name)}" title="${escapeHtml(f.name)}" />`;
          })
          .join("")}
      </div>
    `
      : "";

    const otherHtml = others.length
      ? `
      <div class="text-sm text-gray-600">
        ${others
          .map(
            (f) =>
              `<div class="file-row"><span class="text-xs text-gray-500">附件</span><span>${escapeHtml(
                f.name
              )}</span></div>`
          )
          .join("")}
      </div>
    `
      : "";

    box.innerHTML = imgHtml + otherHtml;
  }

  function renderTags(tags) {
    const tagsArr = (tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tagsArr.length) return "";
    return `
      <div class="flex flex-wrap gap-2 mb-4">
        ${tagsArr.map((t) => `<span class="tag text-xs px-2 py-1 rounded-md">#${escapeHtml(t)}</span>`).join("")}
      </div>
    `;
  }

  // ✅ 更稳健：只有 type=checklist 且 checklist_items 为数组 才渲染为清单
  function isChecklistPost(post) {
    return post?.type === "checklist" && Array.isArray(post.checklist_items);
  }

  function renderChecklist(post) {
    const items = Array.isArray(post.checklist_items) ? post.checklist_items : [];
    const liHtml = items
      .map((it, idx) => {
        const done = !!it.done;
        return `
        <li class="flex items-center gap-2 py-1">
          <button class="check-toggle px-2 py-1 border rounded text-xs"
            data-post-id="${post.id}" data-index="${idx}" type="button">
            ${done ? "已完成" : "待办"}
          </button>
          <span class="${done ? "check-item-done" : ""}">${escapeHtml(it.text || "")}</span>
        </li>
      `;
      })
      .join("");

    const title = (post.content || "").trim();
    return `
      <div class="mb-3">
        ${title ? `<div class="mb-2 font-medium">${escapeHtml(title)}</div>` : ""}
        <ul class="pl-1">${liHtml || `<li class="text-sm text-gray-500">清单为空</li>`}</ul>
      </div>
    `;
  }

  function renderAttachments(post) {
    const atts = Array.isArray(post.attachments) ? post.attachments : [];
    if (!atts.length) return "";

    const imgs = atts.filter((a) => a.is_image && a.url);
    const files = atts.filter((a) => !a.is_image && a.url);

    const imgHtml = imgs.length
      ? `
      <div class="img-grid mb-3">
        ${imgs
          .map(
            (a) =>
              `<a href="${a.url}" target="_blank" rel="noopener"><img src="${a.url}" alt="${escapeHtml(
                a.original_name || "image"
              )}" /></a>`
          )
          .join("")}
      </div>
    `
      : "";

    const fileHtml = files.length
      ? `
      <div class="mb-3">
        <div class="text-sm text-gray-600 mb-1">附件</div>
        ${files
          .map(
            (a) => `
          <div class="file-row">
            <span class="text-xs text-gray-500">下载</span>
            <a href="${a.url}" target="_blank" rel="noopener">${escapeHtml(a.original_name || "file")}</a>
            <span class="text-xs text-gray-400">${Math.round((a.size || 0) / 1024)} KB</span>
          </div>
        `
          )
          .join("")}
      </div>
    `
      : "";

    return imgHtml + fileHtml;
  }

  function renderCodeBlock(post) {
    const meta = post.meta || {};
    const code = (meta.code || "").trim();
    if (!code) return "";
    const lang = (meta.code_lang || "").trim();
    const cls = lang ? `language-${escapeHtml(lang)}` : "";
    return `
      <div class="mb-3">
        <pre class="border rounded p-3 overflow-auto text-sm"><code class="${cls}">${escapeHtml(code)}</code></pre>
      </div>
    `;
  }

  function renderPostBody(post) {
    if (isChecklistPost(post)) return renderChecklist(post);
    return `<div class="mb-3"><p class="whitespace-pre-wrap">${escapeHtml(post.content)}</p></div>`;
  }

  function renderCommentsArea(postId) {
    return `
      <div class="comments mt-3 hidden" data-post-id="${postId}" data-loaded="0">
        <div class="comment-list text-sm text-gray-600 mb-2">加载中…</div>
        <div class="flex gap-2">
          <input class="comment-input flex-1 border rounded px-2 py-1 text-sm" placeholder="写评论…" maxlength="500" />
          <button class="comment-send px-3 py-1 bg-black text-white rounded text-sm" data-post-id="${postId}" type="button">发送</button>
        </div>
      </div>
    `;
  }

  function renderPostCard(post) {
  const authorName = post.author?.name || post.author?.username || post.author?.email || "匿名";
  const createdAt = post.created_at ? new Date(post.created_at).toLocaleString() : "";
  const tagHtml = renderTags(post.tags);

  const likeCount = Number(post.like_count || 0);
  const liked = Boolean(post.liked_by_me);
  const commentCount = Number(post.comment_count || 0);

  const typeBadge = isChecklistPost(post)
    ? `<span class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">清单</span>`
    : `<span class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">文本</span>`;

  // ✅ 统一的操作按钮样式（点赞/评论一致）
  const actionBtnBase =
    "inline-flex items-center gap-1 px-2 py-1 rounded border border-transparent " +
    "hover:bg-gray-50 hover:border-gray-200 transition";

  const likeBtnClass = liked ? `${actionBtnBase} text-red-600` : `${actionBtnBase} text-gray-600`;
  const commentBtnClass = `${actionBtnBase} text-gray-600`;

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
        ${typeBadge}
      </div>

      ${renderPostBody(post)}
      ${renderAttachments(post)}
      ${renderCodeBlock(post)}
      ${tagHtml}

      <div class="border-t pt-3 text-sm flex items-center gap-3">
        <button class="like-toggle ${likeBtnClass}" data-post-id="${post.id}" type="button">
          <span class="select-none">❤</span>
          <span class="like-count">${likeCount}</span>
        </button>

        <button class="comment-toggle ${commentBtnClass}" data-post-id="${post.id}" type="button">
          <span class="select-none">💬</span>
          <span class="comment-count">${commentCount}</span>
        </button>
      </div>

      ${renderCommentsArea(post.id)}
    </div>
  `;
}

  async function loadFeed() {
    const feed = document.getElementById("memo-feed");
    if (!feed) return;

    const posts = await API.apiFetch("/api/posts/", { method: "GET" });

    window.__postsById = {};
    posts.forEach((p) => (window.__postsById[String(p.id)] = p));

    feed.innerHTML = posts.length
      ? posts.map(renderPostCard).join("")
      : `<div class="post-card p-4 text-gray-600">暂无动态</div>`;

    if (window.hljs) {
      document.querySelectorAll("pre code").forEach((el) => window.hljs.highlightElement(el));
    }
  }

  // ===== 评论系统（稳定版）=====
  async function apiFetchComments(postId) {
    return API.apiFetch(`/api/posts/${postId}/comments/`, { method: "GET" });
  }

  async function apiCreateComment(postId, content) {
    return API.apiFetch(`/api/posts/${postId}/comments/new/`, {
      method: "POST",
      body: { content },
    });
  }

  function setCommentCount(postId, n) {
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (!card) return;
    const el = card.querySelector(".comment-count");
    if (el) el.textContent = String(n);

    const p = window.__postsById?.[String(postId)];
    if (p) p.comment_count = n;
  }

  function renderCommentList(postId, list) {
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const wrap = card ? card.querySelector(`.comments[data-post-id="${postId}"]`) : null;
    const box = wrap ? wrap.querySelector(".comment-list") : null;
    if (!box) return;

    if (!Array.isArray(list) || !list.length) {
      box.innerHTML = `<div class="text-xs text-gray-500">暂无评论</div>`;
      setCommentCount(postId, 0);
      return;
    }

    setCommentCount(postId, list.length);

    box.innerHTML = list
      .map((c) => {
        const name = c.author?.name || c.author?.username || c.author?.email || "匿名";
        const time = c.created_at ? new Date(c.created_at).toLocaleString() : "";
        return `
          <div class="py-2 border-b">
            <div class="text-xs text-gray-500">${escapeHtml(name)} · ${escapeHtml(time)}</div>
            <div class="whitespace-pre-wrap">${escapeHtml(c.content || "")}</div>
          </div>
        `;
      })
      .join("");
  }

  async function openComments(postId) {
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const wrap = card ? card.querySelector(`.comments[data-post-id="${postId}"]`) : null;
    if (!wrap) return;

    wrap.classList.remove("hidden");

    if (wrap.dataset.loaded === "1") return;
    wrap.dataset.loaded = "1";

    const box = wrap.querySelector(".comment-list");
    if (box) box.innerHTML = `<div class="text-xs text-gray-500">加载中...</div>`;

    try {
      const list = await apiFetchComments(postId);
      renderCommentList(postId, list);
    } catch (err) {
      if (box) box.innerHTML = `<div class="text-xs text-red-600">评论加载失败：${escapeHtml(err.message || "")}</div>`;
    }
  }

  function toggleComments(postId) {
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const wrap = card ? card.querySelector(`.comments[data-post-id="${postId}"]`) : null;
    if (!wrap) return;

    const willShow = wrap.classList.contains("hidden");
    wrap.classList.toggle("hidden", !willShow);
    if (willShow) openComments(postId);
  }

  async function sendComment(postId) {
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const wrap = card ? card.querySelector(`.comments[data-post-id="${postId}"]`) : null;
    if (!wrap) return;

    const input = wrap.querySelector(".comment-input");
    const btn = wrap.querySelector(".comment-send");
    const content = (input?.value || "").trim();
    if (!content) return;

    if (btn) btn.disabled = true;
    try {
      await apiCreateComment(postId, content);
      if (input) input.value = "";

      // 刷新评论列表 & 评论数（保证一致性）
      const list = await apiFetchComments(postId);
      renderCommentList(postId, list);
    } catch (err) {
      safeAlert(err, "发表评论失败");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // 提供给 comment-system.js 的“新系统存在”检测（避免冲突）
  window.CommentsUI = {
    isEnabled: () => true,
  };

  // ===== 交互绑定 =====
  function bindActions() {
    document.addEventListener("click", async (e) => {
      // 点赞
      const likeBtn = e.target.closest(".like-toggle");
      if (likeBtn) {
        const postId = likeBtn.dataset.postId;
        try {
          const res = await API.apiFetch(`/api/posts/${postId}/like-toggle/`, { method: "POST" });
          likeBtn.querySelector(".like-count").textContent = res.like_count;
          likeBtn.classList.toggle("text-red-600", res.liked);
        } catch (err) {
          safeAlert(err, "点赞失败");
        }
        return;
      }

      // 清单 toggle
      const checkBtn = e.target.closest(".check-toggle");
      if (checkBtn) {
        const postId = checkBtn.getAttribute("data-post-id");
        const index = Number(checkBtn.getAttribute("data-index"));
        if (!postId || Number.isNaN(index)) return;

        try {
          const res = await API.apiFetch(`/api/posts/${postId}/checklist/toggle/`, {
            method: "POST",
            body: { index },
          });

          const post = window.__postsById?.[String(postId)];
          if (post) {
            post.checklist_items = res.checklist_items;
            const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
            if (card) card.outerHTML = renderPostCard(post);
          } else {
            await loadFeed();
          }

          if (window.initCalendar) window.initCalendar();
        } catch (err) {
          safeAlert(err, "更新清单失败");
        }
        return;
      }

      // 评论 toggle
      const cBtn = e.target.closest(".comment-toggle");
      if (cBtn) {
        const postId = cBtn.dataset.postId;
        toggleComments(postId);
        return;
      }

      // 发送评论
      const sendBtn = e.target.closest(".comment-send");
      if (sendBtn) {
        const postId = sendBtn.dataset.postId;
        await sendComment(postId);
        return;
      }

      // 删除 tag
      const tr = e.target.closest(".tag-remove");
      if (tr) {
        const t = tr.getAttribute("data-tag");
        tagChips = tagChips.filter((x) => x !== t);
        renderTagChips();
      }

      // 删除清单编辑项
      const delBtn = e.target.closest(".check-del");
      if (delBtn) {
        const idx = Number(delBtn.getAttribute("data-idx"));
        if (Number.isNaN(idx)) return;
        checklistItems.splice(idx, 1);
        renderChecklistEditor();
      }
    });
  }

  function bindPublishUI() {
    const typeSel = document.getElementById("post-type");
    const tagInput = document.getElementById("tag-input");
    const publishBtn = document.getElementById("publish-btn");
    const checklistInput = document.getElementById("checklist-input");
    const checklistAddBtn = document.getElementById("checklist-add");
    const fileInput = document.getElementById("post-files");

    setPostTypeUI((typeSel?.value || "text").trim());

    if (typeSel) {
      typeSel.addEventListener("change", () => {
        setPostTypeUI((typeSel.value || "text").trim());
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        renderFilePreview(fileInput.files ? Array.from(fileInput.files) : []);
      });
      renderFilePreview([]);
    }

    if (tagInput) {
      tagInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const incoming = splitToTags(tagInput.value);
        if (incoming.length) {
          tagChips = unique([...tagChips, ...incoming]).slice(0, 10);
          renderTagChips();
        }
        tagInput.value = "";
      });

      tagInput.addEventListener("blur", () => {
        const incoming = splitToTags(tagInput.value);
        if (incoming.length) {
          tagChips = unique([...tagChips, ...incoming]).slice(0, 10);
          renderTagChips();
          tagInput.value = "";
        }
      });
    }

    function addChecklistFromInput() {
      if (!checklistInput) return;
      const text = (checklistInput.value || "").trim();
      if (!text) return;
      checklistItems.push({ text, done: false });
      checklistInput.value = "";
      renderChecklistEditor();
    }

    if (checklistAddBtn) checklistAddBtn.addEventListener("click", addChecklistFromInput);
    if (checklistInput) {
      checklistInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        addChecklistFromInput();
      });
    }

    if (publishBtn) {
      publishBtn.addEventListener("click", async () => {
        const type = (document.getElementById("post-type")?.value || "text").trim();
        const content = (document.getElementById("post-content")?.value || "").trim();

        if (window.__postScope?.type === "team" && !window.__postScope.teamId) {
          alert("请先在团队中心选择一个团队，再发布。");
          return;
        }

        const code = (document.getElementById("code-text")?.value || "").trim();
        const codeLang = (document.getElementById("code-lang")?.value || "").trim();

        const meta = {};
        if (code) meta.code = code;
        if (codeLang) meta.code_lang = codeLang;

        const fd = new FormData();
        fd.append("type", type);
        fd.append("content", content);
        fd.append("tags", tagChips.join(","));
        fd.append("meta", JSON.stringify(meta));

        if (type === "checklist") {
          fd.append(
            "checklist_items",
            JSON.stringify(checklistItems.map((it) => ({ text: it.text, done: false })))
          );
        }

        const files = document.getElementById("post-files")?.files;
        if (files && files.length) {
          Array.from(files).forEach((f) => fd.append("files", f));
        }

        publishBtn.disabled = true;
        try {
          
          const created = await API.apiFetch("/api/posts/", { method: "POST", body: fd });



          // 清空发布区
          const contentEl = document.getElementById("post-content");
          if (contentEl) contentEl.value = "";
          const codeEl = document.getElementById("code-text");
          if (codeEl) codeEl.value = "";
          const langEl = document.getElementById("code-lang");
          if (langEl) langEl.value = "";

          tagChips = [];
          checklistItems = [];
          renderTagChips();
          renderChecklistEditor();

          const fi = document.getElementById("post-files");
          if (fi) fi.value = "";
          renderFilePreview([]);

          const feed = document.getElementById("memo-feed");
          if (feed) feed.insertAdjacentHTML("afterbegin", renderPostCard(created));

          window.__postsById = window.__postsById || {};
          window.__postsById[String(created.id)] = created;

          if (window.hljs) {
            document.querySelectorAll("pre code").forEach((el) => window.hljs.highlightElement(el));
          }

          if (window.initCalendar) window.initCalendar();
        } catch (err) {
          safeAlert(err, "发布失败");
        } finally {
          publishBtn.disabled = false;
        }
      });
    }

    renderTagChips();
    renderChecklistEditor();
  }

  window.initApp = async function () {
    await loadFeed();
    bindActions();
    bindPublishUI();
    if (window.initCalendar) window.initCalendar();
  };
})();

/**
 * 视图切换控制逻辑
 * 处理 首页广场 与 团队中心 之间的显示隐藏
 */
function mountComposerIntoTeam() {
  const composer = document.getElementById("publish-card");
  const slot = document.getElementById("team-composer-slot");
  if (composer && slot && !slot.contains(composer)) slot.appendChild(composer);
}

function mountComposerIntoHome() {
  const composer = document.getElementById("publish-card");
  const homeWrap = document.querySelector("main .max-w-3xl");
  const feed = document.getElementById("memo-feed");
  if (!composer || !homeWrap) return;

  // 放在 feed 前（你也可以改成 afterend）
  if (feed && !homeWrap.contains(composer)) homeWrap.insertBefore(composer, feed);
}

function showTeamSection() {
  document.getElementById("team-section")?.classList.remove("hidden");
  document.getElementById("memo-feed")?.classList.add("hidden");

  // 🚫 不要在这里重置 teamId
  window.__postScope = window.__postScope || { type: "public", teamId: null };
  window.__postScope.type = "team";

  // 发布器仍然显示
  document.getElementById("publish-card")?.classList.remove("hidden");

  // 只负责加载团队列表
  window.TeamModule?.loadTeamList?.();
}


function showHomeSection() {
  // 回到首页视图
  document.getElementById("team-section")?.classList.add("hidden");
  document.getElementById("memo-feed")?.classList.remove("hidden");

  // ✅ 唯一发布器：移回首页
  mountComposerIntoHome();
  document.getElementById("publish-card")?.classList.remove("hidden");

  window.__postScope = window.__postScope || { type: "public", teamId: null };
  window.__postScope.type = "public";
  window.__postScope.teamId = null;
}

window.showTeamSection = showTeamSection;
window.showHomeSection = showHomeSection;
