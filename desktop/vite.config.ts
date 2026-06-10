import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import os from "os";
import { componentTagger } from "lovable-tagger";

const certDir = path.resolve(__dirname, "../api-server");

function getLocalIP(): string {
  const VIRTUAL = /virtual|vmware|vbox|hyper.v|vethernet|loopback|docker|wsl|tap|tun/i;
  const VIRTUAL_PREFIXES = ["192.168.56.", "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.",
    "172.27.", "172.28.", "172.29.", "172.30.", "172.31."];
  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const iface of (ifaces ?? [])) {
      if (iface.family !== "IPv4" || iface.internal) continue;
      if (VIRTUAL_PREFIXES.some(p => iface.address.startsWith(p))) continue;
      return iface.address;
    }
  }
  return "127.0.0.1";
}

function loadCert() {
  const ip = getLocalIP();
  const candidates = [
    { key: "local-network-key.pem", cert: "local-network.pem" },
    ...[ `${ip}+2`, `${ip}+1`, ip ].map(p => ({ key: `${p}-key.pem`, cert: `${p}.pem` })),
  ];
  for (const { key, cert } of candidates) {
    const keyPath  = path.join(certDir, key);
    const certPath = path.join(certDir, cert);
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    }
  }
  return undefined;
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