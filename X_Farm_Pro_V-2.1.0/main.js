const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ── X-FARM PROFESYONEL ANTI-BOT YAPILANDIRMASI ──
// Otomasyon bayraklarını tamamen gizle ve Chromium'un bot tespit özelliklerini kapat
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('excludeSwitches', 'enable-automation');
app.commandLine.appendSwitch('disable-features', 'WebAuthentication,WebAuthenticationProxy,WebAuthenticationUI,IsolateOrigins,site-per-process,WebRtcHideLocalIpsWithMdns');
// ── c.png GÜVENLİK HATASI KÖKTEN ÇÖZÜMÜ ──
// Windows Hello ve FIDO2 katmanlarını devre dışı bırakır.
app.commandLine.appendSwitch('disable-web-authentication-proxy');
app.commandLine.appendSwitch('disable-webauthn');
// ── Görüntü Kayması ve Webview Sığmama Çözümü ──
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-features', 'TouchpadAndWheelScrollLatching,AsyncWheelEvents');

// ── Gerçekçi Ekran ve Render Parametreleri ──
app.commandLine.appendSwitch('disable-infobars');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');

let mainWindow;
const accountsPath   = path.join(__dirname, 'accounts.json');
const commentsPath   = path.join(__dirname, 'comments.json');
const monthlyPath    = path.join(__dirname, 'monthly-stats.json');
const notesPath      = path.join(__dirname, 'notes.json');
const dailyOpsPath   = path.join(__dirname, 'daily-ops.json');
const historyPath    = path.join(__dirname, 'history.json');    // kalici gecmis
const fingerprintsPath = path.join(__dirname, 'fingerprints.json'); // hesap bazi fp

let networkStats     = {};
let lastKnownStats   = {};
let monthlyStats     = {};
let isDataSaverEnabled  = true;
let isGhostModeEnabled  = false;

// ── Aylık istatistik ──────────────────────────────────────────────────────────
function loadMonthlyStats() {
    if (fs.existsSync(monthlyPath)) {
        try { monthlyStats = JSON.parse(fs.readFileSync(monthlyPath,'utf8') || '{}'); }
        catch (e) { 
            console.error("Aylık istatistik yükleme hatası:", e);
            monthlyStats = {}; }
    }
}
loadMonthlyStats();

function getMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function flushToMonthly() {
    const month = getMonthKey();
    if (!monthlyStats[month]) monthlyStats[month] = { total:0, accounts:{} };
    Object.keys(networkStats).forEach(user => {
        const cur   = networkStats[user].downloaded || 0;
        const last  = lastKnownStats[user]          || 0;
        const delta = cur - last;
        if (delta > 0) {
            monthlyStats[month].total += delta;
            monthlyStats[month].accounts[user] = (monthlyStats[month].accounts[user]||0) + delta;
            lastKnownStats[user] = cur;
        }
    });
    try { fs.writeFileSync(monthlyPath, JSON.stringify(monthlyStats,null,2)); } catch (e) { console.error("Stats yazma hatası:", e); }
}

