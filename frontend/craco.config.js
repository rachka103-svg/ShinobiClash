// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Proxy /api to the backend so the SPA and API share one origin
  // (cookie auth works without cross-site SameSite/Secure gymnastics).
  devServerConfig.proxy = {
    "/api": {
      target: "http://backend:8000",
      changeOrigin: true,
      secure: false,
    },
  };
  // The preview is served through a proxy hostname that changes between
  // environments — accept any host.
  devServerConfig.allowedHosts = "all";

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

// The visual-edits wrapper above may replace webpackConfig.devServer with its
// own function, clobbering the /api proxy and allowedHosts set earlier. To
// guarantee they survive, wrap whatever devServer function exists *after*
// withVisualEdits — call it first to preserve its own modifications, then
// force the proxy and allowedHosts on top.
const _postVEDevServer = webpackConfig.devServer;
webpackConfig.devServer = (devServerConfig) => {
  if (typeof _postVEDevServer === "function") {
    devServerConfig = _postVEDevServer(devServerConfig);
  }
  devServerConfig.proxy = {
    "/api": {
      target: "http://backend:8000",
      changeOrigin: true,
      secure: false,
      // The visual-edits dev-server middleware parses JSON POST bodies into
      // req.body, which consumes the raw request stream before the proxy can
      // pipe it. Without this, POSTs with a JSON body hang (the backend waits
      // for body bytes that never arrive). Re-inject the parsed body here.
      onProxyReq: (proxyReq, req) => {
        if (req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
    },
  };
  devServerConfig.allowedHosts = "all";
  return devServerConfig;
};

module.exports = webpackConfig;
