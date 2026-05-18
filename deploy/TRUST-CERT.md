# Trusting the Self-Signed Certificate

Since the hospital has no domain name, the app uses a self-signed SSL certificate
tied to the server's LAN IP. Each device that accesses the app needs to trust it
**once**. Follow the steps for each device type below.

---

## Windows (Chrome / Edge)

1. Open `https://SERVER_IP` in your browser
2. Click **Advanced** → **Proceed to SERVER_IP (unsafe)**
3. For permanent trust: download the cert from the server and install it:
   - Copy `/etc/ssl/radiology/cert.pem` to the PC
   - Double-click → **Install Certificate** → **Local Machine**
   - Place in **Trusted Root Certification Authorities**

---

## iPhone / iPad (Safari) — Required for microphone

Safari requires the cert to be **installed as a profile**, not just bypassed.

1. On the iPhone, open Safari and go to:
   `https://SERVER_IP/cert.pem`
   *(The setup.sh serves this file via nginx — see step below)*
2. Tap **Allow** when prompted to download the profile
3. Go to **Settings → General → VPN & Device Management**
4. Tap the profile → **Install**
5. Go to **Settings → General → About → Certificate Trust Settings**
6. Enable full trust for the certificate

### Serve the cert via nginx (add to nginx.conf)
```nginx
location = /cert.pem {
    alias /etc/ssl/radiology/cert.pem;
    default_type application/x-x509-ca-cert;
}
```

---

## Android (Chrome)

1. Copy `/etc/ssl/radiology/cert.pem` to the device
2. Go to **Settings → Security → Install a certificate → CA Certificate**
3. Select the file

---

## After trusting the cert

- Desktop app: `https://SERVER_IP`
- Mobile recorder: `https://SERVER_IP:5173`

The QR code displayed on the desktop app will automatically point to the correct
mobile URL with the right IP.