// ── Parmak izi profili uret (username'e gore deterministik) ───────────────────
function generateFingerprint(username) {
    // Her hesap icin farkli ama tutarli bir seed uret
    const hash = parseInt(crypto.createHash('md5').update(username).digest('hex').slice(0,8), 16);
    const rng  = (offset) => {
        const x = Math.sin(hash + offset) * 98765.4321;
        return Math.abs(x - Math.floor(x));
    };

    // %90 Mobil, %10 Masaüstü profili (Madde 4)
    const isMobile = rng(100) < 0.90;

    const MOBILE_PROFILES = [
        { name: 'iPhone 15 Pro Max', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', plt: 'iPhone', vendor: 'Apple Computer, Inc.', gpu: { v: 'Apple Inc.', r: 'Apple GPU' }, res: [430, 932] },
        { name: 'iPhone 15 Pro', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', plt: 'iPhone', vendor: 'Apple Computer, Inc.', gpu: { v: 'Apple Inc.', r: 'Apple GPU' }, res: [393, 852] },
        { name: 'iPad Pro M4 (13-inch)', ua: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', plt: 'MacIntel', vendor: 'Apple Computer, Inc.', gpu: { v: 'Apple Inc.', r: 'Apple GPU' }, res: [1024, 1366] },
        { name: 'Samsung Galaxy S24 Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36', plt: 'Linux armv8l', vendor: 'Google Inc.', gpu: { v: 'Google Inc. (Qualcomm)', r: 'Adreno (TM) 750' }, res: [412, 915] },
        { name: 'Samsung Galaxy Z Fold 5', ua: 'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36', plt: 'Linux armv8l', vendor: 'Google Inc.', gpu: { v: 'Google Inc. (Qualcomm)', r: 'Adreno (TM) 740' }, res: [373, 912] },
        { name: 'Google Pixel 8 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', plt: 'Linux aarch64', vendor: 'Google Inc.', gpu: { v: 'Google Inc. (Google)', r: 'Google Tensor G3' }, res: [412, 892] },
        { name: 'Xiaomi 14 Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; 24030PN60G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36', plt: 'Linux armv8l', vendor: 'Google Inc.', gpu: { v: 'Google Inc. (Qualcomm)', r: 'Adreno (TM) 750' }, res: [412, 915] },
        { name: 'Xiaomi 14 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; 2311TRN52C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', plt: 'Linux armv8l', vendor: 'Google Inc.', gpu: { v: 'Google Inc. (Qualcomm)', r: 'Adreno (TM) 750' }, res: [412, 915] }
    ];

    const DESKTOP_PROFILES = [
        { name: 'Windows PC (Chrome)', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', plt: 'Win32', vendor: 'Google Inc.', gpu: { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070, D3D11)' }, res: [1920, 1080] },
        { name: 'MacBook Pro (Safari)', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', plt: 'MacIntel', vendor: 'Google Inc.', gpu: { v: 'Intel Inc.', r: 'Intel(R) Iris(R) Xe Graphics' }, res: [1440, 900] }
    ];

    const profile = isMobile ? MOBILE_PROFILES[Math.floor(rng(1)*MOBILE_PROFILES.length)] : DESKTOP_PROFILES[Math.floor(rng(1)*DESKTOP_PROFILES.length)];

    const hwConcur  = isMobile ? [4, 8][Math.floor(rng(3)*2)] : [4,6,8,12,16][Math.floor(rng(3)*5)];
    const devMem    = isMobile ? [4,6,8][Math.floor(rng(4)*3)] : [8,16,32][Math.floor(rng(4)*3)];

    return {
        deviceName       : profile.name,
        isMobile,
        userAgent        : profile.ua,
        platform         : profile.plt,
        vendor           : profile.vendor,
        hardwareConcurrency: hwConcur,
        deviceMemory: devMem,
        screenWidth      : profile.res[0],
        screenHeight     : profile.res[1],
        colorDepth       : [24,30][Math.floor(rng(6) * 2)],
        pixelRatio       : [1,1.25,1.5,2][Math.floor(rng(7) * 4)],
        webglVendor      : profile.gpu.v,
        webglRenderer    : profile.gpu.r,
        timezone         : 'Europe/Istanbul', // Madde 5: Proxy IP'sine göre otomatik güncellenecek
        canvasNoise      : (rng(11) * 0.08).toFixed(6),
        audioNoise       : (rng(12) * 0.00005).toFixed(8),
        clientRectNoise  : (rng(13) * 0.01).toFixed(4),
        touchPoints      : isMobile ? [5, 10][Math.floor(rng(15)*2)] : 0,
        languages        : ['tr-TR,tr,en-US,en','en-US,en','de-DE,de,en','fr-FR,fr,en'][Math.floor(rng(14) * 4)],
    };
}

// Parmak izlerini diske yaz/yukle
let fingerprintCache = {};
function loadFingerprints() {
    if (fs.existsSync(fingerprintsPath)) {
        try { fingerprintCache = JSON.parse(fs.readFileSync(fingerprintsPath,'utf8') || '{}'); }
        catch (e) { 
            console.error("FP yükleme hatası:", e);
            fingerprintCache = {}; }
    }
}
loadFingerprints();

function getFingerprintForUser(username) {
    if (!fingerprintCache[username]) {
        fingerprintCache[username] = generateFingerprint(username);
        try { fs.writeFileSync(fingerprintsPath, JSON.stringify(fingerprintCache,null,2)); } catch (e) { console.error("FP yazma hatası:", e); }
    }
    return fingerprintCache[username];
}

// Parmak izi injection script'i olustur
function buildFingerprintScript(fp) {
    return `(function(){
    'use strict';
    const _fp = ${JSON.stringify(fp)};
    // ── UserAgent & navigator spoofing ──
    try {
        const originalUserAgent = navigator.userAgent;
        // Electron ibaresini tamamen yok et
        const cleanUA = _fp.userAgent.replace(/Electron\\/[0-9.]+\\s/g, "");
        Object.defineProperty(navigator,'userAgent',{get:()=>cleanUA,configurable:true});
        Object.defineProperty(navigator,'platform',{get:()=>_fp.platform,configurable:true});
        Object.defineProperty(navigator,'vendor',{get:()=>_fp.vendor,configurable:true});
        Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>_fp.hardwareConcurrency,configurable:true});
        Object.defineProperty(navigator,'deviceMemory',{get:()=>_fp.deviceMemory,configurable:true});
        Object.defineProperty(navigator,'maxTouchPoints',{get:()=>_fp.touchPoints,configurable:true});
        Object.defineProperty(navigator,'languages',{get:()=>_fp.languages.split(','),configurable:true});
        Object.defineProperty(navigator,'language',{get:()=>_fp.languages.split(',')[0],configurable:true});
        Object.defineProperty(navigator,'doNotTrack',{get:()=>'1',configurable:true});
        Object.defineProperty(navigator,'cookieEnabled',{get:()=>true,configurable:true});
        
        // WebAuthn API'lerini tamamen yok et (X'in 'Güvenlik Anahtarı' sormasını engeller)
        delete window.PublicKeyCredential;
        if (navigator.credentials) {
            const origGet = navigator.credentials.get;
            navigator.credentials.get = function(o) {
                if (o && o.publicKey) return Promise.reject(new DOMException("Not supported", "NotSupportedError"));
                return origGet.call(navigator.credentials, o);
            };
        }
        
        // Webdriver sızıntısını kökten kapat (Proxy instance check bypass)
        const newProto = Object.getPrototypeOf(navigator);
        delete newProto.webdriver;
        Object.defineProperty(navigator, 'webdriver', {get: () => false});
        
        // Chrome Runtime verilerini taklit et (Gerçek Chrome gibi görünmek için)
        window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };

    } catch(e){}
    // ── Screen spoofing ──
    try {
        Object.defineProperty(screen,'width',{get:()=>_fp.screenWidth,configurable:true});
        Object.defineProperty(screen,'height',{get:()=>_fp.screenHeight,configurable:true});
        Object.defineProperty(screen,'availWidth',{get:()=>_fp.screenWidth,configurable:true});
        Object.defineProperty(screen,'availHeight',{get:()=>_fp.screenHeight-40,configurable:true});
        Object.defineProperty(screen,'colorDepth',{get:()=>_fp.colorDepth,configurable:true});
        Object.defineProperty(screen,'pixelDepth',{get:()=>_fp.colorDepth,configurable:true});
        Object.defineProperty(window,'devicePixelRatio',{get:()=>_fp.pixelRatio,configurable:true});
    } catch(e){}
    // ── Canvas fingerprint noise ──
    try {
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
            const ctx = this.getContext('2d');
            if (ctx) {
                const noise = parseFloat(_fp.canvasNoise);
                const iData = ctx.getImageData(0,0,this.width,this.height);
                for(let i=0;i<iData.data.length;i+=4){
                    iData.data[i]   = Math.min(255,iData.data[i]   + Math.floor(noise*256*Math.random()));
                    iData.data[i+1] = Math.min(255,iData.data[i+1] + Math.floor(noise*256*Math.random()));
                }
                ctx.putImageData(iData,0,0);
            }
            return origToDataURL.apply(this,arguments);
        };
        const origGetIData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(x,y,w,h){
            const iData = origGetIData.call(this,x,y,w,h);
            const noise = parseFloat(_fp.canvasNoise)*128;
            for(let i=0;i<iData.data.length;i+=4){
                iData.data[i]   ^= Math.floor(Math.random()*noise);
                iData.data[i+1] ^= Math.floor(Math.random()*noise);
            }
            return iData;
        };
    } catch(e){}
    // ── WebGL / GPU Antidetect ──
    try {
        const spoofWebGL = (proto) => {
            const origGetParam = proto.getParameter;
            proto.getParameter = function(param) {
                if (param === 37445 || param === 0x9245) return _fp.webglVendor;
                if (param === 37446 || param === 0x9246) return _fp.webglRenderer;
                return origGetParam.apply(this, arguments);
            };
        };
        if (window.WebGLRenderingContext) spoofWebGL(WebGLRenderingContext.prototype);
        if (window.WebGL2RenderingContext) spoofWebGL(WebGL2RenderingContext.prototype);
    } catch(e){}
    // ── AudioContext fingerprint noise ──
    try {
        const origAnalyserGetFloat = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = function(arr){
            origAnalyserGetFloat.call(this,arr);
            const noise = parseFloat(_fp.audioNoise);
            for(let i=0;i<arr.length;i++) arr[i] += noise*(Math.random()*2-1);
        };
    } catch(e){}
    // ── Timezone spoof (best effort) ──
    try {
        const origDateTimeFormat = Intl.DateTimeFormat;
        const _tz = _fp.timezone;
        window.Intl.DateTimeFormat = function(locale, opts){
            opts = opts||{};
            if(!opts.timeZone) opts.timeZone = _tz;
            return new origDateTimeFormat(locale, opts);
        };
        window.Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;
        
        // Madde 5: Lokasyon Uyumu - navigator.permissions sızıntısını engelle
        const origQuery = navigator.permissions.query;
        navigator.permissions.query = (params) => params.name === 'notifications' ? Promise.resolve({state: Notification.permission}) : origQuery(params);
    } catch(e){}

    // ── WebAuthn İstemini X'e Fark Ettirmeden Reddet (c.png Çözümü) ──
    try {
        if (window.PublicKeyCredential) {
            // API'yi silmiyoruz (silmek bot belirtisidir), sadece isteği reddediyoruz.
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
            PublicKeyCredential.isConditionalMediationAvailable = () => Promise.resolve(false);
            if (navigator.credentials && navigator.credentials.get) {
                const originalGet = navigator.credentials.get;
                navigator.credentials.get = function(options) {
                    if (options && options.publicKey) {
                        // 'NotAllowedError' gerçek bir kullanıcının 'İptal' demesiyle aynıdır.
                        return Promise.reject(new DOMException("User cancelled the operation.", "NotAllowedError"));
                    }
                    return originalGet.call(navigator.credentials, options);
                };
            }
        }
    } catch(e) {}
    // ── Chrome/Automation flag gizle ──
    try {
        if(window.chrome){ window.chrome.app = window.chrome.app||{}; }
    } catch(e){}
    // ── İnsansı Etkileşim Simülasyonu (Anti-Bot Fare Hareketleri) ──
    try {
        const simulateHuman = () => {
            const x = Math.floor(Math.random() * (window.innerWidth || 800));
            const y = Math.floor(Math.random() * (window.innerHeight || 600));
            const ev = new MouseEvent('mousemove', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            document.dispatchEvent(ev);
        };
        setInterval(simulateHuman, Math.random() * 2000 + 1000);
    } catch(e){}
    try {
        let plugins = [];
        if(!_fp.isMobile) {
            plugins = [
                {name:'Chrome PDF Plugin',filename:'internal-pdf-viewer'},
                {name:'Chrome PDF Viewer',filename:'mhjfbmdgcfjbbpaeojofohoefgiehjai'},
                {name:'Native Client',filename:'internal-nacl-plugin'}
            ];
        } else { plugins = [{name: 'iPhone PDF Viewer', filename: 'internal-pdf-viewer'}]; }
        Object.defineProperty(navigator,'plugins',{get:()=>plugins,configurable:true});
        Object.defineProperty(navigator, 'mimeTypes', { get: () => ({ length: plugins.length }), configurable: true });
    } catch(e){}
})();`;
}

// ── Window olustur ────────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600, height: 900,
        backgroundColor: '#000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: false,
            backgroundThrottling: false,
        }
    });
    mainWindow.loadFile('index.html');
}

