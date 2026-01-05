// frontend/comment-system.js
// 兼容层：如果新评论系统（app.js 内的 window.CommentsUI）存在，则不再绑定旧逻辑，避免冲突。
// 不删除文件，不删除入口，确保工程功能不被“覆盖误伤”。

(function () {
  if (window.CommentsUI && typeof window.CommentsUI.isEnabled === "function") {
    // 新系统已接管
    return;
  }

  // 如果你未来还有单独页面依赖旧评论系统，可在这里继续保留旧实现。
  // 当前项目以“后端评论”为准，旧实现默认不启用，以免干扰动态流。
  console.warn("[comment-system] 新评论系统未加载，旧系统未启用（避免与动态流冲突）。");
})();
