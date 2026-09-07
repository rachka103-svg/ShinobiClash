import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
  timeout: 15000, // a hung/slow request should fail predictably, not hang forever
});

// ---------------------------------------------------------------------------
// Automatic token refresh — when the 15-minute access token expires, the
// interceptor silently calls /auth/refresh (using the 7-day refresh-token
// cookie) and retries the original request once. This prevents the app from
// appearing "stuck" or logging the user out after a period of inactivity.
// A concurrent refresh lock ensures only one refresh fires at a time;
// queued requests are retried after it resolves.
// ---------------------------------------------------------------------------
let _refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Only attempt refresh on 401, for non-refresh endpoints, and only once
    if (
      error.response?.status === 401 &&
      !original._retried &&
      !original.url.includes("/auth/refresh") &&
      !original.url.includes("/auth/login")
    ) {
      original._retried = true;
      // Reuse an in-flight refresh so parallel 401s don't spam the endpoint
      if (!_refreshing) {
        _refreshing = api.post("/auth/refresh").finally(() => { _refreshing = null; });
      }
      try {
        await _refreshing;
        return api(original); // retry the original request with the fresh cookie
      } catch {
        // refresh failed — let the original 401 propagate
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