// ============================================================
//  FILTER ENGINE v5.0
//  Ghost Mode : Sadelestirildi — artik sadece medya/reklam engeller
//               Ghost API fonksiyonu runAction'da calisiyor
//  Data Saver : Kapsamli reklam/medya/analitik engeli
// ============================================================
const BLOCKED_DOMAINS = [
    'ads.twitter.com','ads.x.com','static.ads-twitter.com','ads-api.twitter.com',
    'advertising.twitter.com','syndication.twitter.com',
    'doubleclick.net','googlesyndication.com','adservice.google.com',
    'pagead2.googlesyndication.com','tpc.googlesyndication.com',
    'securepubads.g.doubleclick.net','moatads.com','adsafeprotected.com',
    'casalemedia.com','openx.net','pubmatic.com','rubiconproject.com',
    'appnexus.com','criteo.com','taboola.com','outbrain.com',
    'google-analytics.com','googletagmanager.com','googletagservices.com',
    'analytics.google.com','log.twitter.com','log.x.com',
    'amplitude.com','sentry.io','browser.sentry-cdn.com',
    'segment.io','segment.com','cdn.segment.com',
    'mixpanel.com','cdn.mxpnl.com','hotjar.com','bugsnag.com',
    'newrelic.com','nr-data.net','mparticle.com','kochava.com',
    'appsflyer.com','adjust.com','branch.io',
    'firebase.googleapis.com','firebaselogging-pa.googleapis.com',
    'bat.bing.com','connect.facebook.net','tr.snapchat.com','sc-static.net',
    'fonts.googleapis.com','fonts.gstatic.com',
    't.co/i/adsct','p.twitter.com','syndication.twimg.com',
];
const HEAVY_CDN = ['video.twimg.com','video.twitter.com','pbs.twimg.com','ton.twimg.com'];
const ESSENTIAL_X_CDN = ['abs.twimg.com', 'api.twitter.com', 'api.x.com'];
const HEAVY_EXT = ['.mp4','.m3u8','.ts','.webm','.mov','.avi','.flv','.m4v','.mpd','.mp3','.m4a','.aac','.opus','.ogg'];

