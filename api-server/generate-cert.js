/**
 * Auto-generates a server cert for the current LAN IP, signed by the local CA.
 * Run once at dev server startup — output: current.pem + current-key.pem
 */
const { execSync } = require("child_process");
const os   = require("os");
const fs   = require("fs");
const path = require("path");

const DIR     = __dirname;
const OPENSSL = process.platform === "win32"
  ? "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe"
  : "openssl";

function getLocalIP() {
  const VIRTUAL = /virtual|vmware|vbox|hyper.v|vethernet|loopback|docker|wsl|tap|tun/i;
  const VIRT_PREFIXES = ["192.168.56.","172.16.","172.17.","172.18.","172.19.",
    "172.20.","172.21.","172.22.","172.23.","172.24.","172.25.","172.26.",
    "172.27.","172.28.","172.29.","172.30.","172.31."];
  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const i of (ifaces ?? [])) {
      if (i.family !== "IPv4" || i.internal) continue;
      if (VIRT_PREFIXES.some(p => i.address.startsWith(p))) continue;
      return i.address;
    }
  }
  return "127.0.0.1";
}

const ip      = getLocalIP();
const keyOut  = path.join(DIR, "current-key.pem");
const certOut = path.join(DIR, "current.pem");
const csrOut  = path.join(DIR, "current.csr");
const extOut  = path.join(DIR, "current.ext");
const caKey   = path.join(DIR, "ca-key.pem");
const caCert  = path.join(DIR, "ca.pem");

// Check if cert already covers this IP
if (fs.existsSync(certOut)) {
  try {
    const info = execSync(`"${OPENSSL}" x509 -in "${certOut}" -text -noout`).toString();
    if (info.includes(`IP Address:${ip}`)) {
      console.log(`[cert] Already valid for ${ip}`);
      process.exit(0);
    }
  } catch {}
}

console.log(`[cert] Generating cert for ${ip}...`);

fs.writeFileSync(extOut, `subjectAltName=IP:${ip},IP:127.0.0.1`);

execSync(`"${OPENSSL}" genrsa -out "${keyOut}" 2048`, { stdio: "pipe" });
execSync(`"${OPENSSL}" req -new -key "${keyOut}" -out "${csrOut}" -subj "//CN=${ip}"`, { stdio: "pipe" });
execSync(`"${OPENSSL}" x509 -req -days 825 -in "${csrOut}" -CA "${caCert}" -CAkey "${caKey}" -CAcreateserial -out "${certOut}" -extfile "${extOut}"`, { stdio: "pipe" });

fs.unlinkSync(csrOut);
fs.unlinkSync(extOut);

console.log(`[cert] Done — current.pem valid for ${ip}`);
