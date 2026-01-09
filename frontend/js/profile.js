// frontend/js/profile.js
(() => {
  const $ = (sel) => document.querySelector(sel);

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const safeText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "";
  };

  const safeHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html ?? "";
  };

  const toISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatJoinMonth = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const firstChar = (s) => {
    const t = String(s || "").trim();
    if (!t) return "M";
    return t[0].toUpperCase();
  };

  const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map((x) => String(x).trim()).filter(Boolean);
    return String(tags)
      .replaceAll("，", ",")
      .split(",")
      .map((x) => x.trim().replace(/^#/, ""))
      .filter(Boolean);
  };

  const countWordsLoose = (posts) => {
    let total = 0;
    for (const p of posts) {
      const content = String(p.content || "");
      total += content.replace(/\s+/g, "").length;

      const code = p.meta && typeof p.meta === "object" ? String(p.meta.code || "") : "";
      total += code.replace(/\s+/g, "").length;

      if ((p.type || "").toLowerCase() === "checklist") {
        const items = Array.isArray(p.checklist_items) ? p.checklist_items : [];
        for (const it of items) {
          total += String(it?.text || "").replace(/\s+/g, "").length;
        }
      }
    }
    return total;
  };

  const ensureAuth = () => {
    if (!window.API || !API.getAccessToken || !API.apiFetch) {
      console.error("API 未加载：请确认 profile.html 先引入 js/api.js");
      return false;
    }
    if (!API.getAccessToken()) {
      location.href = "login.html";
      return false;
    }
    return true;
  };

  const renderPostCard = (post) => {
    const createdAt = post.created_at ? new Date(post.created_at) : null;
    const createdLabel =
      createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleString() : "";

    const type = (post.type || "text").toLowerCase();
    const isChecklist = type === "checklist";

    const tags = parseTags(post.tags);
    const tagHtml = tags.length
      ? `<div class="mt-3 flex flex-wrap gap-2">
           ${tags
             .slice(0, 10)
             .map(
               (t) =>
                 `<span class="px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">#${escapeHtml(
                   t
                 )}</span>`
             )
             .join("")}
         </div>`
      : "";

    const likeCount = post.like_count ?? 0;
    const commentCount = post.comment_count ?? 0;

    let body = "";
    if (isChecklist) {
      const items = Array.isArray(post.checklist_items) ? post.checklist_items : [];
      const li = items
        .slice(0, 12)
        .map((it) => {
          const text = escapeHtml(it?.text ?? "");
          const done = Boolean(it?.done);
          return `<li class="${done ? "text-slate-400 line-through" : "text-slate-700"}">${text}</li>`;
        })
        .join("");
      body = `
        <ul class="list-disc pl-5 space-y-1 text-sm">
          ${li || `<li class="text-slate-400">（空清单）</li>`}
        </ul>
      `;
    } else {
      const content = escapeHtml(String(post.content || ""));
      body = `<div class="text-sm text-slate-800 whitespace-pre-wrap">${
        content || "<span class='text-slate-400'>（无正文）</span>"
      }</div>`;
    }

    return `
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="text-xs text-slate-500">
            ${createdLabel ? escapeHtml(createdLabel) : ""}
            <span class="ml-2 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50">
              ${isChecklist ? "清单" : "随记"}
            </span>
          </div>
          <div class="text-xs text-slate-500 flex items-center gap-3">
            <span title="点赞"><i class="fa-regular fa-heart mr-1"></i>${likeCount}</span>
            <span title="评论"><i class="fa-regular fa-comment mr-1"></i>${commentCount}</span>
          </div>
        </div>
        <div class="mt-3">${body}</div>
        ${tagHtml}
      </article>
    `;
  };

  const Heatmap = (() => {
    let mode = "activity";
    let stats = null;

    const colorFor = (v) => {
      if (!v) return "#e2e8f0";
      if (v <= 1) return "#c7d2fe";
      if (v <= 3) return "#818cf8";
      if (v <= 6) return "#4f46e5";
      return "#312e81";
    };

    const buildMap = (pairs) => {
      const m = {};
      for (const [day, val] of pairs || []) m[day] = Number(val || 0);
      return m;
    };

    const sumPairs = (pairs) => (pairs || []).reduce((acc, [, v]) => acc + Number(v || 0), 0);

    const render = () => {
      const grid = document.getElementById("heatmap-grid");
      if (!grid) return;
      grid.innerHTML = "";

      if (!stats) {
        grid.innerHTML = `<div class="text-xs text-slate-500">暂无统计数据</div>`;
        return;
      }

      const activityMap = buildMap(stats.activity);
      const completionMap = buildMap(stats.completion);

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);

      const days = [];
      for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
        days.push(toISODate(d));
      }

      const pad = first.getDay();
      for (let i = 0; i < pad; i++) {
        const dummy = document.createElement("div");
        dummy.className = "heat-cell";
        dummy.style.background = "transparent";
        grid.appendChild(dummy);
      }

      const tip = document.getElementById("heatmap-tip");
      const showTip = (evt, html) => {
        if (!tip) return;
        tip.innerHTML = html;
        tip.style.display = "block";

        const margin = 12;
        const rect = tip.getBoundingClientRect();
        let x = evt.clientX + margin;
        let y = evt.clientY + margin;

        if (x + rect.width > window.innerWidth - margin) x = evt.clientX - rect.width - margin;
        if (y + rect.height > window.innerHeight - margin) y = evt.clientY - rect.height - margin;

        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
      };
      const hideTip = () => {
        if (tip) tip.style.display = "none";
      };

      for (const day of days) {
        const a = activityMap[day] || 0;
        const c = completionMap[day] || 0;
        const v = mode === "activity" ? a : c;

        const cell = document.createElement("div");
        cell.className = "heat-cell";
        cell.style.background = colorFor(v);
        cell.addEventListener("mousemove", (evt) => {
          showTip(
            evt,
            `
            <div class="font-semibold text-slate-900">${escapeHtml(day)}</div>
            <div class="mt-1">发帖：<b>${a}</b></div>
            <div>完成：<b>${c}</b></div>
          `
          );
        });
        cell.addEventListener("mouseleave", hideTip);
        grid.appendChild(cell);
      }

      safeText("stat-month-posts", String(sumPairs(stats.activity)));
      safeText("stat-month-done", String(sumPairs(stats.completion)));
    };

    const setMode = (next) => {
      mode = next;
      const btn = document.getElementById("btn-toggle-heatmap");
      if (btn) btn.textContent = `切换：${mode === "activity" ? "发帖" : "完成"}`;
      render();
    };

    const setStats = (s) => {
      stats = s;
      render();
    };

    return { setMode, setStats, getMode: () => mode };
  })();

  let cachedPosts = [];
  let cachedMe = null;
  let currentFilter = "all";

  const applyFilter = () => {
    const posts = cachedPosts || [];
    let filtered = posts;

    if (currentFilter === "text") filtered = posts.filter((p) => (p.type || "").toLowerCase() === "text");
    if (currentFilter === "checklist")
      filtered = posts.filter((p) => (p.type || "").toLowerCase() === "checklist");

    if (!filtered.length) {
      safeHTML(
        "profile-posts",
        `<div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">暂无内容，先写下一段灵感吧。</div>`
      );
      return;
    }
    safeHTML("profile-posts", filtered.map(renderPostCard).join(""));
  };

  const bindFilterUI = () => {
    document.querySelectorAll(".post-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentFilter = btn.getAttribute("data-filter") || "all";
        document.querySelectorAll(".post-filter").forEach((b) => {
          b.classList.remove("bg-slate-900", "text-white");
          b.classList.add("hover:bg-slate-50");
        });
        btn.classList.add("bg-slate-900", "text-white");
        btn.classList.remove("hover:bg-slate-50");
        applyFilter();
      });
    });
  };

  const bindTopBar = () => {
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          await API.logout?.();
        } catch (_) {}
        API.clearTokens?.();
        location.href = "login.html";
      });
    }

    const toggleBtn = document.getElementById("btn-toggle-heatmap");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        Heatmap.setMode(Heatmap.getMode() === "activity" ? "completion" : "activity");
      });
    }

    const contactBtn = document.getElementById("btn-contact");
    if (contactBtn) {
      contactBtn.addEventListener("click", () => {
        const email = cachedMe?.email || "—";
        alert(`联系方式（当前最可靠）：\n${email}\n\n建议：后续在后端增加 contact 字段，并加入隐私开关。`);
      });
    }
  };

  const fillProfileHeader = (me) => {
    cachedMe = me || {};

    const nickname = me?.name || me?.username || me?.email || "用户";
    const username = me?.username ? `@${me.username}` : "—";

    safeText("profile-display-name", nickname);
    safeText("profile-username", username);

    const bio = me?.bio || me?.signature || "写下灵感，整理成长轨迹。";
    safeText("profile-bio", bio);

    safeText("profile-joined", formatJoinMonth(me?.date_joined));

    // avatar
    const img = document.getElementById("profile-avatar-img");
    const fb = document.getElementById("profile-avatar-fallback");
    if (img && me?.avatar_url) {
      img.src = me.avatar_url;
      img.classList.remove("hidden");
      if (fb) fb.classList.add("hidden");
    } else if (fb) {
      fb.textContent = firstChar(nickname);
      if (img) img.classList.add("hidden");
      fb.classList.remove("hidden");
    }

    // cover
    const cover = document.getElementById("profile-cover-img");
    if (cover && me?.cover_url) {
      cover.src = me.cover_url;
      cover.classList.remove("hidden");
    } else if (cover) {
      cover.classList.add("hidden");
    }

    // optional chips
    const loc = me?.location;
    const gen = me?.gender;
    const contact = me?.contact;

    const chipLoc = document.getElementById("chip-location");
    if (chipLoc && loc) {
      chipLoc.classList.remove("hidden");
      safeText("profile-location", loc);
    } else if (chipLoc) {
      chipLoc.classList.add("hidden");
    }

    const chipGen = document.getElementById("chip-gender");
    if (chipGen && gen) {
      chipGen.classList.remove("hidden");
      safeText("profile-gender", gen);
    } else if (chipGen) {
      chipGen.classList.add("hidden");
    }

    const btnContact = document.getElementById("btn-contact");
    if (btnContact && (contact || me?.email)) btnContact.classList.remove("hidden");

    const rss = document.getElementById("profile-rss-link");
    if (rss) rss.href = me?.username ? `/rss/users/${encodeURIComponent(me.username)}.xml` : "#";
  };

  const loadPosts = async () => {
    const posts = await API.apiFetch("/api/posts/", { method: "GET" });
    return Array.isArray(posts) ? posts : posts?.results || [];
  };

  const loadMonthStats = async () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0);
    const qs = `from=${toISODate(from)}&to=${toISODate(to)}`;
    return await API.apiFetch(`/api/stats/calendar/?${qs}`, { method: "GET" });
  };

  const bindSettingsUI = () => {
    const modal = document.getElementById("modal");
    const open = () => {
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
      }
    };
    const close = () => {
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
    };

    const previewFile = (file, imgEl, fallbackEl) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      imgEl.src = url;
      imgEl.classList.remove("hidden");
      if (fallbackEl) fallbackEl.classList.add("hidden");
    };

    const fillEditFormFromMe = () => {
      $("#edit-name").value = cachedMe?.name || "";
      $("#edit-bio").value = cachedMe?.bio || "";
      $("#edit-location").value = cachedMe?.location || "";
      $("#edit-gender").value = cachedMe?.gender || "";
      $("#edit-contact").value = cachedMe?.contact || "";

      // 清理 file input & preview（每次打开重新选）
      const inA = $("#input-avatar");
      const inC = $("#input-cover");
      if (inA) inA.value = "";
      if (inC) inC.value = "";

      const pA = $("#preview-avatar");
      const fA = $("#preview-avatar-fallback");
      if (pA) pA.classList.add("hidden");
      if (fA) fA.classList.remove("hidden");

      const pC = $("#preview-cover");
      const fC = $("#preview-cover-fallback");
      if (pC) pC.classList.add("hidden");
      if (fC) fC.classList.remove("hidden");
    };

    document.querySelectorAll(".setting-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        if (action === "edit-profile") {
          fillEditFormFromMe();
          open();
        }
      });
    });

    const closeBtn = document.getElementById("modal-close");
    const cancelBtn = document.getElementById("modal-cancel");
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (cancelBtn) cancelBtn.addEventListener("click", close);

    // file preview
    const inAvatar = $("#input-avatar");
    const inCover = $("#input-cover");
    const prevA = $("#preview-avatar");
    const fallA = $("#preview-avatar-fallback");
    const prevC = $("#preview-cover");
    const fallC = $("#preview-cover-fallback");

    if (inAvatar && prevA) {
      inAvatar.addEventListener("change", () => {
        const f = inAvatar.files && inAvatar.files[0];
        if (f) previewFile(f, prevA, fallA);
      });
    }
    if (inCover && prevC) {
      inCover.addEventListener("change", () => {
        const f = inCover.files && inCover.files[0];
        if (f) previewFile(f, prevC, fallC);
      });
    }

    // save with FormData
    const saveBtn = document.getElementById("modal-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const fd = new FormData();

        const name = $("#edit-name")?.value?.trim() || "";
        const bio = $("#edit-bio")?.value?.trim() || "";
        const location = $("#edit-location")?.value?.trim() || "";
        const gender = $("#edit-gender")?.value || "";
        const contact = $("#edit-contact")?.value?.trim() || "";

        if (name) fd.append("name", name);
        if (bio) fd.append("bio", bio);
        if (location) fd.append("location", location);
        if (gender) fd.append("gender", gender);
        if (contact) fd.append("contact", contact);

        const avatarFile = $("#input-avatar")?.files?.[0];
        const coverFile = $("#input-cover")?.files?.[0];
        if (avatarFile) fd.append("avatar", avatarFile);
        if (coverFile) fd.append("cover", coverFile);

        const oldText = saveBtn.textContent;
        saveBtn.textContent = "保存中…";
        saveBtn.disabled = true;

        try {
          const updated = await API.apiFetch("/api/users/me/", {
            method: "PATCH",
            body: fd, // FormData：api.js 会自动处理，不会加 JSON Content-Type :contentReference[oaicite:2]{index=2}
          });

          cachedMe = updated;
          fillProfileHeader(updated);

          // 写入全局 me 缓存：解决“返回首页再回来不更新”的问题（api.js 的 key 是 me_cache）:contentReference[oaicite:3]{index=3}
          localStorage.setItem("me_cache", JSON.stringify(updated));

          alert("个人资料已保存");
          close();
        } catch (err) {
          alert(err?.message || "保存失败");
          console.error(err);
        } finally {
          saveBtn.textContent = oldText;
          saveBtn.disabled = false;
        }
      });
    }
  };

  const main = async () => {
    if (!ensureAuth()) return;

    bindFilterUI();
    bindSettingsUI();
    bindTopBar();

    const [me, posts, stats] = await Promise.all([
      API.fetchMe({ force: true }), // 个人中心优先新鲜度
      loadPosts(),
      loadMonthStats().catch(() => null),
    ]);

    fillProfileHeader(me);

    cachedPosts = posts || [];

    const publishedCount = cachedPosts.length;
    safeText("stat-post-count", String(publishedCount));
    safeText("cnt-published", String(publishedCount));
    safeText("cnt-draft", "0");
    safeText("cnt-trash", "0");

    const wordCount = countWordsLoose(cachedPosts);
    safeText("stat-word-count", String(wordCount));

    applyFilter();

    if (stats && typeof stats === "object") {
      Heatmap.setStats(stats);
      Heatmap.setMode("activity");
    } else {
      const grid = document.getElementById("heatmap-grid");
      if (grid) grid.innerHTML = `<div class="text-xs text-slate-500">统计加载失败</div>`;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    main().catch((err) => {
      console.error("profile load failed", err);
      safeHTML(
        "profile-posts",
        `<div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">加载失败：请确认已登录，且后端服务正常。</div>`
      );
    });
  });
})();
