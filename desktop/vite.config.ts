import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

const certDir = path.resolve(__dirname, "../api-server");

function loadCert() {
  // Pick the cert that matches the current machine — fall back gracefully
  const candidates = [
    { key: "192.168.1.12-key.pem",    cert: "192.168.1.12.pem" },
    { key: "192.168.1.25+1-key.pem",  cert: "192.168.1.25+1.pem" },
  ];
  for (const c of candidates) {
    const keyPath  = path.join(certDir, c.key);
    const certPath = path.join(certDir, c.cert);
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    }
  }
  return undefined; // no cert found → plain HTTP
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    https: loadCert(),
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));