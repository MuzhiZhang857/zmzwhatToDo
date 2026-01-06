/**
 * Team Module - 团队协作模块
 * 负责团队列表、加入、创建及团队内发帖逻辑
 *
 * 本版目标：
 * - 团队信息 & 二维码：只维护“侧栏卡片”（team-side-*）
 * - 不再依赖/同步主栏团队信息（current-team-name / display-invite-code / team-qr-canvas）
 * - 同步全局发布 scope：window.__postScope = { type:"team", teamId }
 */
(function () {
  const TeamModule = {
    currentTeamId: null,
    _eventsBound: false,

    init() {
      this.bindEvents();
      this.loadTeamList();
    },

    bindEvents() {
      if (this._eventsBound) return;
      this._eventsBound = true;

      document
        .getElementById("create-team-form")
        ?.addEventListener("submit", (e) => this.handleCreateTeam(e));

      document
        .getElementById("join-team-form")
        ?.addEventListener("submit", (e) => this.handleJoinTeam(e));

      // 仍保留团队内部发布（不删功能）
      document
        .getElementById("team-post-form")
        ?.addEventListener("submit", (e) => this.handleCreatePost(e));
    },

    // ------- utils -------
    escapeHtml(s) {
      return (s || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },

    setButtonLoading(btn, loading, loadingText = "提交中...") {
      if (!btn) return;
      if (loading) {
        btn.dataset._oldText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-1"></i>${loadingText}`;
      } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset._oldText || btn.innerHTML;
      }
    },

    // 兼容两类二维码库 + share_url 兜底
    makeShareUrl(inviteCode, shareUrlFromApi) {
      const u = (shareUrlFromApi || "").trim();
      if (u) return u;
      // ✅ 后端没给 share_url 时，用 join 链接兜底
      const code = (inviteCode || "").trim();
      return `${window.location.origin}/index.html?join=${encodeURIComponent(code)}`;
    },

    renderQrToTarget(targetEl, text) {
      if (!targetEl) return;
      const t = (text || "").trim();
      if (!t) return;

      // 尽量清空旧内容
      try {
        if (targetEl.tagName === "CANVAS") {
          const ctx = targetEl.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, targetEl.width || 9999, targetEl.height || 9999);
        } else {
          targetEl.innerHTML = "";
        }
      } catch (_) {}

      try {
        // 1) QRCode.toCanvas(canvas, text, opts, cb)
        if (window.QRCode && typeof window.QRCode.toCanvas === "function" && targetEl.tagName === "CANVAS") {
          window.QRCode.toCanvas(targetEl, t, { width: 144, margin: 1 }, (err) => {
            if (err) console.error("二维码渲染失败(toCanvas):", err);
          });
          return;
        }

        // 2) qrcodejs: new QRCode(dom, {text, width, height})
        if (typeof window.QRCode === "function") {
          const parent = targetEl.parentElement;
          if (!parent) return;

          const holder = document.createElement("div");
          holder.className = targetEl.className;
          holder.style.display = "flex";
          holder.style.alignItems = "center";
          holder.style.justifyContent = "center";

          parent.replaceChild(holder, targetEl);

          // eslint-disable-next-line no-new
          new window.QRCode(holder, { text: t, width: 144, height: 144 });
          return;
        }

        console.warn("未检测到可用的 QRCode API，请确认 vendor/qrcode.min.js。");
      } catch (e) {
        console.error("二维码渲染异常:", e);
      }
    },

    // 1. 获取团队列表
    async loadTeamList() {
      const container = document.getElementById("team-list-container");
      if (!container) return;

      try {
        const teams = await API.apiFetch("/api/teams/");

        if (!Array.isArray(teams) || teams.length === 0) {
          container.innerHTML =
            `<div class="text-gray-400 text-center py-10 text-sm">暂无团队，快去创建或加入一个吧！</div>`;
          return;
        }

        container.innerHTML = teams
          .map((team) => {
            const safeName = this.escapeHtml(team.name);
            const safeInvite = this.escapeHtml(team.invite_code);
            const safeShareUrl = this.escapeHtml(team.share_url || "");
            const safeDesc = this.escapeHtml(team.description || "点击查看团队详情");
            const memberCount = team.member_count || 0;

            const onName = safeName.replaceAll("'", "\\'");
            const onInvite = safeInvite.replaceAll("'", "\\'");
            const onShare = safeShareUrl.replaceAll("'", "\\'");

            return `
              <div onclick="TeamModule.selectTeam(${team.id}, '${onName}', '${onInvite}', '${onShare}')"
                   class="p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition group shadow-sm bg-white mb-3">
                <div class="flex justify-between items-center">
                  <span class="font-bold text-gray-700 group-hover:text-blue-600">${safeName}</span>
                  <span class="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400">${memberCount}人</span>
                </div>
                <p class="text-xs text-gray-400 mt-1 truncate">${safeDesc}</p>
              </div>
            `;
          })
          .join("");
      } catch (err) {
        console.error("加载团队失败:", err);
        container.innerHTML =
          `<div class="text-red-400 text-center py-10 text-sm">加载团队失败：${this.escapeHtml(err.message)}</div>`;
      }
    },

    // 2. 选择团队（只同步侧栏 + scope）
    async selectTeam(teamId, teamName, inviteCode, shareUrl) {
      this.currentTeamId = teamId;

      // 显示团队详情区（不删功能）
      document.getElementById("team-welcome-msg")?.classList.add("hidden");
      document.getElementById("team-detail-section")?.classList.remove("hidden");

      // ✅ 同步全局发布 scope（唯一发布器依赖这个）
      window.__postScope = window.__postScope || { type: "public", teamId: null };
      window.__postScope.type = "team";
      window.__postScope.teamId = teamId;

      // ✅ 只维护侧栏卡片信息
      const sideName = document.getElementById("team-side-name");
      const sideSub = document.getElementById("team-side-sub");
      const sideInvite = document.getElementById("team-side-invite");
      const sideCopy = document.getElementById("team-side-copy");

      if (sideName) sideName.innerText = teamName || "";
      if (sideSub) sideSub.innerText = "团队信息";
      if (sideInvite) sideInvite.innerText = inviteCode || "—";

      if (sideCopy) {
        sideCopy.onclick = () => this.copyInviteLink();
      }

      // ✅ 只渲染侧栏二维码（share_url 为空则兜底 join 链接）
      const effectiveShareUrl = this.makeShareUrl(inviteCode, shareUrl);
      this.renderQrToTarget(document.getElementById("team-side-qr-canvas"), effectiveShareUrl);

      // 团队帖子流仍加载（不删功能）
      this.loadTeamPosts(teamId);
    },

    // 3. 创建团队
    async handleCreateTeam(e) {
      e.preventDefault();

      const name = document.getElementById("new-team-name")?.value?.trim();
      const description = document.getElementById("new-team-desc")?.value?.trim();

      if (!name) {
        alert("请输入团队名称");
        return;
      }

      const form = e.target;
      const submitBtn = form?.querySelector('button[type="submit"]');
      this.setButtonLoading(submitBtn, true, "创建中...");

      try {
        await API.apiFetch("/api/teams/", {
          method: "POST",
          body: { name, description },
        });

        alert("团队创建成功！");
        window.closeModal?.("modal-create-team");
        this.loadTeamList();
        form.reset();
      } catch (err) {
        alert("创建失败: " + err.message);
      } finally {
        this.setButtonLoading(submitBtn, false);
      }
    },

    // 4. 加入团队
    async handleJoinTeam(e) {
      e.preventDefault();

      const invite_code = document
        .getElementById("join-invite-code")
        ?.value?.trim()
        ?.toUpperCase();

      if (!invite_code) {
        alert("请输入邀请码");
        return;
      }

      const form = e.target;
      const submitBtn = form?.querySelector('button[type="submit"]');
      this.setButtonLoading(submitBtn, true, "验证中...");

      try {
        const res = await API.apiFetch("/api/teams/join/", {
          method: "POST",
          body: { invite_code },
        });

        alert(res?.message || "成功加入团队！");
        window.closeModal?.("modal-join-team");
        this.loadTeamList();
        form.reset();
      } catch (err) {
        alert("加入失败: " + err.message);
      } finally {
        this.setButtonLoading(submitBtn, false);
      }
    },

    // 5. 加载团队帖子
    async loadTeamPosts(teamId) {
      const container = document.getElementById("team-posts-container");
      if (!container) return;

      try {
        const posts = await API.apiFetch(`/api/teams/${teamId}/posts/`);

        if (!Array.isArray(posts) || posts.length === 0) {
          container.innerHTML =
            `<div class="text-gray-400 text-center py-10 text-sm">暂无话题，发布第一条吧。</div>`;
          return;
        }

        container.innerHTML = posts
          .map((post) => {
            const author = this.escapeHtml(post.author_name || "匿名");
            const title = this.escapeHtml(post.title || "");
            const content = this.escapeHtml(post.content || "");
            const time = post.created_at ? new Date(post.created_at).toLocaleString() : "";

            return `
              <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs font-bold text-blue-500">@${author}</span>
                  <span class="text-[10px] text-gray-400">${this.escapeHtml(time)}</span>
                </div>
                <h5 class="text-sm font-bold text-gray-800 mb-1">${title}</h5>
                <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">${content}</p>
              </div>
            `;
          })
          .join("");
      } catch (err) {
        console.error("加载帖子失败:", err);
        container.innerHTML =
          `<div class="text-red-400 text-center py-10 text-sm">加载帖子失败：${this.escapeHtml(err.message)}</div>`;
      }
    },

    // 6. 发布团队帖子（保留原功能）
    async handleCreatePost(e) {
      e.preventDefault();

      if (!this.currentTeamId) {
        alert("请先在左侧选择一个团队，再发布话题。");
        return;
      }

      const title = document.getElementById("team-post-title")?.value?.trim();
      const content = document.getElementById("team-post-content")?.value?.trim();

      if (!title || !content) {
        alert("请填写标题和内容");
        return;
      }

      const form = e.target;
      const submitBtn = form?.querySelector('button[type="submit"]');
      this.setButtonLoading(submitBtn, true, "发布中...");

      try {
        await API.apiFetch(`/api/teams/${this.currentTeamId}/posts/`, {
          method: "POST",
          body: { title, content },
        });

        this.loadTeamPosts(this.currentTeamId);
        form.reset();
      } catch (err) {
        alert("发布失败: " + err.message);
      } finally {
        this.setButtonLoading(submitBtn, false);
      }
    },

    // 7. 复制邀请链接（改为：优先读侧栏邀请码）
    copyInviteLink() {
      const code =
        document.getElementById("team-side-invite")?.innerText?.trim() ||
        document.getElementById("display-invite-code")?.innerText?.trim(); // 兼容旧 DOM

      if (!code || code === "—") {
        alert("邀请码为空");
        return;
      }

      const link = `${window.location.origin}/index.html?join=${encodeURIComponent(code)}`;
      navigator.clipboard
        .writeText(link)
        .then(() => alert("邀请链接已复制！"))
        .catch(() => alert("复制失败：浏览器权限限制，请手动复制。"));
    },
  };

  window.TeamModule = TeamModule;
  document.addEventListener("DOMContentLoaded", () => TeamModule.init());
})();