function applyDataSaver(ses, username) {
    if (!networkStats[username]) networkStats[username] = { downloaded: 0, savedBytes: 0 };

    const fp = getFingerprintForUser(username);

    ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
        const url  = details.url.toLowerCase();
        const type = details.resourceType;
        const markSaved = () => {
            // Ortalama bir medya/script isteğinin tasarrufu ~45KB kabul edilir
            if(networkStats[username]) networkStats[username].savedBytes = (networkStats[username].savedBytes || 0) + 46080;
            return callback({ cancel: true });
        };
        
        const isXDomain = url.includes('twitter.com') || url.includes('x.com') || url.includes('twimg.com') || url.includes('t.co');

        // ── Hayalet Modu: Profesyonel Veri Tasarrufu & Oturum Koruma ──
        if (isGhostModeEnabled) {
            const isEssential = ESSENTIAL_X_CDN.some(d => url.includes(d));
            // Kritik X/Twitter API ve Auth dosyalarını ASLA engelleme (Oturum koruma)
            const isCriticalX = isXDomain && (type === 'xhr' || type === 'fetch' || url.includes('auth') || url.includes('login') || url.includes('ct0') || url.includes('.json'));
            if (isCriticalX || isEssential) return callback({ cancel: false });

            // Hayalet modda medyayı ve harici scriptleri engelle
            if (['image', 'media', 'font', 'stylesheet', 'object', 'ping'].includes(type)) return markSaved();            
            // RAM tasarrufu için hayalet modda scriptleri de büyük oranda engelle 
            if (type === 'script' && !isXDomain) return markSaved();

            return callback({ cancel: false });
        }

        // ── Normal Veri Tasarrufu ──
        if (isDataSaverEnabled) {
            const isEssential = ESSENTIAL_X_CDN.some(d => url.includes(d));
            if (isEssential) return callback({ cancel: false });
            if (['image', 'media', 'font'].includes(type))    return markSaved();
            if (HEAVY_CDN.some(p => url.includes(p)))      return markSaved();
            if (HEAVY_EXT.some(e => url.includes(e)))      return markSaved();
            if (BLOCKED_DOMAINS.some(d => url.includes(d))) return markSaved();
            if (type === 'stylesheet' && 
                !url.includes('twitter.com') && !url.includes('twimg.com') && !url.includes('x.com')) {
                return markSaved();
            }
        }

        // ── Her zaman aktif: takip pikseli ──
        if ((type === 'image' || type === 'ping') &&
            (url.includes('pixel') || url.includes('beacon') ||
             url.includes('tracking') || url.includes('doubleclick') ||
             url.includes('facebook'))) {
            return callback({ cancel: true });
        }

        callback({ cancel: false });
    });

    // ── Header Spoofing: Ağ seviyesinde parmak izi uyumluluğu ──
    ses.webRequest.onBeforeSendHeaders({ urls: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (details, callback) => {
        details.requestHeaders['User-Agent'] = fp.userAgent;
        details.requestHeaders['Accept-Language'] = fp.languages;
        details.requestHeaders['Sec-CH-UA-Mobile'] = fp.isMobile ? '?1' : '?0';
        callback({ requestHeaders: details.requestHeaders });
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
        if (details.responseHeaders && networkStats[username]) {
            const clen = details.responseHeaders['content-length'] || details.responseHeaders['Content-Length'];
            if (clen) networkStats[username].downloaded += parseInt(clen[0],10) || 0;
        }
        callback({ cancel: false });
    });
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on('toggle-ghost-mode', (e, status) => { isGhostModeEnabled = status; });
ipcMain.on('update-data-saver', (e, enabled) => { isDataSaverEnabled = enabled; });

ipcMain.on('get-monthly-stats', (e) => { e.sender.send('monthly-stats-update', monthlyStats); });
ipcMain.on('reset-monthly-stats', (e) => {
    const m = getMonthKey();
    if (monthlyStats[m]) monthlyStats[m] = { total:0, accounts:{} };
    try { fs.writeFileSync(monthlyPath, JSON.stringify(monthlyStats,null,2)); } catch (err) { console.error(err); }
    e.sender.send('monthly-stats-update', monthlyStats);
});

// ── Notlar ────────────────────────────────────────────────────────────────────
ipcMain.on('get-notes', (e) => {
    if (!fs.existsSync(notesPath)) fs.writeFileSync(notesPath, '{}');
    try { e.sender.send('notes-update', JSON.parse(fs.readFileSync(notesPath,'utf8') || '{}')); }
    catch (err) { 
        console.error(err);
        e.sender.send('notes-update', {}); }
});
ipcMain.on('save-note', (e, { username, note }) => {
    let notes = {};
    if (fs.existsSync(notesPath)) { try { notes = JSON.parse(fs.readFileSync(notesPath,'utf8') || '{}'); } catch (err) { console.error(err); } }
    notes[username] = note;
    fs.writeFileSync(notesPath, JSON.stringify(notes,null,2));
    e.sender.send('notes-update', notes);
});

// ── Günlük işlem istatistikleri ───────────────────────────────────────────────
ipcMain.on('save-daily-op', (e, { type }) => {
    const today = new Date().toISOString().slice(0,10);
    let ops = {};
    if (fs.existsSync(dailyOpsPath)) { try { ops = JSON.parse(fs.readFileSync(dailyOpsPath,'utf8') || '{}'); } catch (err) { console.error(err); } }
    if (!ops[today]) ops[today] = {};
    ops[today][type] = (ops[today][type] || 0) + 1;
    const keys = Object.keys(ops).sort();
    if (keys.length > 90) delete ops[keys[0]];
    try { fs.writeFileSync(dailyOpsPath, JSON.stringify(ops,null,2)); } catch (err) { console.error(err); }
    e.sender.send('daily-ops-update', ops);
});
ipcMain.on('get-daily-ops', (e) => {
    if (!fs.existsSync(dailyOpsPath)) { e.sender.send('daily-ops-update', {}); return; }
    try { e.sender.send('daily-ops-update', JSON.parse(fs.readFileSync(dailyOpsPath,'utf8') || '{}')); }
    catch (err) { 
        console.error(err);
        e.sender.send('daily-ops-update', {}); }
});

// ── İşlem Geçmişi (kalıcı) ───────────────────────────────────────────────────
ipcMain.on('get-history', (e) => {
    if (!fs.existsSync(historyPath)) { e.sender.send('history-update', []); return; }
    try { e.sender.send('history-update', JSON.parse(fs.readFileSync(historyPath,'utf8') || '[]')); }
    catch (err) { 
        console.error("Geçmiş okuma hatası:", err);
        e.sender.send('history-update', []); }
});
ipcMain.on('save-history-item', (e, item) => {
    let hist = [];
    if (fs.existsSync(historyPath)) { try { hist = JSON.parse(fs.readFileSync(historyPath,'utf8') || '[]'); } catch (err) { console.error(err); } }
    hist.unshift(item);
    if (hist.length > 2000) hist = hist.slice(0, 2000); // Son 2000 kayit
    try { fs.writeFileSync(historyPath, JSON.stringify(hist,null,2)); } catch (err) { console.error(err); }
    e.sender.send('history-update', hist);
});
ipcMain.on('clear-history', (e) => {
    fs.writeFileSync(historyPath, '[]');
    e.sender.send('history-update', []);
});

// ── Parmak izi IPC ────────────────────────────────────────────────────────────
ipcMain.on('get-fingerprint', (e, username) => {
    const fp = getFingerprintForUser(username);
    e.sender.send('fingerprint-ready', { username, fp });
});
ipcMain.on('reset-fingerprint', (e, username) => {
    delete fingerprintCache[username];
    try { fs.writeFileSync(fingerprintsPath, JSON.stringify(fingerprintCache,null,2)); } catch (err) { console.error(err); }
    const fp = getFingerprintForUser(username);
    e.sender.send('fingerprint-ready', { username, fp });
    e.sender.send('log-message', `🎭 @${username} parmak izi sıfırlandı.`);
});
ipcMain.on('get-fingerprint-script', (e, username) => {
    const fp = getFingerprintForUser(username);
    e.sender.send('fingerprint-script', { username, script: buildFingerprintScript(fp) });
});

// ── Proxy login ───────────────────────────────────────────────────────────────
app.on('login', (event, webContents, request, authInfo, callback) => {
    if (authInfo.isProxy) {
        event.preventDefault();
        try {
            const accounts = JSON.parse(fs.readFileSync(accountsPath,'utf8') || '[]');
            const matched  = accounts.find(acc => {
                if (!acc.proxy || !acc.proxy.includes(':')) return false;
                const p = acc.proxy.split(':');
                return p[0].trim() === authInfo.host && parseInt(p[1]) === authInfo.port;
            });
            if (matched) { const p = matched.proxy.split(':'); callback(p[2].trim(), p[3].trim()); }
            else callback(null,null);
        } catch (err) { 
            console.error("Proxy login hatası:", err);
            callback(null,null); }
    }
});

// ── TÜM OTURUMLAR İÇİN WEBAUTHN ENGELLEYİCİ ──
app.on('session-created', (ses) => {
    if (typeof ses.setWebAuthnHandler === 'function') {
        ses.setWebAuthnHandler((details, callback) => {
            callback(null); 
        });
    }
    // Ses yalıtımı (Bot tespiti için kullanılan audio sızıntılarını önler)
    ses.setPermissionCheckHandler(() => true);
});

app.whenReady().then(createWindow);

ipcMain.on('get-data', (e, type) => {
    const file = type === 'accounts' ? accountsPath : commentsPath;
    if (!fs.existsSync(file)) fs.writeFileSync(file,'[]');
    e.sender.send(`update-${type}`, JSON.parse(fs.readFileSync(file,'utf8') || '[]'));
});
ipcMain.on('save-accounts', (e, accounts) => {
    fs.writeFileSync(accountsPath, JSON.stringify(accounts,null,2));
    e.sender.send('update-accounts', accounts);
});
ipcMain.on('save-comments', (e, comments) => {
    fs.writeFileSync(commentsPath, JSON.stringify(comments,null,2));
    e.sender.send('update-comments', comments);
});

ipcMain.on('setup-session', async (e, { username, proxy, partition, authToken }) => {
    const ses = session.fromPartition(partition);

    // Otomatik Giriş için Cookie Enjeksiyonu (Garanti Yöntem)
    if (authToken) {
        const cookie = {
            url: 'https://x.com',
            name: 'auth_token',
            value: authToken,
            domain: '.x.com',
            path: '/',
            secure: true,
            httpOnly: true,
            expirationDate: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
        };
        await ses.cookies.set(cookie);
        
        // CSRF (ct0) için boş bir değer set et ki script hata vermesin, X kendi günceller
        await ses.cookies.set({
            url: 'https://x.com',
            name: 'ct0',
            value: 'dummy_csrf_token',
            domain: '.x.com',
            path: '/',
            secure: true
        });
    }

    // Oturum bilgilerini (token) canlı olarak izle ve kaydet
    ses.cookies.on('changed', (event, cookie, cause, removed) => {
        if (!removed && cookie.name === 'auth_token' && cookie.domain.includes('x.com')) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('auth-token-captured', { 
                    username, 
                    authToken: cookie.value 
                });
                // Token'ı dosyaya da kalıcı işle
                try {
                    let accs = JSON.parse(fs.readFileSync(accountsPath, 'utf8') || '[]');
                    let idx = accs.findIndex(a => a.username === username);
                    if (idx !== -1 && accs[idx].authToken !== cookie.value) {
                        accs[idx].authToken = cookie.value;
                        fs.writeFileSync(accountsPath, JSON.stringify(accs, null, 2));
                    }
                } catch (e) { console.error("Token otomatik kayıt hatası:", e); }
            }
        }
    });

    applyDataSaver(ses, username);

    const fp = getFingerprintForUser(username);
    if (fp.timezone) ses.setTimezone(fp.timezone);

    // ── Güvenlik: User Agent içindeki Electron ibaresini temizle ──
    let cleanUA = fp.userAgent;
    if (cleanUA.includes("Electron/")) {
        cleanUA = cleanUA.replace(/Electron\/[0-9.]+\s/g, "").replace(/ {2,}/g, " ");
    }
    await ses.setUserAgent(cleanUA);

    if (proxy && proxy.includes(':') && !proxy.includes('Proxy Yok')) {
        const p = proxy.split(':');
        await ses.setProxy({
            proxyRules: `http=${p[0].trim()}:${p[1].trim()};https=${p[0].trim()}:${p[1].trim()}`,
            proxyBypassRules: '<local>',
        });
    } else {
        await ses.setProxy({ proxyRules: 'direct://' });
    }
});

