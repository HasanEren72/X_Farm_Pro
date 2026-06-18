# X-Farm Pro: Advanced Anti-Detect & Account Management System

X-Farm is a high-performance desktop application with anti-detect capabilities designed for managing X (Twitter) accounts. Built on top of the Electron framework, this project manipulates browser fingerprints and offers isolated sessions for each account to prevent them from being caught by bot detection algorithms.

![photo](https://github.com/HasanEren72/X_Farm_Pro/blob/main/Photos%20Mat/a.png)

# Key Features

- 🎭 **Advanced Anti-Detect & Fingerprinting**
  - **Deterministic Fingerprinting:** Generates a unique yet consistent profile (User-Agent, Platform, Hardware details) for each username.
  - **90% Mobile Compatibility:** Mimics mobile device profiles (iPhone 15 Pro, Galaxy S24 Ultra, etc.) that X considers less suspicious.
  - **Noise Injection:** Conceals the real hardware identity by injecting noise at the Canvas, WebGL, and AudioContext levels.
  
![photo](https://github.com/HasanEren72/X_Farm_Pro/blob/main/Photos%20Mat/c.png)

  - **Automation Masking:** Completely disables `navigator.webdriver` and Chromium automation flags.

- 🛡️ **Security & Bypass Solutions**
  - **Security Prompt Bypass:** Neutralizes Windows Hello and WebAuthn (FIDO2) layers to fundamentally solve the issue of security key prompts.
  - **Timezone & Locale Spoofing:** Automatically synchronizes the timezone based on the IP address of the proxy used.
  - **WebAuthn Client Blocking:** Mimics real user behavior and returns "NotAllowedError" to prevent platform suspicion.

- 📉 **Data Saving & Ghost Mode**
  - **Smart Filtering:** Blocks ad domains, tracking pixels, and unnecessary static files.
  - **Ghost Mode:** Restricts media and image loading by allowing only required API calls, saving RAM and bandwidth.
  - **Isolated Partitions:** Completely independent (isolated) cookie and session management for each account.

- 📊 **Statistics & Management**
  - **Proxy Management:** HTTP/HTTPS proxy support and real-time latency tests.
  - **Monthly Data Tracking:** Account-based data usage and operation statistics.
  - **Operation History:** Permanent logging of all executed operations.

![photo](https://github.com/HasanEren72/X_Farm_Pro/blob/main/Photos%20Mat/b.png)

- 🛠️ **Technical Infrastructure**
  - **Framework:** Electron.js
  - **Network:** Axios & HttpsProxyAgent
  - **Data Persistence:** JSON-based file system (accounts, fingerprints, history, notes)
  - **Security:** Crypto-based deterministic seed generation

# ⚙️ Installation

To run the project on your local machine:

1. **Clone the repository:**
   
   clone https://github.com/kullaniciadi/x-farm-pro.git
   
2.**Install dependencies:**

  npm install
3.**Launch the application:**

  npm Start
