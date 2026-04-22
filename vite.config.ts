import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: path.resolve(rootDir, "demo"),
  publicDir: false,
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      "magic-cursor": path.resolve(rootDir, "src/index.ts"),
    },
  },
  build: {
    outDir: path.resolve(rootDir, "demo-dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(rootDir, "demo/index.html"),
    },
  },
});