setInterval(() => {
    flushToMonthly();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('network-usage-update', networkStats);
        mainWindow.webContents.send('monthly-stats-update', monthlyStats);
    }
}, 2000);

// ── Proxy testleri ────────────────────────────────────────────────────────────
ipcMain.on('check-proxy', async (e, { username, proxy }) => {
    if (!proxy || !proxy.includes(':')) {
        e.sender.send('proxy-status', { username, status:'Proxy Yok', ip:'---', country:'---', city:'---', latency:null });
        return;
    }
    const p = proxy.split(':');
    try {
        const proxyUrl = `http://${p[2].trim()}:${p[3].trim()}@${p[0].trim()}:${p[1].trim()}`;
        const agent    = new HttpsProxyAgent(proxyUrl);
        const t0       = Date.now();
        const res      = await axios.get('https://ipwhois.app/json/', { httpsAgent:agent, timeout:10000 });
        const latency  = Date.now() - t0;

        // Madde 5: Proxy IP'sine göre Timezone güncelleme
        if (res.data && res.data.success && res.data.timezone) {
            const fp = getFingerprintForUser(username);
            if (fp.timezone !== res.data.timezone) {
                fp.timezone = res.data.timezone;
                fingerprintCache[username] = fp;
                try { fs.writeFileSync(fingerprintsPath, JSON.stringify(fingerprintCache, null, 2)); } catch (err) { console.error(err); }
            }
        }

        e.sender.send('proxy-status', { username, status:'Aktif', ip:res.data.ip||'---', country:res.data.country||'---', city:res.data.city||'---', latency });
    } catch {
        console.error(`Proxy test failed for @${username}`);
        e.sender.send('proxy-status', { username, status:'Hatalı', ip:'---', country:'---', city:'---', latency:null });
    }
});

