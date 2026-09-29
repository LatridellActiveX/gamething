import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep pixel-art sprites as cacheable files instead of inlining ~130 SVGs into the JS bundle.
    assetsInlineLimit: (filePath) => (filePath.indexOf("/assets/art/") !== -1 ? false : undefined),
  },
});
