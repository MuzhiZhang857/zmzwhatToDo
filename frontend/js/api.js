// frontend/js/api.js
// JWT 模式：统一 API 请求封装，自动携带 Authorization

(function () {
  const API_BASE = "http://127.0.0.1:8000";

  const STORAGE_KEYS = {
    access: "accessToken",
    refresh: "refreshToken",
    user: "currentUser",
  };

  function getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.access) || "";
  }

  function getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.refresh) || "";
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setAuth({ access, refresh, user }) {
    if (access) localStorage.setItem(STORAGE_KEYS.access, access);
    if (refresh) localStorage.setItem(STORAGE_KEYS.refresh, refresh);
    if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(STORAGE_KEYS.access);
    localStorage.removeItem(STORAGE_KEYS.refresh);
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

    const finalHeaders = {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    };

    const token = getAccessToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const msg =
        (data && data.message) ||
        (data && data.detail) ||
        (typeof data === "string" ? data : "") ||
        `请求失败（HTTP ${res.status}）`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // 登录、注册、获取用户信息、退出
  async function loginByEmail(email, password) {
    const data = await apiFetch("/api/users/login/", {
      method: "POST",
      body: { email, password },
    });

    // 兼容字段：access/refresh + user
    const access = data.access || data.token || "";
    const refresh = data.refresh || "";
    const user = data.user || null;

    if (!access) throw new Error("后端未返回 access token（JWT）");

    setAuth({ access, refresh, user });
    return data;
  }

  async function registerAccount({ username, name, email, password }) {
    const body = { email, password };
    if (username) body.username = username;
    if (name) body.name = name;

    const data = await apiFetch("/api/users/register/", {
      method: "POST",
      body,
    });

    const access = data.access || data.token || "";
    const refresh = data.refresh || "";
    const user = data.user || null;

    // 注册后若直接返回 token，就自动登录
    if (access) setAuth({ access, refresh, user });
    return data;
  }

  async function fetchMe() {
    return apiFetch("/api/users/me/", { method: "GET" });
  }

  function logoutLocal() {
    // JWT 模式：前端清 token 即退出
    clearAuth();
  }

  // 暴露到 window
  window.API = {
    API_BASE,
    apiFetch,
    getAccessToken,
    getRefreshToken,
    getCurrentUser,
    setAuth,
    clearAuth,
    loginByEmail,
    registerAccount,
    fetchMe,
    logoutLocal,
  };
})();