ipcMain.on('test-bulk-proxies', async (e, proxyList) => {
    const testOne = async (proxy) => {
        if (!proxy || proxy.split(':').length < 4) return { proxy, status:'Geçersiz', ip:'---', country:'---', city:'---', latency:null };
        const p = proxy.split(':');
        try {
            const proxyUrl = `http://${p[2].trim()}:${p[3].trim()}@${p[0].trim()}:${p[1].trim()}`;
            const agent    = new HttpsProxyAgent(proxyUrl);
            const t0       = Date.now();
            const res      = await axios.get('https://ipwhois.app/json/', { httpsAgent:agent, timeout:8000 });
            return { proxy, status:'Aktif', ip:res.data.ip||'---', country:res.data.country||'---', city:res.data.city||'---', latency:Date.now()-t0 };
        } catch { return { proxy, status:'Hatalı', ip:'---', country:'---', city:'---', latency:null }; }
    };
    const results = [];
    for (let i = 0; i < proxyList.length; i += 10) {
        const partial = await Promise.all(proxyList.slice(i,i+10).map(testOne));
        results.push(...partial);
        if (!e.sender.isDestroyed()) e.sender.send('bulk-proxy-progress', { done:results.length, total:proxyList.length, results:[...results] });
    }
    if (!e.sender.isDestroyed()) e.sender.send('bulk-proxy-results', results);
});

