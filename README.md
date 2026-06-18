# X-Farm Pro: Advanced Anti-Detect & Account Management System

X-Farm is a high-performance desktop application designed for managing X (Twitter) accounts with advanced anti-detect capabilities. Built on Electron, the project provides isolated account environments and fingerprint manipulation techniques to reduce detection by automated bot-detection systems.

![photo](https://github.com/HasanEren72/X_Farm_Pro/blob/main/Photos%20Mat/a.png)

# Key Features

## 🎭 Advanced Anti-Detect & Fingerprinting

### Deterministic Fingerprinting

Generates a unique yet consistent browser profile for each username, including User-Agent, Platform, and Hardware information.

### 90% Mobile Profile Emulation

Mimics trusted mobile devices such as iPhone 15 Pro and Samsung Galaxy S24 Ultra profiles to create more realistic browsing environments.

### Noise Injection

Adds controlled noise to Canvas, WebGL, and AudioContext APIs to obscure the device's real hardware fingerprint.

![photo](https://github.com/HasanEren72/X_Farm_Pro/blob/main/Photos%20Mat/c.png)

### Automation Concealment

Disables `navigator.webdriver` exposure and Chromium automation flags to minimize automation indicators.

---

## 🛡️ Security & Bypass Solutions

### c.png Issue Resolution

Disables Windows Hello and WebAuthn (FIDO2) layers to eliminate unnecessary security key prompts.

### Timezone & Locale Spoofing

Automatically synchronizes timezone settings based on the connected proxy's IP location.

### WebAuthn Client Blocking

Simulates realistic user behavior by returning `NotAllowedError`, helping prevent suspicious authentication prompts.

---

## 📉 Data Saving & Ghost Mode

### Smart Filtering

Blocks advertising domains, tracking pixels, and unnecessary static resources.

### Ghost Mode

Allows only essential API requests while limiting media and image loading, reducing RAM usage and bandwidth consumption.

### Isolated Partitions

Provides completely independent cookies, sessions, and storage environments for each account.

---

## 📊 Statistics & Management

### Proxy Management

Supports HTTP/HTTPS proxies with real-time latency testing.

### Monthly Data Tracking

Monitors data usage and activity statistics on a per-account basis.

### Activity History

Maintains a persistent log of all performed operations.

![photo](https://github.com/HasanEren72/X_Farm_Pro/blob/main/Photos%20Mat/b.png)

---

## 🛠️ Technical Stack

* **Framework:** Electron.js
* **Networking:** Axios & HttpsProxyAgent
* **Data Persistence:** JSON-based storage system (accounts, fingerprints, history, notes)
* **Security:** Crypto-based deterministic seed generation

---

# ⚙️ Installation

To run the project locally:

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/x-farm-pro.git
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the application

```bash
npm start
```

---

# ⚠️ Disclaimer

This software is developed for educational and personal-use purposes only. The developer assumes no responsibility for any usage that violates X (Twitter) Terms of Service or applicable regulations.

For account security and operational stability, the use of high-quality proxy services is strongly recommended.

---

### Developed with ❤️ for high-performance account management.
