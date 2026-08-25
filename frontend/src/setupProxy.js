// Dev-only proxy: forward same-origin /api requests to the FastAPI backend so
// cookie-based auth (withCredentials) stays single-origin in the browser.
// Loaded automatically by Create React App's dev server. Not used in production.
const { createProxyMiddleware } = require("http-proxy-middleware");

const target = process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
