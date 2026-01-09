(() => {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatJoinDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}`;
  };

  const renderPostCard = (post) => {
    const createdAt = post.created_at
      ? new Date(post.created_at).toLocaleString()
      : "";
    const title = post.title || post.subject || "";
    const content = post.content || post.body || "";
    const tags = Array.isArray(post.tags)
      ? post.tags.map((tag) => `<span class="chip">#${escapeHtml(tag)}</span>`).join("")
      : "";

    const checklist =
      post.type === "checklist" && Array.isArray(post.items)
        ? `<ul class="list-disc pl-4 text-gray-700 space-y-1">
            ${post.items
              .map((item) => `<li class="${item.done ? "text-gray-400 line-through" : ""}">${escapeHtml(item.text)}</li>`)
              .join("")}
          </ul>`
        : "";

    return `
      <article class="post-card p-4">
        <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>${escapeHtml(createdAt)}</span>
          <span>${post.type === "checklist" ? "清单" : "备忘"}</span>
        </div>
        ${title ? `<div class="text-sm font-semibold text-gray-800 mb-2">${escapeHtml(title)}</div>` : ""}
        ${content ? `<div class="text-gray-800 mb-2">${escapeHtml(content)}</div>` : ""}
        ${checklist}
        ${tags ? `<div class="flex flex-wrap gap-2 mt-3">${tags}</div>` : ""}
        <div class="text-xs text-gray-400 mt-3">收藏/点赞在文章内呈现</div>
      </article>
    `;
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const setHTML = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  };

  const renderAvatar = (name) => {
    if (!name) return "M";
    return String(name).trim().charAt(0).toUpperCase() || "M";
  };

  const ensureAuth = () => {
    if (!window.API || !API.getAccessToken()) {
      location.href = "login.html";
      return false;
    }
    return true;
  };

  const loadProfile = async () => {
    if (!ensureAuth()) return;

    const [me, posts] = await Promise.all([
      API.fetchMe().catch(() => ({})),
      API.apiFetch("/api/posts/", { method: "GET" }).catch(() => []),
    ]);

    const nickname = me.name || me.username || me.email || "用户";
    const username = me.username ? `@${me.username}` : "—";
    const signature = me.signature || me.bio || "写下灵感，整理成长轨迹。";

    setText("profile-name", `${nickname} / ${username}`);
    setText("profile-signature", signature);
    setText("profile-email", me.email || "—");
    setText("profile-joined", formatJoinDate(me.created_at || me.joined_at));
    setText("profile-gender", me.gender || "保密");
    setText("profile-location", me.location || "待补充");

    setText("profile-nickname", nickname);
    setText("profile-username", username);
    setText("profile-bio", me.bio || me.signature || "—");
    setText("profile-contact", me.contact || me.social || "—");

    const avatar = document.getElementById("profile-avatar");
    if (avatar) {
      avatar.textContent = renderAvatar(nickname);
    }

    const postList = Array.isArray(posts) ? posts : [];
    const publishedCount = postList.length;
    const draftCount = 0;
    const trashCount = 0;

    setText("profile-published-count", String(publishedCount));
    setText("profile-published-count-alt", String(publishedCount));
    setText("profile-draft-count", String(draftCount));
    setText("profile-draft-count-alt", String(draftCount));
    setText("profile-trash-count", String(trashCount));

    const listHtml = postList.length
      ? postList.map(renderPostCard).join("")
      : `<div class="post-card p-4 text-sm text-gray-500">暂无内容，先写下一段灵感吧。</div>`;

    setHTML("profile-posts", listHtml);
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadProfile().catch((err) => {
      console.error("profile load failed", err);
      setHTML(
        "profile-posts",
        `<div class="post-card p-4 text-sm text-red-600">加载失败，请稍后再试。</div>`
      );
    });
  });
})();
