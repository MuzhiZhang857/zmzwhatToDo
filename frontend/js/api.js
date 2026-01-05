// frontend/js/api.js
// JWT 模式：统一 API 请求封装（Authorization: Bearer <access>）
// - 自动附带 access token
// - 401 时自动用 refresh 刷新一次并重试
// - 统一错误结构：throw Error(message) 且 err.details / err.status 可用

(function () {
  const API_BASE =
    window.__API_BASE__ ||
    localStorage.getItem("API_BASE") ||
    "http://127.0.0.1:8000";

  const LS_ACCESS = "access_token";
  const LS_REFRESH = "refresh_token";
  const LS_USER = "me_cache";

  function getAccessToken() {
    return localStorage.getItem(LS_ACCESS) || "";
  }

  function getRefreshToken() {
    return localStorage.getItem(LS_REFRESH) || "";
  }

  function setTokens({ access, refresh } = {}) {
    if (access) localStorage.setItem(LS_ACCESS, access);
    if (refresh) localStorage.setItem(LS_REFRESH, refresh);
  }

  function clearTokens() {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
  }

  function isPlainObject(x) {
    return Object.prototype.toString.call(x) === "[object Object]";
  }

  function stringifyMaybe(obj) {
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }

  // 将各种后端错误（DRF field errors / detail / string）规整为 {message, details}
  function normalizeErrorPayload(payload, fallbackMessage) {
    // 后端已经标准化：{message, details}
    if (payload && typeof payload === "object" && "message" in payload) {
      return {
        message: String(payload.message || fallbackMessage || "请求失败"),
        details: payload.details ?? payload,
      };
    }

    // DRF 常见：{detail: "..."}
    if (payload && typeof payload === "object" && "detail" in payload) {
      return {
        message: String(payload.detail || fallbackMessage || "请求失败"),
        details: payload,
      };
    }

    // DRF 字段错误：{field: ["xx"], field2: ["yy"]} / {non_field_errors: [...]}
    if (payload && isPlainObject(payload)) {
      const keys = Object.keys(payload);
      if (keys.length) {
        const firstKey = keys[0];
        const v = payload[firstKey];
        const msg =
          Array.isArray(v) && v.length
            ? `${firstKey}: ${String(v[0])}`
            : `${firstKey}: ${String(v)}`;
        return {
          message: msg || fallbackMessage || "参数错误",
          details: payload,
        };
      }
    }

    // string / 其它
    if (typeof payload === "string") {
      const s = payload.trim();
      return {
        message: s || fallbackMessage || "请求失败",
        details: payload,
      };
    }

    return {
      message: fallbackMessage || "请求失败",
      details: payload,
    };
  }

  async function readResponseBody(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isJson = ct.includes("application/json");
    if (isJson) {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
    try {
      return await res.text();
    } catch {
      return "";
    }
  }

  async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    const url = `${API_BASE}/api/users/token/refresh/`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    const data = await readResponseBody(res);

    if (!res.ok) {
      // refresh 失败视为登录过期
      clearTokens();
      return null;
    }

    // simplejwt 通常返回 {access: "..."}，也可能带 refresh
    const access = data && data.access ? String(data.access) : "";
    const newRefresh = data && data.refresh ? String(data.refresh) : "";
    if (access) setTokens({ access, refresh: newRefresh || refresh });
    return access || null;
  }

  /**
   * apiFetch(path, options)
   * options:
   *  - method: GET/POST/...
   *  - body: Object | FormData | string | undefined
   *  - headers: {}
   *  - auth: boolean (default true) 是否附带 Authorization
   *  - retryOn401: boolean (default true) 是否自动 refresh 并重试一次
   */
  async function apiFetch(
    path,
    { method = "GET", body, headers = {}, auth = true, retryOn401 = true } = {}
  ) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;

    const finalHeaders = { ...headers };

    // JSON body 才加 Content-Type；FormData 交给浏览器自动带 boundary
    const hasBody = body !== undefined && body !== null;
    const shouldJson =
      hasBody && !isFormData && typeof body !== "string" && !finalHeaders["Content-Type"];

    if (shouldJson) finalHeaders["Content-Type"] = "application/json";

    if (auth) {
      const access = getAccessToken();
      if (access) finalHeaders["Authorization"] = `Bearer ${access}`;
    }

    const fetchBody = !hasBody
      ? undefined
      : isFormData
      ? body
      : typeof body === "string"
      ? body
      : JSON.stringify(body);

    let res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: fetchBody,
    });

    // 401：尝试刷新并重试一次
    if (res.status === 401 && auth && retryOn401) {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        const retryHeaders = { ...finalHeaders, Authorization: `Bearer ${newAccess}` };
        res = await fetch(url, {
          method,
          headers: retryHeaders,
          body: fetchBody,
        });
      }
    }

    const data = await readResponseBody(res);

    if (!res.ok) {
      const { message, details } = normalizeErrorPayload(
        data,
        `请求失败（HTTP ${res.status}）`
      );
      const err = new Error(message);
      err.status = res.status;
      err.details = details;
      err.data = data;
      throw err;
    }

    return data;
  }

  // ---------- Auth APIs ----------
  async function loginByEmail(email, password) {
    const data = await apiFetch("/api/users/login/", {
      method: "POST",
      body: { email, password },
      auth: false,
      retryOn401: false,
    });

    // 兼容两种返回：
    // 1) {access, refresh, user?}
    // 2) {refresh, access, user:{...}}
    if (data && data.access && data.refresh) {
      setTokens({ access: data.access, refresh: data.refresh });
    }

    // 缓存 me（可选）
    if (data && data.user) {
      localStorage.setItem(LS_USER, stringifyMaybe(data.user));
    }

    return data;
  }

  async function registerAccount({ username, name, email, password }) {
    const body = { email, password };
    if (username) body.username = username;
    if (name) body.name = name;

    return apiFetch("/api/users/register/", {
      method: "POST",
      body,
      auth: false,
      retryOn401: false,
    });
  }

  async function fetchMe({ force = false } = {}) {
    if (!force) {
      const cached = localStorage.getItem(LS_USER);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }
    }
    const data = await apiFetch("/api/users/me/", { method: "GET", auth: true });
    localStorage.setItem(LS_USER, stringifyMaybe(data));
    return data;
  }

  function logout() {
    // 前端登出：清 token 即可（后端可选提供黑名单/登出接口）
    clearTokens();
  }

  // 暴露到 window
  window.API = {
    API_BASE,
    apiFetch,

    // token helpers
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,

    // auth
    loginByEmail,
    registerAccount,
    fetchMe,
    logout,
  };
})();
