import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const aliases = {
  "@domain": resolve("src/domain"),
  "@infra": resolve("src/infra"),
  "@shared": resolve("src/shared"),
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ include: ["node-pty"] })],
    resolve: { alias: aliases },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: aliases },
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "index.cjs",
        },
      },
    },
  },
  renderer: {
    resolve: { alias: aliases },
    plugins: [react()],
  },
});