ipcMain.on('ping-proxy-fast', async (e, { username, proxy }) => {
    if (!proxy || !proxy.includes(':') || proxy.includes('Proxy Yok')) {
        e.sender.send('ping-result', { username, latency:null, status:'noProxy' }); return;
    }
    const p = proxy.split(':');
    if (p.length < 4) { e.sender.send('ping-result', { username, latency:null, status:'invalid' }); return; }
    try {
        const proxyUrl = `http://${p[2].trim()}:${p[3].trim()}@${p[0].trim()}:${p[1].trim()}`;
        const agent    = new HttpsProxyAgent(proxyUrl);
        const t0       = Date.now();
        await axios.get('https://api.ipify.org?format=json', { httpsAgent:agent, timeout:8000 });
        e.sender.send('ping-result', { username, latency:Date.now()-t0, status:'ok' });
    } catch { e.sender.send('ping-result', { username, latency:null, status:'error' }); }
});

ipcMain.on('get-proxy-ip', async (e, { username, proxy }) => {
    if (!proxy || !proxy.includes(':') || proxy.includes('Proxy Yok')) {
        e.sender.send('proxy-ip-result', { username, ip:'Proxy Yok', ok:false }); return;
    }
    const p = proxy.split(':');
    if (p.length < 4) { e.sender.send('proxy-ip-result', { username, ip:'Geçersiz Format', ok:false }); return; }
    try {
        const proxyUrl = `http://${p[2].trim()}:${p[3].trim()}@${p[0].trim()}:${p[1].trim()}`;
        const agent    = new HttpsProxyAgent(proxyUrl);
        const res = await axios.get('https://api.ipify.org?format=json', { httpsAgent:agent, timeout:8000 });
        e.sender.send('proxy-ip-result', { username, ip:res.data.ip, ok:true });
    } catch {
        try {
            const p2 = proxy.split(':');
            const pu2 = `http://${p2[2].trim()}:${p2[3].trim()}@${p2[0].trim()}:${p2[1].trim()}`;
            const a2  = new HttpsProxyAgent(pu2);
            const r2  = await axios.get('https://ipwho.is/', { httpsAgent:a2, timeout:8000 });
            e.sender.send('proxy-ip-result', { username, ip:r2.data.ip||'HATA', ok:!!r2.data.ip });
        } catch { e.sender.send('proxy-ip-result', { username, ip:'HATA', ok:false }); }
    }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });