import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v2_errorBoundary: true,
        v2_headers: true,
        v2_meta: true,
        v2_normalizeFormMethod: true,
        v2_routeConvention: true,
      },
    }),
  ],
  define: {
    "process.env.SHOPIFY_API_KEY": JSON.stringify(process.env.SHOPIFY_API_KEY),
  },
});