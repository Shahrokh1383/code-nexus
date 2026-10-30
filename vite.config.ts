import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainAliases = {
  "@main": path.resolve(__dirname, "src/main"),
  "@shared": path.resolve(__dirname, "src/shared"),
  "@": path.resolve(__dirname, "src"),
};

// Shared Rollup warning filter for the plugin's invalid "platform" input option
function ignorePlatformInputWarning(warning: any, warn: (warning: any) => void): void {
  if (
    warning.code === 'UNKNOWN_OPTION' &&
    String(warning.message).includes('platform')
  ) {
    return;
  }
  warn(warning);
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      // Preload script
      {
        entry: "src/main/bootstrap/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            emptyOutDir: false,
            rollupOptions: {
              input: {
                preload: "src/main/bootstrap/preload.ts",
              },
              output: {
                entryFileNames: "[name].js",
              },
              onwarn: ignorePlatformInputWarning,
            },
          },
          resolve: {
            alias: mainAliases,
          },
        },
      },
      // Main process
      {
        entry: "src/main/bootstrap/app.ts",
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            emptyOutDir: false,
            rollupOptions: {
              input: {
                main: "src/main/bootstrap/app.ts",
              },
              output: {
                entryFileNames: "[name].js",
              },
              onwarn: ignorePlatformInputWarning,
            },
          },
          resolve: {
            alias: mainAliases,
          },
        },
      },
    ]),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@renderer": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
});